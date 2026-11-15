import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SketchDefs from './components/site/SketchDefs';
import SiteHeader from './components/site/SiteHeader';
import RadioDock from './radio/RadioDock';
import VisualLayer from './visual/VisualLayer';

// Self-hosted (see ./fonts/README.md), so builds never depend on a font CDN.
// `display` is the pixel face for headings and buttons; `mono` is everything else.
const display = localFont({
  src: './fonts/Jersey15-latin.woff2',
  variable: '--font-display',
  weight: '400',
  display: 'swap',
});
const mono = localFont({
  src: './fonts/JetBrainsMono-latin.woff2',
  variable: '--font-mono',
  weight: '100 800',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://thecollabagepatch.com'),
  title: 'the collabage patch · open source ai music tools',
  description:
    'open source ai music tools for musicians. gary4juce puts eight music models and a stem separator inside your DAW. this is not suno.',
  openGraph: {
    title: 'the collabage patch',
    description: 'open source ai music tools for musicians.',
    images: ['/brand/collabage-patch-logo-512.png'],
  },
};

export const viewport: Viewport = { themeColor: '#050404' };

// Everything here survives navigation: the header, the ink (VisualLayer) and
// the radio (RadioDock). Pages only swap what's in between, which is what
// keeps the site feeling like one continuous place with the music still on.
//
// Stacking order, back to front: page content (no z-index), the dock's backing
// disc (z-20), the ink canvas (z-30), then the header and the dock controls
// (z-40). The ink is drawn over the page; anything on a page that must stay
// on top of it (a control in the middle of the stage, say) takes
// `relative z-40`. Don't give page wrappers a z-index or a transform, or
// their children can no longer rise above the ink.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <SketchDefs />
        <SiteHeader />
        <VisualLayer />
        {children}
        <RadioDock />
      </body>
    </html>
  );
}
