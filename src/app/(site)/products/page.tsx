import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { products, type Product } from '../../lib/catalog';
import { communityRepos } from '../../lib/communityRepos';
import { getLatestTag } from '../../lib/github';
import LazyVideo from '../../components/media/LazyVideo';
import SoftwareCopy from '../../components/site/SoftwareCopy';
import { cn } from '../../lib/utils';

export const metadata: Metadata = {
  title: 'software · the patch',
  description: 'open source ai music tools from the collabage patch.',
};

// Rendered per request so Stripe and GitHub data are live after a deploy.
// The GitHub responses themselves are cached for 10 minutes.
export const dynamic = 'force-dynamic';

function Media({ product }: { product: Product }) {
  const m = product.media;
  if (!m) return null;
  return (
    <div className="screen mb-5">
      {m.video ? (
        <LazyVideo src={m.video} poster={m.poster} label={m.alt} className={cn('aspect-video', m.square ? 'object-contain' : 'object-cover')} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt={m.alt} loading="lazy" className={cn('aspect-video w-full', m.square ? 'object-contain' : 'object-cover')} />
      )}
    </div>
  );
}

export default async function ProductsPage() {
  const tags = await Promise.all(products.map((p) => getLatestTag(p)));
  const tagOf = (p: Product) => p.version ?? tags[products.indexOf(p)];
  const main = products.filter((p) => !p.experimental);
  const experiments = products.filter((p) => p.experimental);

  const card = (p: Product, big = false) => (
    <li key={p.slug} id={p.slug} className={cn('scroll-mt-[calc(var(--header-h)+1.5rem)]', big && 'sm:col-span-2')}>
      <div className={cn('card group relative h-full', big && 'sketch-red')}>
        <div className={cn(big && 'grid items-center gap-x-8 md:grid-cols-[1.2fr_1fr]')}>
          <Media product={p} />
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={cn('loud', big ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl', !p.stores?.length && 'group-hover:text-patch')}>
                {p.stores?.length ? p.name : (
                  <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0">{p.name}</Link>
                )}
              </h2>
              {tagOf(p) && <span className="label shrink-0">{tagOf(p)}</span>}
            </div>
            <p className="mt-2 text-paper/90"><SoftwareCopy>{p.tagline}</SoftwareCopy></p>
            {p.stores?.length ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {p.stores.map((store) => (
                  <a key={store.href} href={store.href} target="_blank" rel="noopener noreferrer" className="btn-line">
                    {store.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="label mt-4 text-patch">{p.stripeLookupKey ? 'pay what you want · free to download' : 'free'}</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );

  return (
    <>
      <h1 className="loud text-5xl sm:text-6xl">software</h1>
      <p className="mt-3 max-w-prose text-base text-ash">gary</p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {main.map((p) => card(p, p.slug === 'gary4juce'))}
      </ul>

      {experiments.length > 0 && (
        <section className="mt-16" aria-labelledby="experiments">
          <h2 id="experiments" className="loud text-3xl">
            experiments
          </h2>
          <p className="mt-1 text-ash">exploring different interfaces</p>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">{experiments.map((p) => card(p))}</ul>
        </section>
      )}

      <section id="community-repos" aria-labelledby="community-repos-heading" className="mt-20 scroll-mt-[calc(var(--header-h)+1.5rem)] border-t border-paper/15 pt-10">
        <h2 id="community-repos-heading" className="loud text-3xl sm:text-4xl">open source repos we love</h2>
        <p className="mt-3 max-w-prose text-ash">
          independent projects by other developers, shared here as useful companions to our own software.
        </p>
        <ul className="mt-6 divide-y divide-paper/10">
          {communityRepos.map((repo) => (
            <li key={repo.href} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8">
              <div>
                <h3>
                  <a href={repo.href} target="_blank" rel="noopener noreferrer" className="loud inline-flex items-center gap-2 text-2xl hover:text-patch">
                    {repo.name}
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </h3>
                <p className="label mt-1 text-ash">from {repo.owner}</p>
              </div>
              <p className="text-paper/85 sm:pt-1">{repo.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
