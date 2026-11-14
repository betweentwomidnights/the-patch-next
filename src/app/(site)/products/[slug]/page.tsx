import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SPONSORS_URL } from '../../../lib/links';
import { getProduct } from '../../../lib/catalog';
import { models, stemSeparator } from '../../../lib/models';
import Downloads from '../Downloads';
import PayWhatYouWant from '../PayWhatYouWant';
import LazyVideo from '../../../components/media/LazyVideo';
import DemoCarousel, { type Demo } from '../../../components/media/DemoCarousel';
import BackendStatus from '../../../components/BackendStatus';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
  searchParams: { checkout?: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const product = getProduct(params.slug);
  if (!product) return {};
  return { title: `${product.name} · the patch`, description: product.tagline };
}

// Screen recordings of gary4juce sessions, and which models are in each.
const gary4juceDemos: Demo[] = [
  { title: 'rc-jerry, gary, carey', note: 'a structured loop into continuation and remix territory' },
  { title: 'rc-jerry, jerry, carey', note: 'jerry-family loop generation feeding carey' },
  { title: 'human input, carey', note: 'multiple carey passes from the same human seed' },
  { title: 'human input, terry, carey', note: 'a terry transformation into a carey remix' },
  { title: 'human input, gary, carey', note: 'a gary continuation into a carey finishing pass' },
].map((d, i) => ({
  ...d,
  src: `/gary4juce_demos/gary4juce_demo_${i + 1}.mp4`,
  poster: `/gary4juce_demos/gary4juce_demo_${i + 1}_poster.jpg`,
}));

export default function ProductPage({ params, searchParams }: Props) {
  const product = getProduct(params.slug);
  if (!product) notFound();
  const isGary = product.slug === 'gary4juce';

  return (
    <article>
      <Link href="/products" className="label hover:text-paper">
        ← software
      </Link>
      <h1 className="loud mt-4 text-5xl sm:text-7xl">{product.name}</h1>
      <p className="mt-3 max-w-prose text-lg text-paper/90">{product.tagline}</p>

      <div className="mt-10 grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ---- what it is ---- */}
        <div className="min-w-0">
          {product.media && (
            <div className="screen -rotate-[0.3deg]">
              {product.media.video ? (
                <LazyVideo
                  src={product.media.video}
                  poster={product.media.poster}
                  label={product.media.alt}
                  className="aspect-video object-cover"
                />
              ) : (
                // Animated gifs, so next/image would only get in the way.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.media.image} alt={product.media.alt} className="w-full" />
              )}
            </div>
          )}

          <div className="mt-8 max-w-prose space-y-4 text-base leading-relaxed">
            {product.about.map((para) => (
              <p key={para}>{para}</p>
            ))}
          </div>

          {isGary && (
            <>
              <section className="mt-12" aria-labelledby="models">
                <h2 id="models" className="loud text-3xl">
                  eight models and a stem separator
                </h2>
                <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                  {[...models, stemSeparator].map((m) => (
                    <li key={m.name} className="border-t border-paper/10 py-3">
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
              </section>

              <section className="mt-12" aria-labelledby="demos">
                <h2 id="demos" className="loud text-3xl">
                  demos
                </h2>
                <DemoCarousel demos={gary4juceDemos} square className="mt-5 max-w-xl" />
              </section>
            </>
          )}
        </div>

        {/* ---- get it ---- */}
        <aside className="min-w-0 space-y-8 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          {product.stripeLookupKey && <PayWhatYouWant product={product} status={searchParams.checkout} />}

          <section aria-labelledby="download">
            <h2 id="download" className="loud text-3xl">
              download
            </h2>
            <p className="mb-5 mt-1 text-sm text-ash">
              {product.stripeLookupKey ? (
                'free to download either way. these are the latest releases on github.'
              ) : (
                <>
                  free. these are the latest releases on github. if it’s useful to you,{' '}
                  <a href={SPONSORS_URL} target="_blank" rel="noopener noreferrer" className="link">
                    sponsor the patch on github
                  </a>
                  .
                </>
              )}
            </p>
            {product.warning && (
              <p className="sketch sketch-quiet mb-5 px-4 py-3 text-sm leading-relaxed text-paper/90">
                <span className="label mb-1 block text-patch">heads up</span>
                {product.warning}
              </p>
            )}
            <Downloads product={product} />
          </section>

          {isGary && <BackendStatus />}

          {product.related && product.related.length > 0 && (
            <section className="border-t border-paper/10 pt-5">
              {product.related.map((r) => {
                const other = getProduct(r.slug);
                if (!other) return null;
                return (
                  <p key={r.slug} className="text-sm text-ash">
                    <Link href={`/products/${other.slug}`} className="link font-bold text-paper">
                      {other.name}
                    </Link>{' '}
                    — {r.why}
                  </p>
                );
              })}
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
