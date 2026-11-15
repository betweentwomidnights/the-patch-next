import SiteFooter from '../components/site/SiteFooter';

// The reading pages (software, about, merch, thanks): one centred column.
// The landing page and the radio lay themselves out.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-page flex-1 px-4 pt-[calc(var(--header-h)+2.5rem)] sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
