import Link from 'next/link';
import type { Metadata } from 'next';
import { SPONSORS_URL } from '../../lib/links';
import LazyVideo from '../../components/media/LazyVideo';
import WaveRule from '../../components/site/WaveRule';

export const metadata: Metadata = {
  title: 'about · the patch',
  description: 'how the collabage patch started, and the open source models and resources behind gary.',
};

// Content carried over from the old "more about gary" page (src/app/gary.tsx).
// Due for a refresh: it predates yuey and the native runtimes.

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
const linkClass = 'link';

interface Resource {
  title: string;
  body: string;
  note?: string;
  links: { label: string; href: string }[];
}

const resources: Resource[] = [
  {
    title: 'ACE-Step 1.5 LoRAs (carey)',
    body: 'Side-Step is our current path for training ACE-Step 1.5 LoRAs. it is well documented, agent-readable, and can get interesting results from a single album.',
    note: 'we use the DoRA adapter with fisher analysis. ACE-Step’s understand_music helper is useful for autolabelling captions and dataset metadata; it can miss bpm, but it is pretty good with key and scale. LoRAs trained on xl-base can also be applied to xl-turbo.',
    links: [
      { label: 'Side-Step', href: 'https://github.com/koda-dernet/Side-Step' },
      { label: 'training videos', href: 'https://youtube.com/@thepatch_dev' },
    ],
  },
  {
    title: 'Stable Audio 3 LoRAs',
    body: 'Stable Audio 3 ships with a LoRA training pipeline, and the defaults have been working very well so far.',
    note: 'underfit is another useful repo to know about if you want to experiment with Stable Audio 3 training.',
    links: [
      { label: 'stable-audio-3', href: 'https://github.com/stability-ai/stable-audio-3' },
      { label: 'underfit', href: 'https://github.com/dada-bots/underfit' },
    ],
  },
  {
    title: 'Melodyflow (terry)',
    body: 'melodyflow’s training code hasn’t and may never be released. it should be possible to train a model from scratch using this architecture - something i plan to do with funding. finetunes on this model would be quite fun.',
    links: [
      { label: 'inference space', href: 'https://huggingface.co/spaces/facebook/Melodyflow' },
      { label: 'docker container', href: 'https://github.com/betweentwomidnights/melodyflow' },
      { label: 'model weights', href: 'https://huggingface.co/facebook/melodyflow-t24-30secs' },
    ],
  },
  {
    title: 'MusicGen (gary, legacy)',
    body: 'MusicGen is old and lofi now, but it is the original gary, and we still find strange useful corners for it. the old Google Colab finetuning path is no longer a reliable public recommendation.',
    note: 'if you already know what you are doing and want to train MusicGen anyway, audiocraft-dgx is the container base we use. for most new finetuning experiments, start with ACE-Step 1.5 or Stable Audio 3 instead.',
    links: [
      { label: 'huggingface hub', href: 'https://huggingface.co/thepatch' },
      { label: 'audiocraft-dgx', href: 'https://github.com/betweentwomidnights/audiocraft-dgx' },
    ],
  },
  {
    title: 'huggingface spaces',
    body: 'collaborative experiments with community members.',
    links: [
      { label: 'stable-melodyflow', href: 'https://huggingface.co/spaces/thepatch/stable-melodyflow' },
      { label: 'micro-slot-machine', href: 'https://huggingface.co/spaces/thepatch/micro-slot-machine' },
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-20">
      <section>
        <h1 className="loud text-5xl sm:text-6xl">about</h1>
        <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed">
          <p>
            the collabage patch makes open source ai music tools for musicians: plugins, apps, and local runtimes that put
            the models inside the session instead of in a browser tab.
          </p>
          <p>
            everything we build is on{' '}
            <a href="https://github.com/betweentwomidnights" {...ext} className={linkClass}>
              github
            </a>
            . if it’s useful to you,{' '}
            <a href={SPONSORS_URL} {...ext} className={linkClass}>
              sponsoring us on github
            </a>{' '}
            is the best way to keep it going. no github account? you can also{' '}
            <Link href="/products/gary4juce" className={linkClass}>
              pay what you want for gary4juce
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="gary" className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-2">
        <div>
          <h2 className="loud text-4xl">how gary happened</h2>
          <div className="mt-5 max-w-prose space-y-4 leading-relaxed">
            <p>
              gary started out as a python script that used bpm detection to choose sections of a full song to continue
              from, and then stitch them together into a (not very) seamless piece of music. (
              <a href="https://colab.research.google.com/drive/10CMvuI6DV_VPS0uktbrOB8jBQ7IhgDgL" {...ext} className={linkClass}>
                colab notebook
              </a>
              )
            </p>
            <p>
              wanting more granular control, the max4live device was made next. it still works and uses the same backend
              (websockets routes):{' '}
              <a href="https://github.com/betweentwomidnights/gary4live" {...ext} className={linkClass}>
                gary4live on github
              </a>
              .
            </p>
            <p>
              couldn’t forget about the fl studio people, so the vst/au was created. this one is being actively developed:{' '}
              <Link href="/products/gary4juce" className={linkClass}>
                gary4juce
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="screen rotate-[0.5deg]">
          <LazyVideo src="/gary_full_960_24fps.mp4" label="gary over the years" className="w-full" />
        </div>
      </section>

      <section className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-2">
        <div className="screen -rotate-[0.5deg] lg:order-first">
          <LazyVideo src="/thepatch_v1_small.mp4" label="the first version of this website" mode="player" className="w-full" />
        </div>
        <div>
          <h2 className="loud text-4xl">how the patch started</h2>
          <div className="mt-5 max-w-prose space-y-4 leading-relaxed">
            <p>i started coding in 2023 with gpt 3.5 turbo with this website as my first project.</p>
            <p>everything since then has been developed alongside gpt and claude as we all got better at it.</p>
          </div>
        </div>
      </section>

      <section>
        <WaveRule seed={4} className="mb-12 opacity-60" />
        <h2 className="loud text-4xl">fine-tuning & development resources</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {resources.map((r) => (
            <div key={r.title} className="card sketch-quiet">
              <h3 className="loud text-[1.7rem]">{r.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed">{r.body}</p>
              {r.note && <p className="mt-2 text-sm leading-relaxed text-ash">{r.note}</p>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {r.links.map((l) => (
                  <a key={l.href} href={l.href} {...ext} className={linkClass}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="text-base">
        questions, bugs, or ideas:{' '}
        <a href="mailto:kev@thecollabagepatch.com" className={linkClass}>
          kev@thecollabagepatch.com
        </a>
        , or find us on{' '}
        <a href="https://discord.gg/VECkyXEnAd" {...ext} className={linkClass}>
          discord
        </a>
        .
      </section>
    </div>
  );
}
