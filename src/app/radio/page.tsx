'use client';
import React, { Suspense } from 'react';

const Dashboard = React.lazy(() => import('../dashboard'));

// The audiovisual radio on its own URL; /radio?view=gary opens the
// "more about gary" view. next.config.js gives this route the cross-origin
// isolation headers the dashboard was built with.
export default function RadioPage({ searchParams }: { searchParams: { view?: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Dashboard initialComponent={searchParams.view === 'gary' ? 'gary' : 'shaders'} />
    </Suspense>
  );
}
