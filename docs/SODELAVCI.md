# Sodelavci z omejenim dostopom (Pro)

**Ideja Tine, 2026-07-22.** Razlikovalna vrednost paketa Pro.

## Zakaj to in ne "več sedežev"

Več sedežev je **cena**. Omejen dostop je **zaupanje**.

Studio, ki dela z zunanjim ilustratorjem, mu ne sme pokazati marž pri drugih
strankah, cenikov ali dobička. Prav ta strah danes prepreči, da bi orodje sploh
odprli sodelavcu. Kdor to reši, ne prodaja dodatnega sedeža — prodaja moznost,
da se orodje v ekipi sploh uporabi.

## Kako naj deluje

Dve ravni dostopa:

| Raven | Vidi |
|---|---|
| **Polni dostop** | vse kot lastnica (partner, računovodja) |
| **Dostop do projekta** | samo izbrane ponudbe/projekte in njihove dokumente |

Sodelavec z dostopom do projekta NE vidi: drugih strank, cenikov, stroškov
podjetja, ciljev, analitike in dnevnika ur.

## Kar je tehnično zahtevno (in se ne sme podceniti)

Danes je dostop vezan na **podjetje**: `organization_members` + RLS politike
oblike `is_organization_member(organization_id)`. Vsak član vidi vse.

Za dostop po projektu je treba:

1. novo tabelo, npr. `project_members (offer_id, user_id, vloga)`
2. **prepisati RLS politike** za offers, contracts, invoices, expenses, clients
   tako, da poleg članstva v podjetju preverijo še dostop do projekta
3. vlogo zapisati tudi v `organization_members` (`member` ni dovolj — rabimo
   ločnico med polnim in projektnim dostopom)

Tveganje je v drugi tocki: RLS je zadnja obramba. Napaka tam pomeni, da
sodelavec vidi tuje marže — natanko tisto, kar ta funkcija obljublja preprečiti.
Zato: politike pisati posebej, testirati z drugim racunom, in sele nato objaviti.

## Vrstni red

Šele po plačilnem sistemu. Brez plačil ni Pro uporabnikov, brez njih pa ta
funkcija nima komu koristiti.
