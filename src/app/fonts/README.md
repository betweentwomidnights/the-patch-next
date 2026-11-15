# fonts

both are latin subsets under the SIL Open Font License 1.1.

- `Jersey15-latin.woff2` — [Jersey 15](https://github.com/scfried/soft-type-jersey)
  by Sarah Cadigan-Fried. a pixel face with one weight: headings, buttons, nav.
- `JetBrainsMono-latin.woff2` — [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono),
  variable weight. body text and small technical labels.

they're self-hosted (loaded with `next/font/local` in `src/app/layout.tsx`) so the
build never has to reach google fonts. to try a different pair, drop the woff2 here
and change the two `localFont` calls; everything else follows the `font-display`
and `font-mono` tokens.
