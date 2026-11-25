import 'server-only';
import { unstable_cache } from 'next/cache';

export const NEWS_REPO = 'https://github.com/betweentwomidnights/patch-news';
const DEFAULT_SOURCE = 'https://raw.githubusercontent.com/betweentwomidnights/patch-news/main';
const REVALIDATE_SECONDS = 600;

interface NewsPost {
  date: string;
  title: string;
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
        postDates.has(post.date) || typeof post.title !== 'string' || !post.title.trim() || post.title.length > 100) {
      throw new Error('invalid news post');
    }
    postDates.add(post.date);
    return { date: post.date, title: post.title };
  });
  if (Object.entries(days).some(([date, day]) => day.status === 'posted' && !postDates.has(date))) {
    throw new Error('missing news post');
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return { checkedThrough, days, posts };
}

async function fetchNews(source: string, path: string) {
  const response = await fetch(`${source}/${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`patch news ${path}: HTTP ${response.status}`);
  return response;
}

// Cache the parsed result so a malformed upstream index cannot replace the last good one.
const readFeed = unstable_cache(async (source: string) => {
  const response = await fetchNews(source, 'index.json');
  return parseFeed(await response.json());
}, ['patch-news-index'], { revalidate: REVALIDATE_SECONDS });

const readPost = unstable_cache(async (source: string, date: string) => {
  const response = await fetchNews(source, `posts/${date}.md`);
  const markdown = (await response.text()).trim();
  if (!markdown || markdown.length > 8000) throw new Error('invalid news markdown');
  return markdown;
}, ['patch-news-post'], { revalidate: REVALIDATE_SECONDS });

function source() {
  return (process.env.PATCH_NEWS_SOURCE_URL || DEFAULT_SOURCE).replace(/\/+$/, '');
}

export async function getNewsFeed(): Promise<NewsFeed | null> {
  try {
    return await readFeed(source());
  } catch (error) {
    console.error('could not load patch news index', error);
    return null;
  }
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
