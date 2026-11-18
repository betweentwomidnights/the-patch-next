import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'privacy · the patch',
  description: 'what thecollabagepatch.com collects (not much) and who handles payments and orders.',
};

// Keep this true to what the code does. If the site starts storing or sending
// anything new, update this page in the same PR.
const UPDATED = 'november 18, 2026';
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="loud mt-10 text-3xl">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <article className="max-w-prose leading-relaxed">
      <h1 className="loud text-5xl sm:text-6xl">privacy</h1>
      <p className="label mt-3">last updated {UPDATED}</p>

      <p className="mt-6">
        this is the privacy policy for thecollabagepatch.com, run by the collabage patch, inc. the short version: we
        don&apos;t want your data. there are no accounts, no cookies, and no analytics or ad trackers on this site.
      </p>

      <H>what this site keeps</H>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>
          <strong>server logs.</strong> like any web server, ours logs requests: your IP address, browser, the page you
          asked for, and when. we only use them to keep the site running and secure.
        </li>
        <li>
          <strong>the radio.</strong> the server counts how many people are listening. it&apos;s a number, nothing
          about who you are.
        </li>
        <li>
          <strong>your browser.</strong> if you change the visualizer&apos;s timing, that one setting is saved in your
          browser&apos;s local storage. it never leaves your device.
        </li>
        <li>
          <strong>email.</strong> if you write to us, we keep the conversation so we can answer you.
        </li>
      </ul>

      <H>payments: stripe</H>
      <p className="mt-4">
        paying what you want for gary4juce goes through stripe, which acts as the merchant of record: stripe takes the
        payment, works out sales tax or VAT, and sends your receipt. stripe collects your card details and billing
        information under{' '}
        <a href="https://stripe.com/privacy" {...ext} className="link">
          its own privacy policy
        </a>
        . we never see your card number. we can see your name, email, country and what you paid, and we only use that to
        help with your purchase.
      </p>

      <H>merch: etsy</H>
      <p className="mt-4">
        our merch is sold through our etsy shop. the{' '}
        <Link href="/merch" className="link">
          merch page
        </Link>{' '}
        shows our listings using etsy&apos;s api, and the product photos load directly from etsy&apos;s servers, so
        etsy sees the request like it would for any image. buying happens on etsy, under{' '}
        <a href="https://www.etsy.com/legal/privacy" {...ext} className="link">
          etsy&apos;s privacy policy
        </a>
        . when you order, etsy shares your name and shipping address with us, and we only use them to send your order.
      </p>

      <H>other services we link to</H>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>software downloads come from github releases, and sponsoring goes through github sponsors. both are covered by github&apos;s privacy policy.</li>
        <li>links to youtube, discord and x take you to those sites, under their own policies.</li>
        <li>
          our mobile apps have their own policies:{' '}
          <a href="/privacy-policy.html" className="link">
            gary4beatbox
          </a>{' '}
          and{' '}
          <a href="/rarenumbers/privacy-policy.html" className="link">
            rare numbers
          </a>
          .
        </li>
      </ul>

      <H>your data, your call</H>
      <p className="mt-4">
        we don&apos;t sell or share personal information. if you want to know what we have about you, or want it deleted
        (that includes the old gary4beatbox android waitlist, which is closed), email{' '}
        <a href="mailto:kev@thecollabagepatch.com" className="link">
          kev@thecollabagepatch.com
        </a>
        .
      </p>

      <H>changes</H>
      <p className="mt-4">
        if this changes, we&apos;ll update this page and the date at the top. see also our{' '}
        <Link href="/terms" className="link">
          terms
        </Link>
        .
      </p>
    </article>
  );
}
