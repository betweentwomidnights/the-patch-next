import type { Product } from '../../lib/catalog';
import { formatMoney, getPrice } from '../../lib/stripe';

const messages: Record<string, string> = {
  error: 'checkout didn’t start. try again in a minute, or email kev@thecollabagepatch.com.',
  unavailable: 'payments aren’t set up on this server yet. the downloads below are free either way.',
};

/**
 * A plain form that posts to the checkout route, which redirects to Stripe.
 * The amount is chosen on Stripe's page (the price is customer-chooses).
 */
export default async function PayWhatYouWant({ product, status }: { product: Product; status?: string }) {
  if (!product.stripeLookupKey) return null;
  const price = await getPrice(product.stripeLookupKey);

  const amounts = price
    ? [
        price.preset != null && `suggested ${formatMoney(price.preset, price.currency)}`,
        price.minimum != null && `minimum ${formatMoney(price.minimum, price.currency)}`,
      ].filter(Boolean)
    : [];

  return (
    <div className="card sketch-red">
      <h2 className="loud text-3xl">pay what you want</h2>
      <p className="mt-2 text-sm text-paper/90">
        {amounts.length > 0 ? `${amounts.join(' · ')}${price?.taxInclusive ? ', tax included' : ''}. ` : ''}
        you pick the amount at checkout. stripe handles the payment and the receipt.
      </p>
      <p className="mt-2 hidden text-sm text-ash [@media(pointer:coarse)]:block">
        on your phone? you can pay here and download on your computer later. the downloads are free either way.
      </p>

      {status && messages[status] && (
        <p role="alert" className="sketch sketch-quiet mt-4 px-3 py-2 text-sm text-paper/90">
          {messages[status]}
        </p>
      )}

      <form action={`/api/checkout/${product.slug}`} method="post" className="mt-5">
        <button type="submit" disabled={!price} className="btn">
          {price ? 'pay what you want' : 'checkout unavailable'}
        </button>
      </form>
    </div>
  );
}
