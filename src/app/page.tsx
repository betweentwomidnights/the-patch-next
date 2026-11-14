import Link from 'next/link';
import StageAnchor from './visual/StageAnchor';
import SiteFooter from './components/site/SiteFooter';
import WaveRule from './components/site/WaveRule';
import CyclingText from './components/home/CyclingText';
import { NowPlayingLine, TuneInButton } from './components/home/TuneIn';
import LazyVideo from './components/media/LazyVideo';
import DemoCarousel, { type Demo } from './components/media/DemoCarousel';
import { models, stemSeparator } from './lib/models';
import { products } from './lib/catalog';

// Rendered with the waveform visualizer (gary-waveform-visualizer).
const waveformDemos: Demo[] = [
  {
    src: '/demos/yuey_billie_sa3.mp4',
    poster: '/demos/yuey_billie_sa3_poster.jpg',
    title: 'yuey and carey, then sa3',
    note: 'yuey with ACE-Step and a billie LoRA. sa3 takes over at 0:47.',
  },
  {
    src: '/demos/sa3_four_loras.mp4',
    poster: '/demos/sa3_four_loras_poster.jpg',
    title: 'four sa3 LoRAs',
    note: 'one session, four LoRAs. the header shows which one is driving.',
  },
];

const beatboxDemos: Demo[] = [
  '8-bit yum, vanya, terry',
  'big yums',
  'decent drums only',
  'keygen, gary',
  'keygen v2 large 16',
  'vanya, keygen, terry',
].map((title, i) => ({
  title,
  src: `/gary4beatbox_demos/gary4beatbox_demo_${i + 1}.mp4`,
  poster: `/gary4beatbox_demos/gary4beatbox_demo_${i + 1}_poster.jpg`,
}));

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="label mb-3 text-patch">{children}</p>;
}

export default function LandingPage() {
  const others = products.filter((p) => p.slug !== 'gary4juce');

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="mx-auto flex min-h-[100svh] max-w-page flex-col items-center justify-center px-4 pb-24 pt-[calc(var(--header-h)+1rem)] text-center sm:px-6">
        {/* The ink forms the logo here. The image underneath is what shows
            first, and what stays if the browser can't run the ink. */}
        <StageAnchor shape="patch" priority={10} className="aspect-square w-[min(74vw,46svh,27rem)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/collabage-patch-logo.webp"
            alt="the collabage patch logo: two red characters wearing headphones, inside a red ring"
            width={1254}
            height={1254}
            className="h-full w-full"
            fetchPriority="high"
          />
        </StageAnchor>

        <h1 className="loud mt-6 text-[clamp(3.3rem,12.5vw,7.5rem)]">the collabage patch</h1>
        <p className="mt-3 max-w-prose text-base text-paper/90 sm:text-lg">open source ai music tools for musicians.</p>
        <div className="mt-2">
          <CyclingText />
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-4">
          <Link href="/products/gary4juce" className="btn">
            get gary4juce
          </Link>
          <TuneInButton />
        </div>
      </section>

      {/* -------------------------------------------------------- gary4juce */}
      <section className="mx-auto max-w-page px-4 sm:px-6" aria-labelledby="gary4juce">
        <WaveRule seed={2} className="mb-14 opacity-70" />
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Eyebrow>the flagship · VST3 / AU / standalone</Eyebrow>
            <h2 id="gary4juce" className="loud text-5xl sm:text-6xl">
              gary4juce
            </h2>
            <p className="mt-4 max-w-prose text-base">
              eight open source ai music models and a native stem separator, in a single vst. put it on your master, press
              play, record some audio, and start iterating.
            </p>
            <p className="mt-3 max-w-prose text-ash">
              it&apos;s for musicians who want ai inside the session, working on the track they already have. if you just
              want pure text-to-music, you probably don&apos;t need a vst.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-4">
              <Link href="/products/gary4juce" className="btn">
                download
              </Link>
              <Link href="/products/gary4local" className="link text-sm">
                got a gpu? run the models yourself with gary4local
              </Link>
            </div>
            <div className="screen mt-8 -rotate-[0.4deg]">
              <LazyVideo
                src="/gary4juce_v4_landing.mp4"
                poster="/gary4juce_v4_landing_poster.jpg"
                label="gary4juce running inside ableton live"
                className="aspect-video object-cover"
              />
            </div>
          </div>

          <div>
            <h3 className="label mb-3">what&apos;s inside</h3>
            <ul className="divide-y divide-paper/10 border-y border-paper/10">
              {[...models, stemSeparator].map((m) => (
                <li key={m.name} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="loud text-[1.7rem]">{m.name}</span>
                    <a href={m.href} target="_blank" rel="noopener noreferrer" className="label shrink-0 underline underline-offset-2 hover:text-patch">
                      {m.source}
                    </a>
                  </div>
                  <p className="mt-0.5 text-sm text-ash">{m.does}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ demos */}
      <section className="mx-auto mt-24 max-w-page px-4 sm:px-6" aria-labelledby="hear-it">
        <Eyebrow>made in the plugin</Eyebrow>
        <h2 id="hear-it" className="loud text-4xl sm:text-5xl">
          what it sounds like
        </h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {waveformDemos.map((demo, i) => (
            <figure key={demo.src} className={i % 2 ? 'md:translate-y-6 md:rotate-[0.5deg]' : '-rotate-[0.5deg]'}>
              <div className="screen">
                <LazyVideo src={demo.src} poster={demo.poster} label={demo.title} mode="player" className="aspect-square bg-black object-cover" />
              </div>
              <figcaption className="mt-3">
                <p className="font-bold">{demo.title}</p>
                <p className="text-sm text-ash">{demo.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- other software */}
      <section className="mx-auto mt-28 max-w-page px-4 sm:px-6" aria-labelledby="more-software">
        <WaveRule seed={5} className="mb-14 opacity-70" />
        <Eyebrow>also from the patch</Eyebrow>
        <h2 id="more-software" className="loud text-4xl sm:text-5xl">
          more software
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {others.map((p) => (
            <li key={p.slug}>
              <Link href={`/products/${p.slug}`} className="card group h-full">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="loud text-2xl group-hover:text-patch">{p.name}</h3>
                  <span className="label shrink-0">{p.experimental ? 'experiment' : 'free'}</span>
                </div>
                <p className="mt-1.5 text-ash">{p.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/products" className="link">
            all the software
          </Link>
        </p>
      </section>

      {/* ------------------------------------------------------------ radio */}
      <section className="mx-auto mt-28 max-w-page px-4 sm:px-6" aria-labelledby="radio">
        <div className="card sketch-red grid items-center gap-6 !p-7 sm:!p-10 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <Eyebrow>this site started out as a radio station</Eyebrow>
            <h2 id="radio" className="loud text-4xl sm:text-5xl">
              here&apos;s a bunch of music
            </h2>
            <p className="mt-3 max-w-prose text-ash">
              all of it made with gary. everyone who tunes in hears the same thing, and it keeps playing while you look
              around.
            </p>
            <NowPlayingLine className="mt-4" />
          </div>
          <div className="flex flex-wrap items-center gap-4 md:flex-col md:items-stretch">
            <TuneInButton variant="solid" />
            <Link href="/radio" className="btn-line">
              open the radio
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ phone */}
      <section className="mx-auto mt-28 max-w-page px-4 sm:px-6" aria-labelledby="beatbox">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>for the phone</Eyebrow>
            <h2 id="beatbox" className="loud text-4xl sm:text-5xl">
              gary4beatbox
            </h2>
            <p className="mt-4 max-w-prose">
              gary4beatbox can start from your mic or a jerry-generated loop, then gary continues it and terry transforms
              it. these demos start from jerry loops.
            </p>
            <p className="sketch sketch-quiet mt-5 max-w-prose px-4 py-3 text-sm text-ash">
              gary4beatbox was built quite some time ago and is about to undergo a big transformation. for now, the vst is
              where the new model work is landing first.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a href="https://apps.apple.com/us/app/gary4beatbox/id6736522400" target="_blank" rel="noopener noreferrer" className="btn-line">
                download for ios
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.gary4beatbox" target="_blank" rel="noopener noreferrer" className="btn-line">
                get it on google play
              </a>
            </div>
          </div>
          <DemoCarousel demos={beatboxDemos} />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
