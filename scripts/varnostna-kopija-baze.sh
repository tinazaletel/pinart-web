#!/usr/bin/env bash
# Varnostna kopija baze Pinart Flow (Supabase, eu-north-1).
#
# Zakaj obstaja: Supabase Free nima samodejnih kopij. GDPR 32(1)(c) zahteva
# zmoznost pravocasne povrnitve podatkov. Ta skripta je rocna mreza, dokler
# ni Supabase Pro z dnevnimi kopijami.
#
# Uporaba:
#   1. Enkratna priprava (glej docs/VARNOSTNE-KOPIJE.md)
#   2. ./scripts/varnostna-kopija-baze.sh
#
# Povezovalni niz se NE podaja kot argument (viden bi bil v `ps` in v
# zgodovini ukazov). Bere se iz spremenljivke PINART_DB_URL ali iz datoteke
# ~/.pinart-db-url s pravicami 600. Geslo se nikoli ne izpise.

set -euo pipefail

MAPA_KOPIJ="${PINART_MAPA_KOPIJ:-$HOME/Desktop/Pinart website/varnostne-kopije}"
OBDRZI=14                 # koliko zadnjih kopij ostane
NAJMANJSA_VELIKOST=51200  # 50 kB; manj pomeni, da je dump okrnjen

napaka() { echo "NAPAKA: $*" >&2; exit 1; }

# Geslo pobrisemo iz vsakega izpisa, tudi iz sporocil o napaki.
zamaskiraj() { sed -E 's#(postgres(ql)?://[^:]+):[^@]*@#\1:***@#g'; }

# --- 1. Preveri orodja ---------------------------------------------------
if ! command -v pg_dump >/dev/null 2>&1; then
  napaka "pg_dump ni namescen. Namesti ga z:
    brew install libpq
    echo 'export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"' >> ~/.zshrc
  in odpri novo okno terminala."
fi

# --- 2. Preberi povezovalni niz ------------------------------------------
DB_URL="${PINART_DB_URL:-}"
if [ -z "$DB_URL" ] && [ -f "$HOME/.pinart-db-url" ]; then
  PRAVICE=$(stat -f '%OLp' "$HOME/.pinart-db-url")
  [ "$PRAVICE" = "600" ] || napaka "~/.pinart-db-url ima pravice $PRAVICE, morajo biti 600. Popravi: chmod 600 ~/.pinart-db-url"
  DB_URL=$(tr -d '[:space:]' < "$HOME/.pinart-db-url")
fi
[ -n "$DB_URL" ] || napaka "Ni povezovalnega niza. Glej docs/VARNOSTNE-KOPIJE.md, korak 2."

case "$DB_URL" in
  *:6543*) napaka "To je transaction pooler (vrata 6543). pg_dump tam ne dela.
    Vzemi Session pooler (vrata 5432) ali direktno povezavo." ;;
  postgres://*|postgresql://*) ;;
  *) napaka "Povezovalni niz se ne zacne s postgresql:// — preveri, kaj si prilepila." ;;
esac

# --- 3. Naredi kopijo -----------------------------------------------------
mkdir -p "$MAPA_KOPIJ"
chmod 700 "$MAPA_KOPIJ"

ZIG=$(date +%Y-%m-%d_%H%M%S)
DAT="$MAPA_KOPIJ/pinart-flow_$ZIG.dump"
DNEVNIK="$MAPA_KOPIJ/dnevnik.txt"

echo "Delam kopijo ... (traja nekaj minut, ne zapiraj okna)"

# Sheme: public = podatki aplikacije, auth = uporabniski racuni in prijave,
# storage = zapisi o datotekah. Brez auth bi ob obnovi izgubila vse uporabnike.
# --no-owner in --no-privileges, ker Supabase ne dovoli prevzema lastnistva.
if ! pg_dump "$DB_URL" \
      --format=custom --compress=9 --no-sync \
      --schema=public --schema=auth --schema=storage \
      --no-owner --no-privileges \
      --file="$DAT" 2> >(zamaskiraj >&2); then
  rm -f "$DAT"
  echo "$ZIG  NEUSPELO  pg_dump se je koncal z napako" >> "$DNEVNIK"
  napaka "pg_dump ni uspel. Kopija NI nastala. Sporocilo je zgoraj."
fi

chmod 600 "$DAT"

# --- 4. Preveri, da kopija ni prazna in da je berljiva --------------------
VELIKOST=$(stat -f '%z' "$DAT")
if [ "$VELIKOST" -lt "$NAJMANJSA_VELIKOST" ]; then
  mv "$DAT" "$DAT.SUMLJIVO"
  echo "$ZIG  NEUSPELO  kopija samo $VELIKOST bajtov" >> "$DNEVNIK"
  napaka "Kopija je samo $VELIKOST bajtov — to je premalo. Shranjena kot $DAT.SUMLJIVO, ne zanasaj se nanjo."
fi

# Kopija, ki je nihce ni odprl, ni kopija. pg_restore --list prebere kazalo.
if ! ST_OBJEKTOV=$(pg_restore --list "$DAT" 2>/dev/null | grep -c '^[0-9]'); then
  echo "$ZIG  NEUSPELO  pg_restore ne more prebrati datoteke" >> "$DNEVNIK"
  napaka "Datoteka je nastala, a v njej ni berljivega kazala. Pokvarjena ali prazna je."
fi
[ "$ST_OBJEKTOV" -gt 20 ] || napaka "V kopiji je samo $ST_OBJEKTOV objektov — premalo za to bazo."

BERLJIVA=$(du -h "$DAT" | cut -f1)
echo "$ZIG  OK  $BERLJIVA  $ST_OBJEKTOV objektov" >> "$DNEVNIK"

# --- 5. Zavrzi najstarejse, obdrzi zadnjih $OBDRZI -----------------------
STEVILO=$(ls -1 "$MAPA_KOPIJ"/pinart-flow_*.dump 2>/dev/null | wc -l | tr -d ' ')
if [ "$STEVILO" -gt "$OBDRZI" ]; then
  ls -1t "$MAPA_KOPIJ"/pinart-flow_*.dump | tail -n +$((OBDRZI + 1)) | while read -r stara; do
    echo "Brisem staro kopijo: $(basename "$stara")"
    rm -f "$stara"
  done
fi

echo
echo "Koncano."
echo "  Datoteka: $DAT"
echo "  Velikost: $BERLJIVA, $ST_OBJEKTOV objektov"
echo "  Dnevnik:  $DNEVNIK"
