'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SponsorButton from '../SponsorButton';
import { cn } from '../../lib/utils';

const nav = [
  { href: '/radio', label: 'radio' },
  { href: '/products', label: 'software' },
  { href: '/merch', label: 'merch' },
  { href: '/news', label: 'news' },
  { href: '/about', label: 'about' },
];

export default function SiteHeader() {
  const pathname = usePathname() ?? '/';
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[var(--header-h)] bg-ink/90 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-gradient-to-b after:from-ink/90 after:to-transparent">
      <div className="mx-auto flex h-full max-w-page items-center justify-between gap-2 px-3 min-[375px]:gap-3 min-[375px]:px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="the collabage patch, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/collabage-patch-logo-512.png"
            alt=""
            width={38}
            height={38}
            className="h-9 w-9 transition-transform duration-200 group-hover:-rotate-12"
          />
          <span className="loud hidden text-3xl sm:inline">the patch</span>
        </Link>

        <nav aria-label="site" className="flex items-center gap-1.5 font-display text-[1.05rem] leading-none min-[375px]:gap-2.5 min-[375px]:text-xl sm:gap-6 sm:text-2xl">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'py-1 transition-colors hover:text-patch',
                  active && 'nav-current',
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <SponsorButton size="compact" className="hidden md:inline-flex" />
        </nav>
      </div>
    </header>
  );
}
