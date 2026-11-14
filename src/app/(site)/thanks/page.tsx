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

export default async function ThanksPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const paid = await readSession(searchParams.session_id);

  if (!paid) {
    return (
      <>
        <h1 className="text-2xl md:text-3xl font-bold">thanks</h1>
        <p className="mt-3 text-gray-300">
          we couldn’t find a completed payment for this link. if you did pay, your receipt from stripe has the details, and
          you can email{' '}
          <a href="mailto:kev@thecollabagepatch.com" className="underline hover:text-white">
            kev@thecollabagepatch.com
          </a>
          .
        </p>
        <Link href="/products" className="mt-6 inline-block text-sm underline text-gray-300 hover:text-white">
          back to software
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">thank you</h1>
      <p className="mt-3 text-lg text-gray-300">
        {paid.amount ? `your ${paid.amount}` : 'your payment'}
        {paid.product ? ` for ${paid.product.name}` : ''} keeps this whole thing going.
      </p>
      {paid.email && <p className="mt-2 text-sm text-gray-400">a receipt is on its way to {paid.email}.</p>}

      {paid.product && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-5">your downloads</h2>
          {paid.product.warning && (
            <p className="mb-5 rounded-lg border border-yellow-300/35 bg-yellow-300/10 px-4 py-3 text-xs leading-relaxed text-yellow-100">
              {paid.product.warning}
            </p>
          )}
          <Downloads product={paid.product} />
          {paid.product.related?.map((r) => {
            const other = getProduct(r.slug);
            return other ? (
              <p key={r.slug} className="mt-6 text-sm text-gray-300">
                also grab{' '}
                <Link href={`/products/${other.slug}`} className="underline hover:text-white">
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
