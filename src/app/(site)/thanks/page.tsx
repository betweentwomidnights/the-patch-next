import Link from 'next/link';
import type { Metadata } from 'next';
import { getProduct, type Product } from '../../lib/catalog';
import { formatMoney, getStripe } from '../../lib/stripe';
import Downloads from '../products/Downloads';

export const metadata: Metadata = { title: 'thanks · the patch', robots: { index: false } };
export const dynamic = 'force-dynamic';

interface Paid {
  product: Product | undefined;
  amount: string | null;
  email: string | null;
}

// Stripe sends buyers here with ?session_id=cs_... The session is read back
// from Stripe so the page only says "paid" when Stripe says so. Nothing is
// unlocked here: downloads are public, so there's nothing to fulfil.
async function readSession(sessionId: string | undefined): Promise<Paid | null> {
  const stripe = getStripe();
  if (!stripe || !sessionId || !sessionId.startsWith('cs_')) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return null;
    return {
      product: getProduct(session.metadata?.slug ?? ''),
      amount: session.amount_total != null && session.currency ? formatMoney(session.amount_total, session.currency) : null,
      email: session.customer_details?.email ?? null,
    };
  } catch (err) {
    console.error('thanks: could not read checkout session:', err);
    return null;
  }
}

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const paid = await readSession((await searchParams).session_id);

  if (!paid) {
    return (
      <>
        <h1 className="loud text-5xl sm:text-6xl">thanks</h1>
        <p className="mt-4 max-w-prose text-base text-paper/90">
          we couldn’t find a completed payment for this link. if you did pay, your receipt from stripe has the details, and
          you can email{' '}
          <a href="mailto:kev@thecollabagepatch.com" className="link">
            kev@thecollabagepatch.com
          </a>
          .
        </p>
        <Link href="/products" className="link mt-8 inline-block">
          back to software
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="loud text-6xl text-patch sm:text-7xl">thank you</h1>
      <p className="mt-4 max-w-prose text-xl">
        {paid.amount ? `your ${paid.amount}` : 'your payment'}
        {paid.product ? ` for ${paid.product.name}` : ''} keeps this whole thing going.
      </p>
      {paid.email && <p className="label mt-3">a receipt is on its way to {paid.email}.</p>}

      {paid.product && (
        <section className="mt-12 max-w-xl">
          <h2 className="loud mb-5 text-3xl">your downloads</h2>
          {paid.product.warning && (
            <p className="sketch sketch-quiet mb-5 px-4 py-3 text-sm leading-relaxed text-paper/90">
              <span className="label mb-1 block text-patch">heads up</span>
              {paid.product.warning}
            </p>
          )}
          <Downloads product={paid.product} />
          {paid.product.related?.map((r) => {
            const other = getProduct(r.slug);
            return other ? (
              <p key={r.slug} className="mt-6 text-ash">
                also grab{' '}
                <Link href={`/products/${other.slug}`} className="link font-bold text-paper">
                  {other.name}
                </Link>{' '}
                to {r.why}.
              </p>
            ) : null;
          })}
        </section>
      )}
    </>
  );
}
