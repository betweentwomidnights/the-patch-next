import { NextResponse, type NextRequest } from 'next/server';
import { getProduct } from '../../../lib/catalog';
import { getStripe, lookupPrice, siteOrigin } from '../../../lib/stripe';

// Starts a Stripe Checkout Session for a pay-what-you-want product and
// redirects the buyer to it. The slug is in the path because server.js parses
// form bodies before Next sees the request, so this route never reads one.

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product?.stripeLookupKey) return new NextResponse('not found', { status: 404 });

  const origin = siteOrigin(req);
  const page = `/products/${product.slug}`;
  const back = (status: string) => NextResponse.redirect(`${origin}${page}?checkout=${status}`, 303);

  const stripe = getStripe();
  if (!stripe) return back('unavailable');

  try {
    const price = await lookupPrice(product.stripeLookupKey);
    if (!price) return back('unavailable');

    // Managed Payments makes Stripe the merchant of record (tax, fraud,
    // receipts), so tax and payment-method params must not be passed here.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      managed_payments: { enabled: true },
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${page}`,
      metadata: { slug: product.slug },
    });
    if (!session.url) throw new Error(`session ${session.id} has no url`);
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error(`checkout for ${product.slug} failed:`, err);
    return back('error');
  }
}
