import { describe, expect, it } from 'vitest';
import { buildMailReplyPrompt, replySubject } from '@/lib/mailAiDraft';

describe('mail AI draft helpers', () => {
  it('adds Re only once', () => {
    expect(replySubject('Ponudba')).toBe('Re: Ponudba');
    expect(replySubject('RE: Ponudba')).toBe('RE: Ponudba');
  });

  it('builds a bounded, explicit draft prompt', () => {
    const prompt = buildMailReplyPrompt({
      fromEmail: 'stranka@example.com',
      subject: 'Rok izvedbe',
      bodyText: 'Kdaj bo projekt zaključen?',
    }, 'Ne obljubi datuma.');
    expect(prompt).toContain('stranka@example.com');
    expect(prompt).toContain('Kdaj bo projekt zaključen?');
    expect(prompt).toContain('Ne obljubi datuma.');
    expect(prompt).toContain('Ne izmišljaj si');
  });
});
