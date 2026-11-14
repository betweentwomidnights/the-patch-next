import Link from 'next/link';
import type { Metadata } from 'next';
import { products, type Product } from '../../lib/catalog';
import { getLatestTag } from '../../lib/github';
import LazyVideo from '../../components/media/LazyVideo';
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
        <LazyVideo src={m.video} poster={m.poster} label={m.alt} className="aspect-video object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt={m.alt} loading="lazy" className="aspect-video w-full object-cover" />
      )}
    </div>
  );
}

export default async function ProductsPage() {
  const tags = await Promise.all(products.map((p) => getLatestTag(p)));
  const tagOf = (p: Product) => tags[products.indexOf(p)];
  const [flagship, ...rest] = products.filter((p) => !p.experimental);
  const experiments = products.filter((p) => p.experimental);

  const card = (p: Product, big = false) => (
    <li key={p.slug} className={cn(big && 'sm:col-span-2')}>
      <Link href={`/products/${p.slug}`} className={cn('card group h-full', big && 'sketch-red')}>
        <div className={cn(big && 'grid items-center gap-x-8 md:grid-cols-[1.2fr_1fr]')}>
          <Media product={p} />
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={cn('loud group-hover:text-patch', big ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl')}>{p.name}</h2>
              {tagOf(p) && <span className="label shrink-0">{tagOf(p)}</span>}
            </div>
            <p className={cn('mt-2 text-paper/90', big && 'text-base')}>{p.tagline}</p>
            <p className="label mt-4 text-patch">{p.stripeLookupKey ? 'pay what you want · free to download' : 'free'}</p>
          </div>
        </div>
      </Link>
    </li>
  );

  return (
    <>
      <h1 className="loud text-5xl sm:text-6xl">software</h1>
      <p className="mt-3 max-w-prose text-base text-ash">open source, and the releases are always on github.</p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {card(flagship, true)}
        {rest.map((p) => card(p))}
      </ul>

      {experiments.length > 0 && (
        <section className="mt-16" aria-labelledby="experiments">
          <h2 id="experiments" className="loud text-3xl">
            experiments
          </h2>
          <p className="mt-1 text-ash">works in progress. expect rough edges.</p>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">{experiments.map((p) => card(p))}</ul>
        </section>
      )}
    </>
  );
}
