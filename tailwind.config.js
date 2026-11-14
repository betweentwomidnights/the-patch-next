/** @type {import('tailwindcss').Config} */

// Design tokens live in two places that mirror each other:
//   - the CSS variables at the top of src/app/globals.css (the values)
//   - this file (the names tailwind classes use for them)
// Change a colour or a font there and the whole site follows.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: token('ink'), // the page: almost black
        soot: token('soot'), // raised surfaces
        ember: token('ember'), // red-black, for tinted surfaces
        paper: token('paper'), // text and line work: warm white
        ash: token('ash'), // quiet text
        patch: {
          DEFAULT: token('red'), // the brand red, sampled from the logo
          deep: token('red-deep'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-monospace', 'monospace'], // pixel face: headings, buttons, nav
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'], // body and labels
      },
      maxWidth: {
        page: '68rem',
        prose: '40rem',
      },
      keyframes: {
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-0.6deg)' },
          '50%': { transform: 'rotate(0.6deg)' },
        },
        blink: {
          '0%, 60%': { opacity: '1' },
          '61%, 100%': { opacity: '0.25' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'page-in': 'page-in 420ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards',
        wiggle: 'wiggle 0.5s steps(2) infinite',
        blink: 'blink 1.6s steps(1) infinite',
        marquee: 'marquee 18s linear infinite',
      },
    },
  },
  plugins: [],
};
