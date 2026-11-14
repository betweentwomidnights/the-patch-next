import Link from 'next/link';
import type { Metadata } from 'next';
import { products } from '../../lib/catalog';
import { getLatestTag } from '../../lib/github';

export const metadata: Metadata = {
  title: 'software · the patch',
  description: 'open source ai music tools from the collabage patch.',
};

// Rendered per request so Stripe and GitHub data are live after a deploy.
// The GitHub responses themselves are cached for 10 minutes.
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const tags = await Promise.all(products.map((p) => getLatestTag(p)));
  const main = products.filter((p) => !p.experimental);
  const experiments = products.filter((p) => p.experimental);

  const card = (i: number) => {
    const p = products[i];
    return (
      <li key={p.slug}>
        <Link
          href={`/products/${p.slug}`}
          className="block h-full rounded-lg border border-white/20 bg-white/5 p-5 hover:bg-white/10 hover:border-white/40 transition-colors"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">{p.name}</h2>
            {tags[i] && <span className="text-xs text-gray-400">{tags[i]}</span>}
          </div>
          <p className="mt-1 text-sm text-gray-300">{p.tagline}</p>
          <p className="mt-3 text-xs text-gray-400">{p.stripeLookupKey ? 'pay what you want' : 'free'}</p>
        </Link>
      </li>
    );
  };

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold">software</h1>
      <p className="mt-2 text-gray-300">open source, and the releases are always on github.</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">{main.map((p) => card(products.indexOf(p)))}</ul>

      {experiments.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-semibold text-gray-200">experiments</h2>
          <p className="mt-1 text-sm text-gray-400">works in progress. expect rough edges.</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">{experiments.map((p) => card(products.indexOf(p)))}</ul>
        </>
      )}
    </>
  );
}
