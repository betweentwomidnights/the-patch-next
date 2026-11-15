import Link from 'next/link';
import type { Metadata } from 'next';
import { SPONSORS_URL } from '../../lib/links';
import LazyVideo from '../../components/media/LazyVideo';

export const metadata: Metadata = {
  title: 'about · the patch',
  description: 'how the collabage patch started, and the story behind gary.',
};

// Content carried over from the old "more about gary" page (src/app/gary.tsx).
// Due for a refresh: it predates yuey and the native runtimes.

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
const linkClass = 'link';

export default function AboutPage() {
  return (
    <div className="space-y-20">
      <section>
        <h1 className="loud text-5xl sm:text-6xl">about</h1>
        <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed">
          <p>
            here at the patch, we treat ai music models as collab partners rather than replacements.
          </p>
          <p>
            we don&apos;t want to replace your daw either.
          </p>
          <p>
            that&apos;s where we live, too.
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
          <LazyVideo
            src="/thepatch_v1_small.mp4"
            poster="/thepatch_v1_small_poster.jpg"
            label="the first version of this website"
            mode="loop"
            className="aspect-video w-full object-cover"
          />
        </div>
        <div>
          <h2 className="loud text-4xl">how the patch started</h2>
          <div className="mt-5 max-w-prose space-y-4 leading-relaxed">
            <p>i started coding in 2023 with gpt 3.5 turbo with this website as my first project.</p>
            <p>everything since then has been developed alongside gpt and claude as we all got better at it.</p>
          </div>
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
