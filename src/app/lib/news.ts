import 'server-only';
import { unstable_cache } from 'next/cache';

export const NEWS_REPO = 'https://github.com/betweentwomidnights/patch-news';
const DEFAULT_SOURCE = 'https://raw.githubusercontent.com/betweentwomidnights/patch-news/main';
const POST_REVALIDATE_SECONDS = 600;
const FEED_REFRESH_MS = 60_000;

export interface NewsDiagram {
  title: string;
  steps: { label: string; detail: string; url: string }[];
  caption: string;
}

interface NewsPost {
  date: string;
  title: string;
  /** One plain sentence anyone could follow, even someone who's never used gary. Optional. */
  summary?: string;
  diagram?: NewsDiagram;
}

interface NewsDay {
  status: 'posted' | 'quiet';
  releases: number;
  merges: number;
}

interface NewsFeed {
  checkedThrough: string | null;
  days: Record<string, NewsDay>;
  posts: NewsPost[];
}

let feedCache: {
  source: string;
  feed: NewsFeed | null;
  refreshAfter: number;
  refreshing?: Promise<NewsFeed | null>;
} | undefined;

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const shortDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function isNewsDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function newsDate(date: string, short = false): string {
  return (short ? shortDateFormat : dateFormat).format(new Date(date)).toLowerCase();
}

export function recentNewsDays(checkedThrough: string): string[] {
  const date = new Date(checkedThrough);
  date.setUTCDate(date.getUTCDate() - 6);
  return Array.from({ length: 7 }, () => {
    const day = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 1);
    return day;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

function parseDiagram(raw: unknown): NewsDiagram | undefined {
  if (!isRecord(raw) || !isText(raw.title, 80) || !isText(raw.caption, 220) ||
      !Array.isArray(raw.steps) || raw.steps.length < 2 || raw.steps.length > 5) return;

  const steps: NewsDiagram['steps'] = [];
  for (const step of raw.steps) {
    if (!isRecord(step) || !isText(step.label, 60) || !isText(step.detail, 150) ||
        !isText(step.url, 500) || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\/[^\s]*)?$/.test(step.url)) return;
    steps.push({ label: step.label, detail: step.detail, url: step.url });
  }
  return { title: raw.title, steps, caption: raw.caption };
}

function parseFeed(raw: unknown): NewsFeed {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.days) || !Array.isArray(raw.posts)) {
    throw new Error('invalid patch news index');
  }

  const { checkedThrough } = raw;
  if (checkedThrough !== null && !isNewsDate(checkedThrough)) throw new Error('invalid news check date');

  const days: NewsFeed['days'] = {};
  for (const [date, day] of Object.entries(raw.days)) {
    if (!isNewsDate(date) || !checkedThrough || date > checkedThrough || !isRecord(day) ||
        (day.status !== 'posted' && day.status !== 'quiet') || !isCount(day.releases) || !isCount(day.merges)) {
      throw new Error('invalid news day');
    }
    days[date] = { status: day.status, releases: day.releases, merges: day.merges };
  }
  if (checkedThrough && !days[checkedThrough]) throw new Error('missing latest news day');

  const postDates = new Set<string>();
  const posts = raw.posts.map((post: unknown) => {
    if (!isRecord(post) || !isNewsDate(post.date) || days[post.date]?.status !== 'posted' ||
        postDates.has(post.date) || !isText(post.title, 100)) {
      throw new Error('invalid news post');
    }
    postDates.add(post.date);
    // A missing or malformed summary is skipped rather than failing the feed.
    const summary = isText(post.summary, 200) ? post.summary.trim() : undefined;
    return { date: post.date, title: post.title, summary, diagram: parseDiagram(post.diagram) };
  });
  if (Object.entries(days).some(([date, day]) => day.status === 'posted' && !postDates.has(date))) {
    throw new Error('missing news post');
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return { checkedThrough, days, posts };
}

async function fetchNews(source: string, path: string, headers?: HeadersInit) {
  const response = await fetch(`${source}/${path}`, {
    cache: 'no-store',
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`patch news ${path}: HTTP ${response.status}`);
  return response;
}

const readPost = unstable_cache(async (source: string, date: string) => {
  const response = await fetchNews(source, `posts/${date}.md`);
  const markdown = (await response.text()).trim();
  if (!markdown || markdown.length > 8000) throw new Error('invalid news markdown');
  return markdown;
}, ['patch-news-post'], { revalidate: POST_REVALIDATE_SECONDS });

function source() {
  return (process.env.PATCH_NEWS_SOURCE_URL || DEFAULT_SOURCE).replace(/\/+$/, '');
}

export async function getNewsFeed(): Promise<NewsFeed | null> {
  const feedSource = source();
  if (feedCache?.source !== feedSource) {
    feedCache = { source: feedSource, feed: null, refreshAfter: 0 };
  }
  const cache = feedCache;
  if (cache.refreshing) return cache.refreshing;
  if (Date.now() < cache.refreshAfter) return cache.feed;

  // Wait for the refresh so the first visitor after an overnight publish sees the new post.
  cache.refreshing = (async () => {
    try {
      const response = await fetchNews(feedSource, 'index.json', { 'Cache-Control': 'no-cache' });
      cache.feed = parseFeed(await response.json());
    } catch (error) {
      console.error('could not load patch news index', error);
    } finally {
      cache.refreshAfter = Date.now() + FEED_REFRESH_MS;
      cache.refreshing = undefined;
    }
    return cache.feed;
  })();
  return cache.refreshing;
}

export async function getNewsPost(date: string): Promise<string | null> {
  if (!isNewsDate(date)) return null;
  try {
    return await readPost(source(), date);
  } catch (error) {
    console.error('could not load patch news post', error);
    return null;
  }
}
