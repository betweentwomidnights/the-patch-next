import 'server-only';
import overrides from './merch-overrides.json';

// The merch grid reads the company's Etsy shop with a read-only API key
// (ETSY_API_KEY = "keystring:shared_secret", a Seller App for our own shop).
// Etsy is the source of truth: publish, edit, feature or sell out a listing on
// Etsy and the site follows within 10 minutes. merch-overrides.json holds the
// few site-only tweaks Etsy has no field for (see docs/MERCH.md).

export const SHOP_ID = 69144776;
export const SHOP_URL = 'https://www.etsy.com/shop/thecollabagepatch';
const API = 'https://api.etsy.com/v3/application';
const REVALIDATE_SECONDS = 600;

interface EtsyPrice {
  amount: number;
  divisor: number;
  currency_code: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  url: string;
  price: EtsyPrice;
  quantity: number;
  has_variations: boolean;
  shop_section_id: number | null;
  featured_rank: number;
  created_timestamp: number;
}

interface EtsyImage {
  rank: number;
  hex_code: string | null;
  alt_text: string | null;
  url_75x75: string;
  url_570xN: string;
  url_fullxfull: string;
  full_width: number | null;
  full_height: number | null;
}

interface EtsySection {
  shop_section_id: number;
  title: string;
  rank: number;
}

export interface MerchOverride {
  /** Site-only name, instead of the start of the Etsy title. */
  name?: string;
  /** Site-only one-liner, instead of the first paragraph of the description. */
  blurb?: string;
  /** Keep it off the site (it stays on Etsy). */
  hide?: boolean;
  /** "large" makes it a big tile. */
  size?: 'large';
  /** Lower comes first. Items without one follow, in Etsy's order. */
  order?: number;
}

export interface MerchImage {
  thumb: string;
  src: string;
  full: string;
  alt: string;
  hex: string | null;
}

export interface MerchItem {
  id: number;
  name: string;
  blurb: string;
  url: string;
  /** e.g. "$8" */
  price: string;
  /** true when variations make the price a minimum ("from $8"). */
  priceFrom: boolean;
  /** Set when stock is low enough to mention. */
  fewLeft: number | null;
  section: string | null;
  images: MerchImage[];
  large: boolean;
}

export type MerchResult =
  | { status: 'ok'; items: MerchItem[] }
  | { status: 'unconfigured' | 'error'; items: [] };

const siteOverrides = overrides as Record<string, MerchOverride>;

async function etsy<T>(path: string): Promise<T> {
  const key = process.env.ETSY_API_KEY;
  if (!key) throw new Error('ETSY_API_KEY is not set');
  const res = await fetch(`${API}${path}`, {
    headers: { 'x-api-key': key },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Etsy ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Etsy titles are written for Etsy search; the site wants the name part. */
function shortTitle(title: string): string {
  const head = title.split(/\s+[-–—|]\s+/)[0].trim();
  return head.length > 70 ? `${head.slice(0, 67).trimEnd()}…` : head;
}

/** The description's first paragraph, cut at a word near 200 characters. */
function firstParagraph(description: string): string {
  const para = description.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
  if (para.length <= 200) return para;
  return `${para.slice(0, 200).replace(/\s+\S*$/, '')}…`;
}

function formatPrice({ amount, divisor, currency_code }: EtsyPrice): string {
  const value = amount / divisor;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency_code,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export async function getMerch(): Promise<MerchResult> {
  if (!process.env.ETSY_API_KEY) return { status: 'unconfigured', items: [] };
  try {
    const [active, sections] = await Promise.all([
      etsy<{ results: EtsyListing[] }>(`/shops/${SHOP_ID}/listings/active?limit=100`),
      etsy<{ results: EtsySection[] }>(`/shops/${SHOP_ID}/sections`),
    ]);
    const listings = active.results;
    if (listings.length === 0) return { status: 'ok', items: [] };

    // Images come from the batch endpoint, one request for every listing.
    const ids = listings.map((l) => l.listing_id).join(',');
    const batch = await etsy<{ results: (EtsyListing & { images?: EtsyImage[] })[] }>(
      `/listings/batch?listing_ids=${ids}&includes=Images`,
    );
    const imagesById = new Map(batch.results.map((l) => [l.listing_id, l.images ?? []]));
    const sectionById = new Map(sections.results.map((s) => [s.shop_section_id, s]));

    const visible = listings.filter((l) => !siteOverrides[l.listing_id]?.hide);
    const order = (l: EtsyListing) => {
      const o = siteOverrides[l.listing_id]?.order;
      const featured = l.featured_rank > 0 ? l.featured_rank : Number.MAX_SAFE_INTEGER;
      const section = (l.shop_section_id && sectionById.get(l.shop_section_id)?.rank) || Number.MAX_SAFE_INTEGER;
      return [o ?? Number.MAX_SAFE_INTEGER, featured, section, -l.created_timestamp];
    };
    visible.sort((a, b) => {
      const x = order(a);
      const y = order(b);
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    });

    const items = visible.map((l): MerchItem => {
      const o = siteOverrides[l.listing_id] ?? {};
      const name = o.name ?? shortTitle(l.title);
      const images = [...(imagesById.get(l.listing_id) ?? [])]
        .sort((a, b) => a.rank - b.rank)
        .map((im, i) => ({
          thumb: im.url_75x75,
          src: im.url_570xN,
          full: im.url_fullxfull,
          alt: im.alt_text || (i === 0 ? name : `${name}, photo ${i + 1}`),
          hex: im.hex_code ? `#${im.hex_code}` : null,
        }));
      return {
        id: l.listing_id,
        name,
        blurb: o.blurb ?? firstParagraph(l.description),
        url: l.url,
        price: formatPrice(l.price),
        priceFrom: l.has_variations,
        fewLeft: l.quantity > 0 && l.quantity <= 3 ? l.quantity : null,
        section: (l.shop_section_id && sectionById.get(l.shop_section_id)?.title.toLowerCase()) || null,
        images,
        large: o.size === 'large',
      };
    });
    // One item on its own gets the big layout.
    if (items.length === 1) items[0].large = true;
    return { status: 'ok', items };
  } catch (err) {
    console.error('merch: Etsy lookup failed:', err);
    return { status: 'error', items: [] };
  }
}
