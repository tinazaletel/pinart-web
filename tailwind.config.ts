import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EA',
        ink: '#111111',
        // single accent — deep burgundy (alt option: muted acid green #B7C66B)
        accent: '#b25476'
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Didot', '"Bodoni MT"', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif']
      },
      fontSize: {
        // editorial display scale
        'display-xs': ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(3.5rem, 9vw, 6.5rem)', { lineHeight: '0.92', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(5rem, 13vw, 10rem)', { lineHeight: '0.88', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(7rem, 18vw, 14rem)', { lineHeight: '0.85', letterSpacing: '-0.035em' }],
        'display-xl': ['clamp(9rem, 24vw, 20rem)', { lineHeight: '0.82', letterSpacing: '-0.04em' }]
      }
    }
  },
  plugins: []
};

export default config;
