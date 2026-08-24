# Pas »Priložnosti« — pravila

Vir: ChatGPT, 24. 8. 2026, po nalogi v `docs/CHATGPT-NALOGA-priloznosti.md`.
Še ni implementirano. Pas odgovarja na **»kje je še denar«**, ne na »kaj moram
danes« — nujno sodi v `lib/danes.ts`, ne sem.

| # | Pravilo | Pogoj | Besedilo vrstice |
|---|---|---|---|
| 1 | Podaljšanje licence | Potekla v zadnjih 90 dneh ali poteče v 60 dneh; za isto stranko in ponudbo ni nove odprte ponudbe | Predlagaj podaljšanje licence za {naslov} pri {stranka}. |
| 2 | Nadaljevanje končanega projekta | Projekt zaključen ali rok potekel v zadnjih 30 dneh; stranka nima aktivnega projekta ali odprte ponudbe | Predlagaj naslednji korak po projektu {projekt} pri {stranka}. |
| 3 | Redna stranka je utihnila | ≥3 sprejete ponudbe ali plačani računi v 18 mesecih; v zadnjih 120 dneh nič | Obnovi stik z {stranka}, s katero si prej redno sodelovala. |
| 4 | Ponavljajoče se naročilo | ≥3 podobno poimenovani projekti; razpoznaven razmik, naslednje obdobje v 30 dneh | Odpri pogovor o naslednjem projektu {vrsta dela} pri {stranka}. |
| 5 | Čas za dolgoročno sodelovanje | ≥3 plačani računi ali zaključeni projekti v 6 mesecih, brez dolgoročnega dogovora | Predlagaj redno sodelovanje stranki {stranka}. |
| 6 | Obletnica sodelovanja | Projekt ali plačan račun pred 10–14 meseci; v zadnjih 120 dneh nič novega | Preveri, ali {stranka} letos znova potrebuje {projekt}. |
| 7 | Dober trenutek po plačilu | Pomembnejši račun plačan v zadnjih 14 dneh, projekt zaključen, ni novega dela | Predlagaj nadaljevanje sodelovanja stranki {stranka}. |
| 8 | Vrnitev nekdanje dobre stranke | Zgornjih 25 % po prometu; zadnje sodelovanje pred 6–18 meseci; nič odprtega | Ponovno odpri pogovor s {stranka}. |
| 9 | Pogovor po zavrnjeni ponudbi | Zavrnjena pred 45–120 dnevi; prej vsaj en plačan račun; po zavrnitvi ni nove ponudbe | Preveri nov trenutek za sodelovanje s {stranka}. |

## Razvrščanje

Po moči signala: konkreten datum ali ponovljiv vzorec → moč preteklega odnosa →
svežina trenutka → pretekli obseg. Pri enaki moči: bližji datum, nato več
zaključenih sodelovanj, nato novejše sodelovanje.

Največ **pet vrstic**. Za isto stranko praviloma samo najmočnejša priložnost.
Priložnost se skrije, če ima stranka že aktiven projekt ali odprto poslano
ponudbo, ki pokriva isto potrebo.

## Kaj sem NE sodi

Neplačani računi, ponudbe, ki čakajo na odgovor, stari osnutki, zamujeni roki in
naloge — vse to so **obveznosti** in sodijo v »Kaj čaka nate«. Prav tako ne:
visoki stroški (tveganje, ne priložnost), velik promet ene stranke (lahko pomeni
nevarno odvisnost), zavrnjena ponudba brez preteklega sodelovanja (premalo
podatkov), splošni predlogi tipa »pridobi novo stranko« (ni izračunano iz
podatkov), in **predvideni znesek zaslužka** — podatki ne dokazujejo, da bo
priložnost sprejeta, zato Flow ne sme obljubljati prihodka.

## Prazno stanje

> Trenutno ni prepoznanih priložnosti.
> Ko se v sodelovanjih pokaže primeren trenutek za podaljšanje, nadaljevanje ali
> ponovni stik, ga boš videla tukaj.
