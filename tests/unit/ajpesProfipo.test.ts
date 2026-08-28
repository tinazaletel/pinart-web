import { describe, expect, it } from 'vitest';
import {
  zahtevaGetData, zahtevaGetCompanyList, razcleniGetData, razcleniSeznam, zeImamo,
  PROFIPO_TEST, PROFIPO_PRODUKCIJA,
} from '@/lib/ajpesProfipo';

/* Vzorci so PREPISANI iz AJPES-ovega navodila (wsProFipo v0.6). Klic v omrežje
   stane točko, razčlenjevanje pa se mora dati preveriti brez nje — zato tu
   preverjamo prav to, kar dela na pravem odgovoru. */

const ODGOVOR_PODATKI = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetDataResponse xmlns="http://www.ajpes.si/wsProFipo/ProFipo/">
      <GetDataResult xmlns="http://www.ajpes.si/xml_sheme/profipo/profipo_info-20140831">
        <Ident dtDatumPriprave="2015-04-08T11:17:52.403" />
        <PS maticna="1234567000">
          <LP leto="2013" vrsta="gd" skd="62.010" datZpl="2013-01-01" datKpl="2013-12-31">
            <Naziv>TEST D. O. O.</Naziv>
            <Regija>OSREDNJESLOVENSKA</Regija>
            <Obcina>Ljubljana</Obcina>
            <Velikost>Majhne enote</Velikost>
            <LpPod lId="L00001" lPod="54321" lAop="T001"><LOpis>SREDSTVA</LOpis></LpPod>
            <LpPod lId="L00056" lPod="654321" lAop="T056"><LOpis>KAPITAL</LOpis></LpPod>
            <LpPod lId="L00097" lPod="8888" lAop="T110"><LOpis>ČISTI PRIHODKI OD PRODAJE</LOpis></LpPod>
            <Kaz kId="K0002" kPod="4444" kAop="V1_3"><KOpis>Dolgoročne in kratkoročne obveznosti</KOpis></Kaz>
          </LP>
          <PRS davcna="88888888" idDDV="SI" gd="62.010" dVpis="1991-04-08" zb="false">
            <Popolnoime>TEST d.o.o.</Popolnoime>
            <Kratkoime>T d.o.o.</Kratkoime>
            <Oblika>Družba z omejeno odgovornostjo d.o.o.</Oblika>
            <Naslov po="1000" hs="2"><Ulica>Tržaška ulica</Ulica><Kraj>Ljubljana</Kraj><Obcina>Ljubljana</Obcina></Naslov>
            <Druzbenik><Ime>Ime_1</Ime><Priimek>Priimek_1</Priimek></Druzbenik>
            <Zastopnik><Ime>Ime_z</Ime><Priimek>Priimek_z</Priimek><VrstaZastopnika>direktor</VrstaZastopnika></Zastopnik>
          </PRS>
          <RTR rn="101000055555511" dOdprt="2004-11-29" dZaprt="2014-12-31"><PPS>BANKA KOPER d.d.</PPS></RTR>
          <RTR rn="191000011111199" dOdprt="2015-01-03"><PPS>DBS d.d.</PPS></RTR>
          <ObjavaIns dObjava="2024-03-11" dDejanje="2024-03-08">
            <TipPostopka>Stečajni postopek</TipPostopka>
            <TipProcesnegaDejanja>Sklep o začetku postopka</TipProcesnegaDejanja>
          </ObjavaIns>
          <ObjavaZgd dObjava="2023-06-02"><VrstaObjave>Sprememba zastopnika</VrstaObjave></ObjavaZgd>
          <RPM pm="Protest menice" dVpis="2024-01-15" />
        </PS>
      </GetDataResult>
    </GetDataResponse>
  </soap:Body>
</soap:Envelope>`;

const ODGOVOR_NAPAKA = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetDataResponse xmlns="http://www.ajpes.si/wsProFipo/ProFipo/">
      <GetDataResult xmlns="http://www.ajpes.si/xml_sheme/profipo/profipo_info-20140831">
        <Ident dtDatumPriprave="2015-04-08T12:32:36" idNapake="12">
          <OpisNapake>Stanje želene storitve je 0 enot</OpisNapake>
        </Ident>
      </GetDataResult>
    </GetDataResponse>
  </soap:Body>
</soap:Envelope>`;

const ODGOVOR_SEZNAM = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCompanyListResponse xmlns="http://www.ajpes.si/wsProFipo/ProFipo/">
      <GetCompanyListResult xmlns="http://www.ajpes.si/xml_sheme/profipo/profipo_seznam20140831">
        <Ident datumPriprave="2015-04-08T12:27:15" />
        <Spr maticna="1234567000" nabor="SS" vrsta_LP="LP" leto="2013" />
        <Spr maticna="1234567000" nabor="OS" vrsta_LP="LP" leto="2013" />
        <Spr maticna="7777777000" nabor="OS" vrsta_LP="LP" leto="2013" />
      </GetCompanyListResult>
    </GetCompanyListResponse>
  </soap:Body>
</soap:Envelope>`;

describe('proFi=Po: zahtevki', () => {
  it('GetData nosi vse parametre in poverilnici', () => {
    const x = zahtevaGetData({ uporabnik: 'pinartflow', geslo: 'skrivnost', maticna: '1234567000', nabor: 'OS', leto: 2024, vrstaLp: 'LP' });
    expect(x).toContain('<GetData xmlns="http://www.ajpes.si/wsProFipo/ProFipo/">');
    expect(x).toContain('<maticna>1234567000</maticna>');
    expect(x).toContain('<nabor>OS</nabor>');
    expect(x).toContain('<leto>2024</leto>');
    expect(x).toContain('<vrstaLp>LP</vrstaLp>');
  });

  it('posebne znake v geslu ubezi, da XML ne razpade', () => {
    const x = zahtevaGetCompanyList({ uporabnik: 'a&b', geslo: 'x<y>z' });
    expect(x).toContain('<uporabnik>a&amp;b</uporabnik>');
    expect(x).toContain('<geslo>x&lt;y&gt;z</geslo>');
  });

  it('naslova testa in produkcije nista zamenjana', () => {
    expect(PROFIPO_TEST).toContain('wwwt.ajpes.si');
    expect(PROFIPO_PRODUKCIJA).toContain('www.ajpes.si');
  });
});

describe('proFi=Po: razčlenjevanje podatkov', () => {
  const { napaka, podjetje } = razcleniGetData(ODGOVOR_PODATKI);

  it('napake ni, subjekt je prebran', () => {
    expect(napaka).toBeUndefined();
    expect(podjetje?.maticna).toBe('1234567000');
    expect(podjetje?.naziv).toBe('TEST d.o.o.');
    expect(podjetje?.davcna).toBe('88888888');
    expect(podjetje?.oblika).toContain('omejeno odgovornostjo');
  });

  it('transakcijski računi z datumi; zaprti se loči od odprtega', () => {
    expect(podjetje?.racuni).toHaveLength(2);
    expect(podjetje?.racuni[0].zaprt).toBe('2014-12-31');
    expect(podjetje?.racuni[0].banka).toBe('BANKA KOPER d.d.');
    expect(podjetje?.racuni[1].zaprt).toBeUndefined();
    expect(podjetje?.imaOdprtRacun).toBe(true);
  });

  it('postavke letnega poročila in kazalniki', () => {
    expect(podjetje?.leto).toBe('2013');
    expect(podjetje?.postavke).toHaveLength(3);
    expect(podjetje?.postavke[0]).toMatchObject({ aop: 'T001', opis: 'SREDSTVA', vrednost: '54321' });
    expect(podjetje?.kazalniki[0].opis).toContain('obveznosti');
  });

  it('zastopnik in družbenik', () => {
    expect(podjetje?.zastopniki[0]).toMatchObject({ ime: 'Ime_z Priimek_z', vrsta: 'direktor' });
    expect(podjetje?.druzbeniki[0].ime).toBe('Ime_1 Priimek_1');
  });

  it('prazne točke javi kot napako, ne kot prazno podjetje', () => {
    const r = razcleniGetData(ODGOVOR_NAPAKA);
    expect(r.podjetje).toBeUndefined();
    expect(r.napaka?.id).toBe('12');
    expect(r.napaka?.opis).toContain('0 enot');
  });

  it('neveljaven XML ne vrže izjeme', () => {
    const r = razcleniGetData('to ni xml');
    expect(r.napaka).toBeDefined();
  });
});

describe('proFi=Po: seznam že plačanega', () => {
  const { vnosi, napaka } = razcleniSeznam(ODGOVOR_SEZNAM, 'GetCompanyList');

  it('prebere vse vnose', () => {
    expect(napaka).toBeUndefined();
    expect(vnosi).toHaveLength(3);
    expect(vnosi[0]).toMatchObject({ maticna: '1234567000', nabor: 'SS', vrstaLp: 'LP', leto: '2013' });
  });

  it('ve, kaj je ze placano — da tocke ne zapravimo dvakrat', () => {
    expect(zeImamo(vnosi, { maticna: '1234567000', nabor: 'OS', vrstaLp: 'LP', leto: '2013' })).toBe(true);
    /* druga shema = svoja enota */
    expect(zeImamo(vnosi, { maticna: '7777777000', nabor: 'SS', vrstaLp: 'LP', leto: '2013' })).toBe(false);
    /* drugo leto = svoja enota */
    expect(zeImamo(vnosi, { maticna: '1234567000', nabor: 'OS', vrstaLp: 'LP', leto: '2024' })).toBe(false);
  });
});

describe('proFi=Po: tveganje in objave (shema v0.15)', () => {
  const { podjetje } = razcleniGetData(ODGOVOR_PODATKI);

  it('prebere insolvencne objave — to je znak, ki mora prizgati opozorilo', () => {
    expect(podjetje?.imaInsolvencneObjave).toBe(true);
    expect(podjetje?.insolvencni[0]).toMatchObject({
      objavljeno: '2024-03-11',
      postopek: 'Stečajni postopek',
      procesnoDejanje: 'Sklep o začetku postopka',
    });
  });

  it('prebere objave po ZGD', () => {
    expect(podjetje?.zgdObjave[0]).toMatchObject({ objavljeno: '2023-06-02', vrsta: 'Sprememba zastopnika' });
  });

  it('brez objav ne trdi, da jih ima', () => {
    const brez = razcleniGetData(ODGOVOR_PODATKI.replace(/<ObjavaIns[\s\S]*?<\/ObjavaIns>/, ''));
    expect(brez.podjetje?.imaInsolvencneObjave).toBe(false);
    expect(brez.podjetje?.insolvencni).toHaveLength(0);
  });

  it('racune prebere tudi iz zapisa TRR, ne le RTR', () => {
    const zTrr = ODGOVOR_PODATKI.replace(
      '<RTR rn="191000011111199" dOdprt="2015-01-03"><PPS>DBS d.d.</PPS></RTR>',
      '<TRR TrrRn="191000011111199" TrrOdprt="2015-01-03"><TrrPps>DBS d.d.</TrrPps></TRR>',
    );
    const r = razcleniGetData(zTrr);
    expect(r.podjetje?.racuni).toHaveLength(2);
    expect(r.podjetje?.imaOdprtRacun).toBe(true);
  });
});

describe('proFi=Po: znaki tveganja (struktura december 2024)', () => {
  it('blokada racuna se prebere iz atributa eno', () => {
    const zBlokado = ODGOVOR_PODATKI.replace(
      '<RTR rn="191000011111199" dOdprt="2015-01-03">',
      '<RTR rn="191000011111199" dOdprt="2015-01-03" eno="true">',
    );
    const r = razcleniGetData(zBlokado);
    expect(r.podjetje?.imaBlokado).toBe(true);
    expect(r.podjetje?.racuni.find(x => x.stevilka === '191000011111199')?.neporavnane).toBe(true);
  });

  it('brez atributa eno ne trdimo, da je blokada', () => {
    const r = razcleniGetData(ODGOVOR_PODATKI);
    expect(r.podjetje?.imaBlokado).toBe(false);
  });

  it('neporavnane v zadnjih 12 mesecih iz PRS/eno12m', () => {
    const r = razcleniGetData(ODGOVOR_PODATKI.replace('zb="false"', 'zb="false" eno12m="true"'));
    expect(r.podjetje?.neporavnaneZadnjih12m).toBe(true);
  });

  it('protest menice (RPM)', () => {
    const r = razcleniGetData(ODGOVOR_PODATKI);
    expect(r.podjetje?.protesti[0]).toMatchObject({ protest: 'Protest menice', vpisan: '2024-01-15' });
  });

  it('tuji racun ima naziv ponudnika iz TrrPpsNaziv in oznako tuji', () => {
    const zTujim = ODGOVOR_PODATKI.replace(
      '<ObjavaZgd dObjava="2023-06-02"><VrstaObjave>Sprememba zastopnika</VrstaObjave></ObjavaZgd>',
      '<TRR TrrRn="AT611904300234573201" TrrOdprt="2022-05-01"><TrrPpsNaziv>Erste Bank</TrrPpsNaziv></TRR>',
    );
    const r = razcleniGetData(zTujim);
    const tuji = r.podjetje?.racuni.find(x => x.tuji);
    expect(tuji).toMatchObject({ banka: 'Erste Bank', tuji: true });
  });
});
