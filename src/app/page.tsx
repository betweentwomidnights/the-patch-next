// /app/page.tsx
'use client';
import Landing from './Landing';

// The radio and the "more about gary" view live at /radio, the only route with
// the cross-origin isolation headers (see next.config.js). Headers only apply
// to a full page load, so these navigate the window instead of using the router.
export default function Page() {
  return (
    <Landing
      onDashboardClick={() => window.location.assign('/radio')}
      onGaryPageClick={() => window.location.assign('/radio?view=gary')}
    />
  );
}
