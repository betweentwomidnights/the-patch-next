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
    <div className="space-y-7">
      {channels.map(({ channel, release, downloads }) => (
        <section key={channel.label}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">{channel.label}</h3>
            {release && (
              <a href={release.url} target="_blank" rel="noopener noreferrer" className="label hover:text-paper">
                {release.tag}
                {formatDate(release.publishedAt) && ` · ${formatDate(release.publishedAt)}`} · release notes
              </a>
            )}
          </div>
          {channel.note && <p className="label mb-2">{channel.note}</p>}

          {downloads.length > 0 ? (
            <ul className="sketch sketch-quiet divide-y divide-paper/10 overflow-hidden bg-soot/70">
              {downloads.map((d) => (
                <li key={d.fileName}>
                  <a
                    href={d.url}
                    className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-patch hover:text-ink"
                    title={d.fileName}
                  >
                    <span>
                      <span className="block font-bold leading-snug">{d.label}</span>
                      {d.hint && <span className="label block group-hover:text-ink/70">{d.hint}</span>}
                    </span>
                    <span className="label shrink-0 group-hover:text-ink">{formatSize(d.sizeBytes)} ↓</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sketch sketch-quiet px-4 py-3 text-sm text-ash">
              couldn’t load this release right now.{' '}
              <a href={`${repoUrl(channel.repo)}/releases`} target="_blank" rel="noopener noreferrer" className="link text-paper">
                get it from github releases
              </a>
              .
            </p>
          )}
        </section>
      ))}

      <p className="label">
        source:{' '}
        {sourceRepos.map((repo, i) => (
          <span key={repo}>
            {i > 0 && ', '}
            <a href={repoUrl(repo)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-paper">
              {repo}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
