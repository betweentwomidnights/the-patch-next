// /app/page.tsx
'use client';
import React, { Suspense, useState } from 'react';
import Landing from './Landing';
import Script from 'next/script';

// Lazy-load the Dashboard
const Dashboard = React.lazy(() => import('./dashboard'));

export default function Page() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialComponent, setInitialComponent] = useState<'shaders' | 'home' | 'gary'>('shaders');

  const handleLoadGary = () => {
    setInitialComponent('gary'); // Set the initial component to 'gary'
    setShowDashboard(true); // Show the Dashboard
  };

  return (
    <>
      <Script 
        strategy="afterInteractive"
        id="crisp-chat-script"
        dangerouslySetInnerHTML={{
          __html: `
            window.$crisp=[];
            window.CRISP_WEBSITE_ID="5aecaae7-4957-4b0c-bcf6-41fed35b0527";
            (function() {
              const d = document;
              const s = d.createElement("script");
              s.src = "https://client.crisp.chat/l.js";
              s.async = true;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          `,
        }}
      />

      <div>
        {!showDashboard && (
          <Landing onDashboardClick={() => setShowDashboard(true)} onLoadGary={handleLoadGary} />
        )}
        {showDashboard && (
          <Suspense fallback={<div>Loading...</div>}>
            <Dashboard initialComponent={initialComponent} />
          </Suspense>
        )}
      </div>
    </>
  );
}