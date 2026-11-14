import Link from 'next/link';
import SocialMediaButtonGroup from '../components/SocialButtons';
import SponsorButton, { SupportLinks } from '../components/SponsorButton';

const nav = [
  { href: '/products', label: 'software' },
  { href: '/merch', label: 'merch' },
  { href: '/about', label: 'about' },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-xl font-bold tracking-tight hover:text-gray-300">
            the patch
          </Link>
          <nav className="flex items-center gap-5 text-sm text-gray-300">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
            <SponsorButton size="compact" />
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10">{children}</main>

      <footer className="border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center gap-3 text-center">
          <SupportLinks />
          <SocialMediaButtonGroup fixed={false} compact />
          <div className="text-[11px] leading-snug text-gray-400">
            <div>the collabage patch, inc.</div>
            <a href="mailto:kev@thecollabagepatch.com" className="underline underline-offset-2 hover:text-gray-200">
              kev@thecollabagepatch.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
