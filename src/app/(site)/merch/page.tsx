import Link from 'next/link';
import type { Metadata } from 'next';
import { getMerch, SHOP_URL, type MerchItem } from '../../lib/etsy';
import { cn } from '../../lib/utils';
import MerchGallery from './MerchGallery';

export const metadata: Metadata = {
  title: 'merch · the patch',
  description: 'things from the patch you can hold. sold through our etsy shop.',
};

// Listings come from the Etsy API (cached 10 minutes), so render per request
// rather than freezing whatever the build saw.
export const dynamic = 'force-dynamic';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function Price({ item }: { item: MerchItem }) {
  return (
    <p className="font-mono text-lg">
      {item.priceFrom && <span className="text-ash">from </span>}
      {item.price}
    </p>
  );
}

function MerchCard({ item, first }: { item: MerchItem; first: boolean }) {
  return (
    <li className={cn(item.large && 'sm:col-span-2')}>
      <article className={cn('card h-full', item.large && 'grid items-start gap-x-10 gap-y-4 sm:gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        <MerchGallery images={item.images} large={item.large} priority={first} />
        <div className={cn(!item.large && 'mt-5')}>
          {item.section && <p className="label mb-2 text-patch">{item.section}</p>}
          <h2 className={cn('loud', item.large ? 'text-4xl sm:text-5xl' : 'text-3xl')}>
            <a href={item.url} {...ext} className="hover:text-patch">
              {item.name}
            </a>
          </h2>
          {/* phones: the buy button sits next to the price, above the blurb, so
              it fits on the first screen and clear of the radio dock. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <Price item={item} />
              {item.fewLeft && <span className="label text-patch">only {item.fewLeft} left</span>}
            </div>
            <a href={item.url} {...ext} className="btn md:hidden">
              buy on etsy ↗
            </a>
          </div>
          {item.blurb && <p className="mt-3 max-w-prose leading-relaxed text-paper/90">{item.blurb}</p>}
          <div className="mt-6 hidden md:block">
            <a href={item.url} {...ext} className="btn">
              buy on etsy ↗
            </a>
          </div>
          <p className="label mt-3">checkout, shipping and sales tax are handled by etsy.</p>
        </div>
      </article>
    </li>
  );
}

export default async function MerchPage() {
  const merch = await getMerch();

  return (
    <>
      <h1 className="loud text-5xl sm:text-6xl">merch</h1>
      <p className="mt-3 max-w-prose text-base text-ash">
        things from the patch you can hold. we sell them through{' '}
        <a href={SHOP_URL} {...ext} className="link text-paper">
          our etsy shop
        </a>
        .
      </p>

      {merch.items.length > 0 ? (
        <ul className="mt-6 grid gap-6 sm:mt-10 sm:grid-cols-2">
          {merch.items.map((item, i) => (
            <MerchCard key={item.id} item={item} first={i === 0} />
          ))}
        </ul>
      ) : (
        <div className="card mt-10 max-w-xl">
          <p className="text-paper/90">
            {merch.status === 'ok'
              ? 'nothing in the shop right now. new things soon.'
              : 'couldn’t load the shop right now.'}
          </p>
          <p className="mt-4">
            <a href={SHOP_URL} {...ext} className="btn-line">
              visit the shop on etsy ↗
            </a>
          </p>
        </div>
      )}

      {/* Etsy's API terms ask for this notice and a contact address on the page. */}
      <section className="mt-14 max-w-prose space-y-2 border-t border-paper/10 pt-6 text-sm text-ash">
        <p>
          questions about an order or the shop:{' '}
          <a href="mailto:kev@thecollabagepatch.com" className="link text-paper">
            kev@thecollabagepatch.com
          </a>
          . see our <Link href="/privacy" className="link">privacy policy</Link> and{' '}
          <Link href="/terms" className="link">terms</Link>.
        </p>
        <p>
          The term &lsquo;Etsy&rsquo; is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed
          or certified by Etsy, Inc.
        </p>
      </section>
    </>
  );
}
