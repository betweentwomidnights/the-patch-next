import 'server-only';
import Stripe from 'stripe';
import { unstable_cache } from 'next/cache';
import type { NextRequest } from 'next/server';

// The SDK's pinned API version (2026-10-28.endive) supports Managed Payments,
// so no apiVersion override is needed.
let client: Stripe | null | undefined;

/** The Stripe client, or null when STRIPE_SECRET_KEY isn't set (pages then hide checkout). */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key) : null;
  }
  return client;
}

export interface PwywPrice {
  id: string;
  currency: string;
  /** Minor units (cents). */
  preset: number | null;
  minimum: number | null;
  taxInclusive: boolean;
}

export async function lookupPrice(lookupKey: string): Promise<PwywPrice | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = data[0];
  if (!price) {
    console.error(`Stripe: no active price with lookup key ${lookupKey}`);
    return null;
  }
  return {
    id: price.id,
    currency: price.currency,
    preset: price.custom_unit_amount?.preset ?? price.unit_amount ?? null,
    minimum: price.custom_unit_amount?.minimum ?? null,
    taxInclusive: price.tax_behavior === 'inclusive',
  };
}

// Only successful lookups are cached: throwing skips the cache, so a missing
// key or a Stripe hiccup doesn't hide checkout for the next 10 minutes.
const cachedPrice = unstable_cache(
  async (lookupKey: string) => {
    const price = await lookupPrice(lookupKey);
    if (!price) throw new Error(`no active price with lookup key ${lookupKey}`);
    return price;
  },
  ['stripe-price'],
  { revalidate: 600 },
);

/** The price behind a lookup key, cached for 10 minutes. Null if Stripe is off or it's missing. */
export async function getPrice(lookupKey: string): Promise<PwywPrice | null> {
  if (!getStripe()) return null;
  try {
    return await cachedPrice(lookupKey);
  } catch (err) {
    console.error(`Stripe: price lookup for ${lookupKey} failed:`, err);
    return null;
  }
}

/** Public origin for Stripe return URLs: SITE_URL, else the proxied request's host. */
export function siteOrigin(req: NextRequest): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

export function formatMoney(minor: number, currency: string): string {
  const amount = minor / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
