import 'server-only';
import { HIDDEN_ASSET, type Product, type ReleaseChannel } from './catalog';

// Release data is cached for 10 minutes. The unauthenticated API allows 60
// requests an hour per IP, and every product page shares the same cached
// responses, so that's at most one request per repo per 10 minutes. Set
// GITHUB_TOKEN to raise the limit if that ever becomes a problem.
const REVALIDATE_SECONDS = 600;

interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubAsset[];
}

export interface Download {
  label: string;
  hint?: string;
  fileName: string;
  sizeBytes: number;
  url: string;
}

export interface ResolvedChannel {
  channel: ReleaseChannel;
  release: { tag: string; url: string; publishedAt: string | null } | null;
  downloads: Download[];
}

async function fetchReleases(repo: string): Promise<GitHubRelease[] | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/betweentwomidnights/${repo}/releases?per_page=30`,
      { headers, next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!res.ok) {
      console.error(`GitHub releases for ${repo}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as GitHubRelease[];
  } catch (err) {
    console.error(`GitHub releases for ${repo}:`, err);
    return null;
  }
}

function newest(releases: GitHubRelease[], channel: ReleaseChannel): GitHubRelease | undefined {
  return releases
    .filter((r) => !r.draft && r.published_at && channel.tag.test(r.tag_name))
    .filter((r) => (channel.prerelease ? r.prerelease : !r.prerelease))
    .sort((a, b) => Date.parse(b.published_at!) - Date.parse(a.published_at!))[0];
}

function toDownloads(release: GitHubRelease, product: Product): Download[] {
  const labelled = release.assets
    .filter((a) => !HIDDEN_ASSET.test(a.name))
    .map((asset) => {
      const index = product.assets.findIndex((rule) => rule.match.test(asset.name));
      const rule = product.assets[index];
      return {
        order: index === -1 ? Number.MAX_SAFE_INTEGER : index,
        download: {
          label: rule?.label ?? asset.name,
          hint: rule?.hint,
          fileName: asset.name,
          sizeBytes: asset.size,
          url: asset.browser_download_url,
        },
      };
    });
  return labelled.sort((a, b) => a.order - b.order).map((x) => x.download);
}

/** Latest release and its downloads for each of a product's channels. */
export async function getDownloads(product: Product): Promise<ResolvedChannel[]> {
  const repos = Array.from(new Set(product.channels.map((c) => c.repo)));
  const byRepo = new Map(await Promise.all(repos.map(async (r) => [r, await fetchReleases(r)] as const)));

  return product.channels.map((channel) => {
    const releases = byRepo.get(channel.repo);
    const release = releases ? newest(releases, channel) : undefined;
    if (!release) return { channel, release: null, downloads: [] };
    return {
      channel,
      release: { tag: release.tag_name, url: release.html_url, publishedAt: release.published_at },
      downloads: toDownloads(release, product),
    };
  });
}

/** The current version for the product list: the first stable channel that has a release. */
export async function getLatestTag(product: Product): Promise<string | null> {
  const resolved = await getDownloads(product);
  return resolved.find((r) => r.release && !r.channel.prerelease)?.release?.tag ?? null;
}
