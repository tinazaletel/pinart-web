'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type CSSProperties, type ReactNode } from 'react';

type Props = {
  /** Fallback href if the browser has no prior history entry. */
  fallbackHref: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Back button that prefers `router.back()` so the user returns to
 * exactly where they came from (scroll position preserved by the
 * browser). Falls back to a real link if there's no history to pop —
 * e.g. when the user landed on this page directly from an external
 * link or refresh.
 */
export default function BackButton({
  fallbackHref,
  children,
  className,
  style
}: Props) {
  const router = useRouter();

  return (
    <Link
      href={fallbackHref}
      scroll={true}
      className={className}
      style={style}
      onClick={(e) => {
        if (typeof window === 'undefined') return;
        // history.length > 1 means there's a previous entry to go back to.
        // It can include the initial blank entry, but back() is still safe.
        if (window.history.length > 1) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('pinart-page-leave'));
          // Wait until the fade overlay is fully OPAQUE before navigating,
          // otherwise the hero (black finale at scroll 0) flashes through
          // the half-transparent overlay while scroll is being restored.
          setTimeout(() => router.back(), 180);
        }
      }}
    >
      {children}
    </Link>
  );
}
