import { createHash, randomBytes } from 'node:crypto';

export const hashPogodbe = (vsebina: string) => createHash('sha256').update(vsebina, 'utf8').digest('hex');
export const novPodpisniZeton = () => randomBytes(32).toString('base64url');
export const hashZetona = (zeton: string) => createHash('sha256').update(zeton, 'utf8').digest('hex');

/* Posnetek se odpre na javni strani. Odstranimo izvedljivo vsebino, videz pa ostane. */
export const varenPosnetekPogodbe = (html: string) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/javascript\s*:/gi, '');
