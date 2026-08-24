# Codex — pogodbe: posledica pred klikom, poštena sporočila

**Izhodišče:** osnova je dobra (povezava s ponudbo, šest vrst, predogled, zaklep
po podpisu). Težava ni videz, ampak da Flow **tiho sprejema pomembne odločitve
namesto uporabnice**.

## 1. Dodatni členi morajo povedati posledico

Danes so gumbi z golim imenom. »Konkurenčna prepoved« ne pove, da omeji **prav
uporabnico**, ne stranko. Vsak člen dobi eno poved o posledici:

| Člen | Kaj mora pisati zraven |
|---|---|
| Konkurenčna prepoved | Izvajalcu za 12 mesecev omeji delo za konkurente naročnika. |
| Pogodbena kazen | Ob zamudi se obračuna 0,5 % na dan, največ 10 % vrednosti. |
| Podobdelovalci | Ureja vključevanje zunanjih izvajalcev pri obdelavi podatkov. |
| NDA | Zaupnost velja še tri leta po prenehanju sodelovanja. |
| Pristojnost sodišča | Spore rešuje sodišče v kraju izvajalca. |

**Noben člen ne sme biti vključen tiho.** Če je kateri danes privzeto vklopljen,
ga izklopi in zahtevaj zavestno izbiro. Besedilo posledice mora biti v isti
velikosti kot ime člena, ne v drobnem tisku.

## 2. Pregled pred pripravo osnutka

Preden Flow ustvari pogodbo, pokaži kratek pregled odločitev: stranki, obseg,
cena in plačilni pogoji, rok, avtorske pravice ali licenca, odpoved, izbrani
dodatni členi. **Manjkajoče postavke jasno označi** — uporabnica mora videti, da
ni cene ali roka, preden pogodba nastane, ne po tem.

## 3. Kontrolni seznam pred pošiljanjem

Namesto splošnega stavka, da Flow ne nadomešča odvetnika:

> **Pred pošiljanjem preveri:** podatke obeh strank · obseg in ceno · roke in
> način plačila · avtorske pravice ali licenco · pogoje odpovedi

Splošno opozorilo naj ostane, a prepisano:
> To je prilagodljiv pogodbeni osnutek, ne pravni nasvet.

## 4. Tri poti enakovredno

Na začetku so tri poti, tretja je danes skrita kot povezava na dnu:
**Ustvari iz ponudbe · Ustvari brez ponudbe · Naloži pogodbo stranke**.
Postavi jih enakovredno.

## 5. Sporočila, ki lažejo

- »Pogodba je shranjena in povezana s projektom.« se izpiše **tudi, ko projekta
  ni**. Besedilo mora biti odvisno od stanja: brez projekta piši »Pogodba je
  shranjena v arhiv.«
- Če nalaganje prejete pogodbe v oblak **ne uspe**, se danes tiho shrani samo
  lokalno. Takrat mora pisati: »Pogodba je shranjena samo v tem brskalniku.
  Nalaganje v oblak ni uspelo.« Isti razred napake smo danes že lovili pri
  priponkah — tiho polovično shranjevanje je najhujša vrsta.

## 6. Obvestila skozi Toast

Obvestila so zdaj lasten pas na vrhu, zaradi česar stran po shranjevanju
odskoči na vrh. Uporabi `components/Toast.tsx` — **glej DESIGN.md, točka 13**.

## 7. Vzorčni podatki

»Odvetniška družba Volk & Babica« izgleda kot ostanek testiranja. Zamenjaj z
nevtralnim `npr. Studio Sever d.o.o.`.

## Besedila

Popravi samo tam, kjer gre za **jasnost**, ne za ton. Ta so potrjena:

| Zdaj | Novo |
|---|---|
| Prikazane zadnje — išči za vse. | Prikazanih je zadnjih 7 ponudb. Za starejše uporabi iskanje. |
| Vključi člene: | Dodatni pogoji |
| Pripravi pogodbo | Ustvari osnutek pogodbe |
| Zaključi | Preglej in pošlji |
| Brez ponudbe | Ustvari brez ponudbe |
| Soglasje s podpisno povezavo | Elektronska potrditev soglasja |

**Naslovov ne spreminjaj.** »Dogovor, brez ugibanja.« in »Iz česa nastane
pogodba?« ostaneta — to je Tinin glas in ni predmet te naloge.

## Trde omejitve

- **NE spreminjaj:** `components/BusinessOverview.tsx`, `components/PupaDom.tsx`,
  `components/KalkulatorApp.tsx`, `components/TaskManagerWorkspace.tsx`,
  `lib/danes.ts`, `lib/priponke.ts`, `components/Priponke.tsx`,
  `lib/oblakStanje.ts`, `DESIGN.md`.
- **Pravnih besedil samih predlog NE spreminjaj.** Čakajo na odvetnika; ta
  naloga je o vmesniku in o tem, kaj uporabnica vidi pred klikom.
- Ne poganjaj `next build`. Ne commitaj, ne pushaj.
- Na koncu `npx tsc --noEmit` in `npx vitest run`, poročaj točne izide.
