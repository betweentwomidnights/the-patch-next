import { repoUrl, type Product } from '../../lib/catalog';
import { getDownloads } from '../../lib/github';

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function Downloads({ product }: { product: Product }) {
  const channels = await getDownloads(product);
  const sourceRepos = Array.from(new Set(product.channels.map((c) => c.repo)));

  return (
    <div className="space-y-6">
      {channels.map(({ channel, release, downloads }) => (
        <section key={channel.label}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-200">{channel.label}</h3>
            {release && (
              <a href={release.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-white">
                {release.tag}
                {formatDate(release.publishedAt) && ` · ${formatDate(release.publishedAt)}`} · release notes
              </a>
            )}
          </div>
          {channel.note && <p className="text-xs text-gray-400 mb-2">{channel.note}</p>}

          {downloads.length > 0 ? (
            <ul className="divide-y divide-white/10 rounded-lg border border-white/15">
              {downloads.map((d) => (
                <li key={d.fileName}>
                  <a
                    href={d.url}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/10 transition-colors"
                    title={d.fileName}
                  >
                    <span>
                      <span className="block text-sm">{d.label}</span>
                      {d.hint && <span className="block text-xs text-gray-400">{d.hint}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">{formatSize(d.sizeBytes)} ↓</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 rounded-lg border border-white/15 px-4 py-3">
              couldn’t load this release right now.{' '}
              <a href={`${repoUrl(channel.repo)}/releases`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                get it from github releases
              </a>
              .
            </p>
          )}
        </section>
      ))}

      <p className="text-xs text-gray-400">
        source:{' '}
        {sourceRepos.map((repo, i) => (
          <span key={repo}>
            {i > 0 && ', '}
            <a href={repoUrl(repo)} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
              {repo}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
