'use client';

import {
  SquaresFour, FileText, Repeat, Handshake, Receipt, Users, Tag, Wallet,
  Target, Clock, Layout, Folders, GearSix, LifebuoyIcon, Kanban, CalendarBlank,
  PaintBrush, FolderOpen,
} from '@phosphor-icons/react';

/**
 * Ikone menija. Vidne so SAMO, ko je meni zožen — razširjen meni ostane tak,
 * kot je bil (številka + napis), da se videz, ki je že potrjen, ne spreminja.
 *
 * Lastna komponenta z 'use client', ker je DashboardSidebar strežniška.
 */

export type NavIkonaVrsta =
  | 'pregled' | 'projekti' | 'ponudba' | 'retainer' | 'pogodba' | 'racuni'
  | 'stranke' | 'ceniki' | 'stroski'
  | 'cilji' | 'cas' | 'okvir' | 'naloge' | 'koledar'
  | 'zgodovina' | 'nastavitve' | 'dizajn' | 'pomoc';

const IKONE = {
  pregled: SquaresFour,
  projekti: FolderOpen,
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
  naloge: Kanban,
  koledar: CalendarBlank,
  zgodovina: Folders,
  nastavitve: GearSix,
  dizajn: PaintBrush,
  pomoc: LifebuoyIcon,
} as const;

export default function NavIkona({ vrsta }: { vrsta: NavIkonaVrsta }) {
  const Ikona = IKONE[vrsta];
  return <Ikona size={20} weight="regular" aria-hidden="true" style={{ fill: 'currentColor', stroke: 'none' }} />;
}
