import { describe, it, expect } from 'vitest';
import {
  roleAtLeast,
  roleCan,
  canIssueInvoice,
  canDelete,
  canManageMembers,
  canExportAccounting,
  canOverrideNumber,
  canUseFeature,
  type FlowRole,
  type FlowRoleAction,
  type AccessTier,
  type FlowFeature,
} from '@/lib/pinartFlowEntitlements';

/* Pravice po vlogi (owner > admin > accounting > member > viewer) — varnostno
   kritično: ti testi so izvršljiva specifikacija, kdo sme kaj. Če se rang ali
   pravilo tiho spremeni (npr. member dobi izdajo računa), test pade. */

const VSE_VLOGE: FlowRole[] = ['viewer', 'member', 'accounting', 'admin', 'owner'];

describe('entitlements — roleAtLeast', () => {
  it('vloga je vedno vsaj enaka sama sebi (refleksivnost)', () => {
    for (const v of VSE_VLOGE) {
      expect(roleAtLeast(v, v)).toBe(true);
    }
  });

  it('spoštuje hierarhijo owner > admin > accounting > member > viewer', () => {
    expect(roleAtLeast('owner', 'admin')).toBe(true);
    expect(roleAtLeast('admin', 'accounting')).toBe(true);
    expect(roleAtLeast('accounting', 'member')).toBe(true);
    expect(roleAtLeast('member', 'viewer')).toBe(true);
    // obratno ne velja
    expect(roleAtLeast('viewer', 'member')).toBe(false);
    expect(roleAtLeast('member', 'accounting')).toBe(false);
    expect(roleAtLeast('accounting', 'admin')).toBe(false);
    expect(roleAtLeast('admin', 'owner')).toBe(false);
  });

  it('null vloga nikoli ne doseže nobene meje', () => {
    for (const v of VSE_VLOGE) {
      expect(roleAtLeast(null, v)).toBe(false);
    }
  });
});

describe('entitlements — roleCan po dejanjih', () => {
  it('view: dovoljeno vsem vlogam, ne pa null', () => {
    for (const v of VSE_VLOGE) expect(roleCan(v, 'view')).toBe(true);
    expect(roleCan(null, 'view')).toBe(false);
  });

  it('edit: member in višje; viewer in null ne', () => {
    expect(roleCan('viewer', 'edit')).toBe(false);
    expect(roleCan('member', 'edit')).toBe(true);
    expect(roleCan('accounting', 'edit')).toBe(true);
    expect(roleCan('admin', 'edit')).toBe(true);
    expect(roleCan('owner', 'edit')).toBe(true);
    expect(roleCan(null, 'edit')).toBe(false);
  });

  it('issueInvoice / exportAccounting: accounting in višje; member in nižje ne', () => {
    const dejanja: FlowRoleAction[] = ['issueInvoice', 'exportAccounting'];
    for (const d of dejanja) {
      expect(roleCan('viewer', d)).toBe(false);
      expect(roleCan('member', d)).toBe(false);
      expect(roleCan('accounting', d)).toBe(true);
      expect(roleCan('admin', d)).toBe(true);
      expect(roleCan('owner', d)).toBe(true);
      expect(roleCan(null, d)).toBe(false);
    }
  });

  it('delete / manageMembers / overrideInvoiceNumber: admin in višje; accounting in nižje ne', () => {
    const dejanja: FlowRoleAction[] = ['delete', 'manageMembers', 'overrideInvoiceNumber'];
    for (const d of dejanja) {
      expect(roleCan('viewer', d)).toBe(false);
      expect(roleCan('member', d)).toBe(false);
      expect(roleCan('accounting', d)).toBe(false);
      expect(roleCan('admin', d)).toBe(true);
      expect(roleCan('owner', d)).toBe(true);
      expect(roleCan(null, d)).toBe(false);
    }
  });
});

describe('entitlements — pomožni can* aliasi ujemajo roleCan', () => {
  it('canIssueInvoice = accounting in višje', () => {
    expect(canIssueInvoice('member')).toBe(false);
    expect(canIssueInvoice('accounting')).toBe(true);
    expect(canIssueInvoice('owner')).toBe(true);
    expect(canIssueInvoice(null)).toBe(false);
  });

  it('canExportAccounting = accounting in višje', () => {
    expect(canExportAccounting('member')).toBe(false);
    expect(canExportAccounting('accounting')).toBe(true);
    expect(canExportAccounting(null)).toBe(false);
  });

  it('canDelete = admin in višje', () => {
    expect(canDelete('accounting')).toBe(false);
    expect(canDelete('admin')).toBe(true);
    expect(canDelete('owner')).toBe(true);
    expect(canDelete(null)).toBe(false);
  });

  it('canManageMembers = admin in višje', () => {
    expect(canManageMembers('accounting')).toBe(false);
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers(null)).toBe(false);
  });

  it('canOverrideNumber = admin in višje', () => {
    expect(canOverrideNumber('accounting')).toBe(false);
    expect(canOverrideNumber('admin')).toBe(true);
    expect(canOverrideNumber(null)).toBe(false);
  });

  it('accounting sme izdati račun in izvoziti računovodstvo, ne sme pa brisati/upravljati', () => {
    // knjigovodkinja: računi da, ekipa/brisanje ne — jedro ločnice vlog
    expect(canIssueInvoice('accounting')).toBe(true);
    expect(canExportAccounting('accounting')).toBe(true);
    expect(canDelete('accounting')).toBe(false);
    expect(canManageMembers('accounting')).toBe(false);
  });
});

/* Paketne funkcionalnosti po dostopnem nivoju (anonymous / free / pro). */
describe('entitlements — canUseFeature po nivoju dostopa', () => {
  it('anonymous ima le kalkulator in lokalni PDF', () => {
    expect(canUseFeature('anonymous', 'calculator')).toBe(true);
    expect(canUseFeature('anonymous', 'localPdf')).toBe(true);
    expect(canUseFeature('anonymous', 'cloudBackup')).toBe(false);
    expect(canUseFeature('anonymous', 'clients')).toBe(false);
  });

  it('free doda oblak in osnovno zgodovino, ne pa strank/računovodstva', () => {
    expect(canUseFeature('free', 'cloudBackup')).toBe(true);
    expect(canUseFeature('free', 'basicHistory')).toBe(true);
    expect(canUseFeature('free', 'clients')).toBe(false);
    expect(canUseFeature('free', 'accountingExport')).toBe(false);
    expect(canUseFeature('free', 'aiConnector')).toBe(false);
  });

  it('pro odklene vse plačljive funkcionalnosti', () => {
    const proSamo: FlowFeature[] = [
      'clients', 'contracts', 'expenses', 'businessInsights', 'accountingExport', 'aiConnector',
    ];
    for (const f of proSamo) {
      expect(canUseFeature('pro', f), f).toBe(true);
      // in vsaka od teh je zaklenjena za free
      expect(canUseFeature('free', f), f).toBe(false);
    }
  });

  it('vsak višji nivo je nadmnožica nižjega (anonymous ⊆ free ⊆ pro)', () => {
    const vseFunkc: FlowFeature[] = [
      'calculator', 'localPdf', 'cloudBackup', 'basicHistory', 'clients',
      'contracts', 'expenses', 'businessInsights', 'accountingExport', 'aiConnector',
    ];
    const nivoji: AccessTier[] = ['anonymous', 'free', 'pro'];
    for (const f of vseFunkc) {
      for (let i = 1; i < nivoji.length; i++) {
        if (canUseFeature(nivoji[i - 1], f)) {
          expect(canUseFeature(nivoji[i], f), `${f} @ ${nivoji[i]}`).toBe(true);
        }
      }
    }
  });
});
