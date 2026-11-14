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
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-pink-300/60 text-pink-100 transition-all duration-200',
        'hover:bg-pink-300 hover:text-black hover:shadow-[0_0_15px_rgba(249,168,212,0.45)]',
        size === 'compact' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
        className,
      )}
    >
      <span aria-hidden="true">♥</span> sponsor on github
    </a>
  );
}

/** The sponsor button plus the no-account alternative, for footers. */
export function SupportLinks({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <SponsorButton />
      <a href="/products/gary4juce" className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-200">
        no github? pay by card
      </a>
    </div>
  );
}
