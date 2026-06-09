# Pinart — Web

Editorial, cinematic portfolio for the Pinart studio.
Next.js App Router · TypeScript · Tailwind · GSAP · Lenis · Framer Motion · next-intl (SI/EN).

## Setup

```bash
cd pinart-web
npm install
npm run dev
```

Open <http://localhost:3000>. The default locale is Slovenian (`/sl`). English at `/en`.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + globals + per-component CSS modules later |
| Smooth scroll | Lenis (`components/SmoothScroll.tsx`) |
| Animation | GSAP + ScrollTrigger (added per milestone), Framer Motion for component transitions |
| Physics | GSAP physics for typography collapse (Matter.js added later if needed) |
| WebGL | minimal Three.js shader for hero "glass distortion" (added in Milestone 10) |
| i18n | `next-intl` v3 with `[locale]` segment, messages in `messages/{sl,en}.json` |
| Typography | Bodoni Moda (display serif) + Manrope (grotesk) via `next/font/google` |
| Colors | `#F5F2EA` paper · `#111111` ink · `#5E1C20` burgundy accent |

## Project structure

```
pinart-web/
├── app/
│   ├── layout.tsx              # pass-through root layout (next-intl requirement)
│   ├── globals.css             # Tailwind directives, tokens, grain overlay, kicker utility
│   └── [locale]/
│       ├── layout.tsx          # real <html>/<body>, fonts, SmoothScroll, Nav
│       └── page.tsx            # homepage: composes all sections
├── components/
│   ├── Nav.tsx                 # fixed minimal top nav, mix-blend-difference
│   ├── SmoothScroll.tsx        # Lenis wrapper, cleans up on unmount
│   └── sections/
│       ├── Hero.tsx            # M2: ink-illustration animation (placeholder for now)
│       ├── TypographyCollapse.tsx  # M3
│       ├── Services.tsx        # M4
│       ├── Projects.tsx        # M5
│       ├── About.tsx           # M6
│       ├── Clients.tsx         # M7
│       ├── Testimonials.tsx    # M8
│       └── Contact.tsx         # M9
├── i18n/
│   ├── routing.ts              # locales + typed Link/router
│   └── request.ts              # server-side message loader
├── lib/
│   └── fonts.ts                # next/font config for Bodoni Moda + Manrope
├── messages/
│   ├── sl.json                 # Slovenian copy (default)
│   └── en.json                 # English copy
├── middleware.ts               # next-intl locale routing
├── public/
│   ├── pupa_pinart.svg
│   └── packa_1.svg
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Milestones

| # | Section | Status |
| - | --- | --- |
| 1 | Project scaffold (this file) | ✅ in progress |
| 2 | Hero — port ink animation, transition to next | pending |
| 3 | Typography collapse — kinetic / physics | pending |
| 4 | Services — 5 editorial panels | pending |
| 5 | Featured projects — asymmetric gallery | pending |
| 6 | About — calm editorial | pending |
| 7 | Clients — slow marquee | pending |
| 8 | Testimonials — large editorial quotes | pending |
| 9 | Contact — fullscreen ending + tagline | pending |
| 10 | Polish — WebGL distortion, micro-interactions, mobile | pending |

## Content state

Locked into `messages/{sl,en}.json` — service titles + descriptions, About body, Contact headline, tagline. **Placeholders** still to be replaced: featured projects, client logos, testimonials, portrait photo, hero asset alignment with brief.
