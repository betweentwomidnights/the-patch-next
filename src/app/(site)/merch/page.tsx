import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'merch · the patch' };

// Merch will be sold through the company's Etsy shop (Etsy handles sales tax),
// with this page listing the shop's items via the Etsy API. Coming soon.
export default function MerchPage() {
  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold">merch</h1>
      <p className="mt-3 text-gray-300">coming soon.</p>
    </>
  );
}
