'use client';

import {
  SquaresFour, FileText, Repeat, Handshake, Receipt, Users, Tag, Wallet,
  Target, Clock, Layout, ClockCounterClockwise, GearSix, LifebuoyIcon,
} from '@phosphor-icons/react';

/**
 * Ikone menija. Vidne so SAMO, ko je meni zožen — razširjen meni ostane tak,
 * kot je bil (številka + napis), da se videz, ki je že potrjen, ne spreminja.
 *
 * Lastna komponenta z 'use client', ker je DashboardSidebar strežniška.
 */

export type NavIkonaVrsta =
  | 'pregled' | 'ponudba' | 'retainer' | 'pogodba' | 'racuni'
  | 'stranke' | 'ceniki' | 'stroski'
  | 'cilji' | 'cas' | 'okvir'
  | 'zgodovina' | 'nastavitve' | 'pomoc';

const IKONE = {
  pregled: SquaresFour,
  ponudba: FileText,
  retainer: Repeat,
  pogodba: Handshake,
  racuni: Receipt,
  stranke: Users,
  ceniki: Tag,
  stroski: Wallet,
  cilji: Target,
  cas: Clock,
  okvir: Layout,
  zgodovina: ClockCounterClockwise,
  nastavitve: GearSix,
  pomoc: LifebuoyIcon,
} as const;

export default function NavIkona({ vrsta }: { vrsta: NavIkonaVrsta }) {
  const Ikona = IKONE[vrsta];
  return <Ikona size={20} weight="regular" aria-hidden="true" style={{ fill: 'currentColor', stroke: 'none' }} />;
}
