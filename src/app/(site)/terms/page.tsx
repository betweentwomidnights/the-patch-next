import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'terms · the patch',
  description: 'the terms for using thecollabagepatch.com, our software, and our shop.',
};

const UPDATED = 'november 18, 2026';
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="loud mt-10 text-3xl">{children}</h2>;
}

export default function TermsPage() {
  return (
    <article className="max-w-prose leading-relaxed">
      <h1 className="loud text-5xl sm:text-6xl">terms</h1>
      <p className="label mt-3">last updated {UPDATED}</p>

      <p className="mt-6">
        thecollabagepatch.com is run by the collabage patch, inc. by using the site, our software, or our shop, you agree
        to these terms. they&apos;re short on purpose.
      </p>

      <H>the software</H>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>
          our software is open source. each project&apos;s license is in its{' '}
          <a href="https://github.com/betweentwomidnights" {...ext} className="link">
            github repo
          </a>
          , and that license is what governs how you can use the code.
        </li>
        <li>
          the ai models inside gary4juce and our other tools come from other projects, and their weights have their own
          licenses. check a model&apos;s license before you use what it makes commercially.
        </li>
        <li>
          in general, never treat a single ai output as a finished product. we believe the human work you put in
          (editing, arranging, your input audio) is what makes it yours, and copyright law so far seems to point the same way.
        </li>
        <li>
          everything is provided as-is, without warranty. we work hard on it, but we can&apos;t promise it&apos;ll be
          bug-free or fit your particular use, and we aren&apos;t liable for problems that come from using it.
        </li>
        <li>gary&apos;s remote backend is best effort. sometimes it&apos;s down or busy, and we don&apos;t store your input audio or outputs.</li>
      </ul>

      <H>paying what you want</H>
      <p className="mt-4">
        paying for gary4juce is voluntary and the downloads are free either way. stripe is the merchant of record for
        these payments, so{' '}
        <a href="https://stripe.com/legal" {...ext} className="link">
          stripe&apos;s terms
        </a>{' '}
        apply to the purchase. if something went wrong with a payment, email us and we&apos;ll figure it out together.
      </p>

      <H>merch</H>
      <p className="mt-4">
        merch is sold through our etsy shop, so{' '}
        <a href="https://www.etsy.com/legal/terms-of-use" {...ext} className="link">
          etsy&apos;s terms
        </a>{' '}
        and our shop policies on etsy (shipping, returns) apply to orders. prices and stock on our{' '}
        <Link href="/merch" className="link">
          merch page
        </Link>{' '}
        come from etsy and can lag behind it by a few minutes; etsy&apos;s listing is what counts.
      </p>

      <H>music, videos and art</H>
      <p className="mt-4">
        the music on the radio, our demo videos, and our logos and artwork are made by us and the people we work with.
        listen, share links, enjoy. please ask before you re-upload or reuse them.
      </p>

      <H>contact and changes</H>
      <p className="mt-4">
        questions about any of this:{' '}
        <a href="mailto:kev@thecollabagepatch.com" className="link">
          kev@thecollabagepatch.com
        </a>
        . if these terms change, we&apos;ll update this page and the date at the top. see also our{' '}
        <Link href="/privacy" className="link">
          privacy policy
        </Link>
        .
      </p>
    </article>
  );
}
