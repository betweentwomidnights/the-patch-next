import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'merch · the patch' };

// Merch will be sold through the company's Etsy shop (Etsy handles sales tax),
// with this page listing the shop's items via the Etsy API. Coming soon.
export default function MerchPage() {
  return (
    <div className="flex min-h-[55svh] flex-col items-center justify-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/collabage-patch-logo-512.png" alt="" width={160} height={160} className="h-36 w-36 -rotate-6" />
      <h1 className="loud mt-6 text-5xl sm:text-6xl">merch</h1>
      <p className="mt-3 text-lg text-ash">coming soon.</p>
      <p className="mt-8">
        <Link href="/products" className="link">
          the software is ready now
        </Link>
      </p>
    </div>
  );
}
