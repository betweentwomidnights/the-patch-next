import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RadioRoom from './RadioRoom';

export const metadata: Metadata = {
  title: 'radio · the patch',
  description: 'a live station of music made with gary. everyone who tunes in hears the same thing.',
};

// /radio?view=gary used to be the "more about gary" view. That story lives on
// /about now, and old links (the landing page handed them out) still land there.
export default function RadioPage({ searchParams }: { searchParams: { view?: string } }) {
  if (searchParams.view === 'gary') redirect('/about#gary');
  return <RadioRoom />;
}
