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
    <div className="rounded-lg border border-white/20 bg-white/5 p-5">
      <h2 className="text-lg font-semibold">pay what you want</h2>
      <p className="mt-1 text-sm text-gray-300">
        {amounts.length > 0 ? `${amounts.join(' · ')}${price?.taxInclusive ? ', tax included' : ''}. ` : ''}
        you pick the amount at checkout. stripe handles the payment and the receipt.
      </p>

      {status && messages[status] && (
        <p role="alert" className="mt-3 rounded-md border border-yellow-300/35 bg-yellow-300/10 px-3 py-2 text-xs text-yellow-100">
          {messages[status]}
        </p>
      )}

      <form action={`/api/checkout/${product.slug}`} method="post" className="mt-4">
        <button
          type="submit"
          disabled={!price}
          className="bg-white text-black px-7 py-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100"
        >
          {price ? 'pay what you want' : 'checkout unavailable'}
        </button>
      </form>
    </div>
  );
}
