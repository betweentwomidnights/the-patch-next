// Creates the pay-what-you-want software products in a Stripe sandbox so local
// checkout matches live. Safe to re-run: it reuses products (by metadata.slug)
// and prices (by lookup key) that already exist.
//
//   npm run stripe:seed        uses STRIPE_SECRET_KEY from .env.local
//
// Refuses live keys. Live products are managed in the Stripe Dashboard.
import Stripe from 'stripe';

const products = [
  {
    slug: 'gary4juce',
    name: 'gary4juce',
    description:
      "a bunch of open source AI models in the DAW. transform, extend, accompany or create entirely new samples that fit the track you're already working on. use the remote backend, or run it locally with the gary4local app.",
    taxCode: 'txcd_10202000', // Downloadable Software - personal use
    lookupKey: 'gary4juce_pwyw',
    preset: 2000,
    minimum: 500,
  },
];

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY is not set. Add your sandbox key (sk_test_...) to .env.local.');
  process.exit(1);
}
if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
  console.error('Refusing to seed with a live key. Use a sandbox key (sk_test_...).');
  process.exit(1);
}

const stripe = new Stripe(key);

async function findProduct(slug) {
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata?.slug === slug) return product;
  }
  return null;
}

for (const p of products) {
  let product = await findProduct(p.slug);
  if (product) {
    console.log(`product ${p.slug}: exists (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: p.name,
      description: p.description,
      tax_code: p.taxCode,
      metadata: { slug: p.slug },
    });
    console.log(`product ${p.slug}: created (${product.id})`);
  }

  const { data: existing } = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
  if (existing[0]) {
    console.log(`price ${p.lookupKey}: exists (${existing[0].id})`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    custom_unit_amount: { enabled: true, preset: p.preset, minimum: p.minimum },
    tax_behavior: 'inclusive',
    lookup_key: p.lookupKey,
  });
  console.log(`price ${p.lookupKey}: created (${price.id})`);
}
