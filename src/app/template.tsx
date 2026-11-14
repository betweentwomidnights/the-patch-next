// A template re-mounts on every navigation, so each page eases in instead of
// popping. The layout around it (header, ink, radio) never re-mounts.
// The animation only applies while it runs (see `page-in` in tailwind.config.js):
// a lingering transform here would trap the page under the ink canvas.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
