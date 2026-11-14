import Link from 'next/link';
import { SPONSORS_URL } from '../../lib/links';
import { cn } from '../../lib/utils';

interface SponsorButtonProps {
  className?: string;
  /** `compact` for the header; the default is sized for footers. */
  size?: 'default' | 'compact';
}

// The site-wide "donate" button: GitHub Sponsors handles one-time and monthly.
// Sponsoring needs a GitHub account; gary4juce's pay-what-you-want checkout is
// the no-account way to pay.
export default function SponsorButton({ className, size = 'default' }: SponsorButtonProps) {
  return (
    <a
      href={SPONSORS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('btn-line sketch-red whitespace-nowrap', size === 'compact' && 'btn-sm', className)}
    >
      <span aria-hidden="true" className="text-patch">
        ♥
      </span>{' '}
      sponsor on github
    </a>
  );
}

/** The sponsor button plus the no-account alternative, for footers. */
export function SupportLinks({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <SponsorButton />
      <Link href="/products/gary4juce" className="label underline underline-offset-2 hover:text-paper">
        no github? pay by card
      </Link>
    </div>
  );
}
