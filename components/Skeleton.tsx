'use client';

import styles from './Skeleton.module.css';

export default function Skeleton({ vrsta = 'vrstice', stevilo = 3, className = '' }: { vrsta?: 'vrstice' | 'kartice' | 'stolpci'; stevilo?: number; className?: string }) {
  return <div className={`${styles.skeleton} ${styles[vrsta]} ${className}`} aria-hidden="true">
    {Array.from({ length: stevilo }, (_, i) => <span key={i}><i /><b /></span>)}
  </div>;
}
