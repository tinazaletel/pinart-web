'use client';

import CurvedLoop from '@/components/CurvedLoop';

export default function CreateWithMe() {
  return (
    <section
      aria-label="Create with me"
      style={{
        overflow: 'hidden',
        padding: 'clamp(1.5rem, 3vw, 3rem) 0',
        marginBottom: 'clamp(7rem, 14vw, 14rem)',
        background: 'var(--paper)',
        borderTop: '1px solid rgba(17,17,17,0.06)',
        borderBottom: '1px solid rgba(17,17,17,0.06)',
      }}
    >
      <CurvedLoop
        marqueeText="CREATE WITH ME • AND HAVE FUN"
        speed={2}
        curveAmount={400}
        direction="left"
        interactive={true}
      />
    </section>
  );
}
