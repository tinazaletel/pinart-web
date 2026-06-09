'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

// Register plugins once on the client. Safe to import this module
// from server components — registration only runs when window exists.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, MorphSVGPlugin);
}

export { gsap, ScrollTrigger, SplitText, MorphSVGPlugin };
