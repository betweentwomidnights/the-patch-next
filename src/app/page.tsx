// /app/page.tsx
'use client';
import React, { Suspense, useState } from 'react';
import Landing from './Landing';

// Lazy-load the Dashboard
const Dashboard = React.lazy(() => import('./dashboard'));

export default function Page() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div>
      {!showDashboard && (
        <Landing onDashboardClick={() => setShowDashboard(true)} />
      )}

      {showDashboard && (
        <Suspense fallback={<div>Loading...</div>}>
          <Dashboard />
        </Suspense>
      )}
    </div>
  );
}

