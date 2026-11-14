import Link from 'next/link';
import { SPONSORS_URL } from '../../../lib/links';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProduct } from '../../../lib/catalog';
import Downloads from '../Downloads';
import PayWhatYouWant from '../PayWhatYouWant';

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

export default function ProductPage({ params, searchParams }: Props) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  return (
    <article>
      <Link href="/products" className="text-sm text-gray-400 hover:text-white">
        ← software
      </Link>
      <h1 className="mt-4 text-3xl md:text-4xl font-bold">{product.name}</h1>
      <p className="mt-2 text-lg text-gray-300">{product.tagline}</p>

      {product.media && (
        <div className="mt-8 overflow-hidden rounded-lg border border-white/15 bg-black">
          {product.media.video ? (
            <video
              className="aspect-video w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              poster={product.media.poster}
              aria-label={product.media.alt}
            >
              <source src={product.media.video} type="video/mp4" />
            </video>
          ) : (
            // Animated gifs, so next/image would only get in the way.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.media.image} alt={product.media.alt} className="w-full" />
          )}
        </div>
      )}

      <div className="mt-8 space-y-4 text-gray-200 leading-relaxed">
        {product.about.map((para) => (
          <p key={para}>{para}</p>
        ))}
      </div>

      {product.stripeLookupKey && (
        <div className="mt-8">
          <PayWhatYouWant product={product} status={searchParams.checkout} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-1">download</h2>
        <p className="text-sm text-gray-400 mb-5">
          {product.stripeLookupKey ? (
            'free to download either way. these are the latest releases on github.'
          ) : (
            <>
              free. these are the latest releases on github. if it’s useful to you,{' '}
              <a href={SPONSORS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                sponsor the patch on github
              </a>
              .
            </>
          )}
        </p>
        {product.warning && (
          <p className="mb-5 rounded-lg border border-yellow-300/35 bg-yellow-300/10 px-4 py-3 text-xs leading-relaxed text-yellow-100">
            {product.warning}
          </p>
        )}
        <Downloads product={product} />
      </section>

      {product.related && product.related.length > 0 && (
        <section className="mt-10 border-t border-white/10 pt-6">
          {product.related.map((r) => {
            const other = getProduct(r.slug);
            if (!other) return null;
            return (
              <p key={r.slug} className="text-sm text-gray-300">
                <Link href={`/products/${other.slug}`} className="underline underline-offset-2 hover:text-white">
                  {other.name}
                </Link>{' '}
                — {r.why}
              </p>
            );
          })}
        </section>
      )}
    </article>
  );
}
