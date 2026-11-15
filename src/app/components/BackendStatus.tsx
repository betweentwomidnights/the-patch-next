'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

type Status = 'checking' | 'live' | 'down';

/** Whether gary's free remote backend is awake right now. */
export default function BackendStatus({ url = 'https://g4l.thecollabagepatch.com' }: { url?: string }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
        const data = res.ok ? await res.json() : null;
        if (alive) setStatus(data?.status === 'live' ? 'live' : 'down');
      } catch {
        if (alive) setStatus('down');
      }
    };
    void check();
    const id = window.setInterval(check, 30000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [url]);

  const text = { checking: 'checking on gary’s backend…', live: 'gary’s remote backend is live', down: 'gary’s remote backend is asleep' }[status];
  return (
    <p className="label flex items-center gap-2" role="status">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'live' ? 'bg-green-400' : status === 'down' ? 'bg-patch' : 'animate-blink bg-ash',
        )}
      />
      {text}
    </p>
  );
}
