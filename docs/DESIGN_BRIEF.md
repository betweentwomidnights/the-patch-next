# design brief: the patch, next

a brief for redesigning thecollabagepatch.com. read this whole file before
changing anything, then read the files it points to.

## the goal

redesign the whole site with real creative freedom. when you're done, the only
work left for kev should be:

- walking through and editing copy
- adding music to the radio (and maybe scheduling it)
- refreshing the about page

it doesn't have to be perfect on the first pass. it should be a confident,
coherent direction we can iterate on.

## who we are

the collabage patch, inc. makes open source ai music tools for musicians.
the flagship is **gary4juce**, a VST3/AU plugin that puts a bunch of open
source music models inside the DAW. around it: **gary4local** (runs the models
on your own machine), **foundation keys** (text to playable synth), and sa3
experiments for ableton and other plugins.

positioning, in kev's words: **this is not suno.** it's for musicians who want
ai inside their session, working on the track they already have, not a button
that spits out a finished song.

## voice

follow [`kevs_docs_style.md`](/mnt/c/dev/gary4juce/kevs_docs_style.md)
(in the gary4juce repo). the short version: lowercase by default, kev's words
are the voice of record, keep it human, keep technical names as their
projects style them (ACE-Step, LoRA, YuE2).

the current landing copy is good. keep its spirit. it is out of date in one
way: gary4juce now has **eight models plus a native stem separator**, including
**yuey (YuE2)**, which writes songs with or without lyrics in your tempo and
key. the model list and descriptions are in the
[gary4juce README](/mnt/c/dev/gary4juce/README.md).

## the feel we want

- **one continuous experience.** the old site was a single next app where the
  landing page, the radio and the gary page flowed into each other. kev loved
  that seamless, continuous feel. the site is now split into routes (that was
  needed for the store), so bring the continuity back through design: shared
  motion, a persistent visual layer, transitions that don't feel like page
  loads.
- **the ui revolves around a visualization.** something audio-reactive and
  alive should be the spine of the design, not a widget in a corner.
- **the radio** at `/radio` plays music made with gary. it needs a new
  visualizer. [waterball](https://github.com/matsuoka-601/waterball) (a WebGPU
  fluid sim on a sphere) is the jumping-off point kev picked. two hard
  constraints:
  - waterball has **no license**, so don't copy its code. learn from the
    approach (MLS-MPM simulation plus screen-space fluid rendering) and write
    our own, or ask the author for permission first.
  - WebGPU isn't in every browser. there must be a good fallback (WebGL or
    canvas) so nobody gets a blank page.
- an idea worth exploring: a radio player that keeps playing while you browse
  the store and about pages (app router layouts persist across navigation).
  see the cross-origin note under constraints before doing this.

## brand and visual references

- **the collabage patch logo:** `public/brand/collabage-patch-logo.webp`
  (1254×1254, plus a 512px png). two red headphone-wearing characters in a red
  ring. this is now the company logo and should be a big part of the landing
  page. brand red sampled from it: **`#F90000`**.
- **gary's logo** still belongs somewhere: `public/gary4live_logo.png`,
  `public/output_transparent.gif` (animated).
- **the gary4juce plugin's look:** browse
  [`/mnt/c/dev/gary4juce`](/mnt/c/dev/gary4juce) (`Source/` for the JUCE ui
  code, `docs/` and the README gif for how it looks). the site should feel
  like it belongs with the plugin.
- **the waveform videos:** red waveforms on black with model-change headers,
  made with [`/mnt/c/dev/gary-waveform-visualizer`](/mnt/c/dev/gary-waveform-visualizer).
  they're an existing visual language worth echoing.
- **the old site:** it's this repo. `src/app/Landing.tsx`, `dashboard.tsx`,
  `shaders.tsx` and `gary.tsx`, and the live site at thecollabagepatch.com
  until this ships.

## assets

| asset | path | notes |
| --- | --- | --- |
| company logo | `public/brand/collabage-patch-logo.webp`, `-512.png` | already transparent (it only looks white-backed in viewers that flatten it) |
| gary4juce demo video | `public/gary4juce_v4_landing.mp4` + `_poster.jpg` | current landing hero |
| foundation keys building a keybed | `public/foundation-keys/foundation-keys-build.mp4` (97 KB), `.gif` (754 KB), `-poster.jpg` | prefer the mp4 as a looping muted video |
| gary4local install/startup | `public/gary4local-install-startup.gif` | |
| waveform demo: yuey + ace-step billie lora, switching to sa3 at 0:47 | `public/demos/yuey_billie_sa3.mp4` | rendered with the waveform visualizer |
| waveform demo: four sa3 LoRAs | `public/demos/sa3_four_loras.mp4` | same |
| beatbox demos | `public/gary4beatbox_demos/sa3_013.mp4`, `sa3_005.mp4` + `_poster.jpg` | v4 on Android and iOS; waveform renders from the mobile renderer |
| the first version of this site | `public/thepatch_v1_small.mp4` | used on /about |
| gary history montage | `public/gary_full_960_24fps.mp4` | used on /about |
| radio music | `public/audio/<folder>/` | scanned by `AudioStateManager.js` |

videos, gifs and audio are gitignored and live on the VM. new media goes up
with `npm run media:push` (see [DEVELOPMENT.md](../DEVELOPMENT.md)).

**assets we still need** (ask kev, don't fake them):

- the logo as SVG (the webp/png are transparent and are what the site uses now)
- screenshots or a fresh screen recording of the gary4juce v5 ui, including yuey
- a square product image for foundation keys and the sa3 projects
- any photos of kev, matt, or the setup, if kev wants a human face on /about

## what exists (and must keep working)

| route | what it is |
| --- | --- |
| `/` | landing (`src/app/Landing.tsx`) |
| `/products`, `/products/[slug]` | software pages, data-driven from `src/app/lib/catalog.ts`; downloads come live from github releases |
| `/products/gary4juce` | also has stripe pay-what-you-want checkout (`PayWhatYouWant.tsx` → `POST /api/checkout/[slug]`) |
| `/thanks` | stripe return page |
| `/about` | story and fine-tuning resources (placeholder content to refresh later) |
| `/merch` | "coming soon"; will list the company's etsy shop via the etsy api later |
| `/radio`, `/radio?view=gary` | the radio dashboard and the old "more about gary" view |
| `/support` | redirect to github sponsors (the link we give out in plugins and READMEs) |

donations: "♥ sponsor on github" everywhere, with "no github? pay by card"
(→ gary4juce pay-what-you-want) under it in footers.

## constraints

- **don't change behaviour you weren't asked to:** `src/app/lib/{catalog,github,stripe}.ts`, the checkout
  route, `server.js`, the radio streaming and socket.io sync, the deploy
  workflow. restyle them freely; don't rewire them.
- **cross-origin isolation:** `next.config.js` sends COOP/COEP headers on
  `/radio` only, because they block stripe, youtube and github embeds. nothing
  in the code uses `SharedArrayBuffer`, so they may not be needed at all. if a
  persistent player or visual layer needs the radio outside `/radio`, verify
  that and remove the headers deliberately, don't spread them.
- **the site must work without secrets:** no `.env.local` means stripe shows
  "checkout unavailable" and everything else still renders. CI builds without
  any env.
- **phones matter:** check 375px wide. no horizontal scroll, nothing
  overlapping the fixed elements.
- **respect `prefers-reduced-motion`**, and don't let heavy visuals block
  reading or buying. lazy-load video, keep first load light.
- **tailwind** is already set up. keep design tokens (colors, type, spacing)
  in one place so the next iteration is easy.

## how to work

1. **explore first.** make 2-3 distinct directions as quick static mockups
   (a `/design-lab` route or standalone pages) covering the landing page and
   one product page. show them to kev before building anything for real.
2. **build the shell** for the chosen direction: tokens, type, the shared
   layout, the persistent visual layer, navigation, footer.
3. **landing page**, then **product pages**, then **about**, **merch**,
   **thanks**.
4. **the radio visualizer** as its own piece of work (WebGPU plus fallback).
5. after each step: `npm run build` passes with no `.env.local`, then check
   it in a browser at desktop and phone widths.

work on a branch, never on the VM, and don't merge to `main` (that deploys).
