import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getNewsFeed, getNewsPost, isNewsDate, NEWS_REPO } from '../../../lib/news';
import NewsPost from '../NewsPost';

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props) {
  const { date } = await params;
  const feed = isNewsDate(date) ? await getNewsFeed() : null;
  const post = feed?.posts.find(entry => entry.date === date);
  return {
    title: post ? `${post.title} · the patch` : 'news · the patch',
    ...(post?.summary && { description: post.summary }),
  };
}

export default async function DatedNewsPage({ params }: Props) {
  await connection();
  const { date } = await params;
  if (!isNewsDate(date)) notFound();
  const feed = await getNewsFeed();
  const post = feed?.posts.find(entry => entry.date === date);
  if (feed && !post) notFound();
  const markdown = post ? await getNewsPost(date) : null;

  return (
    <div className="max-w-prose pb-16">
      <Link href="/news" className="link">← news</Link>
      <article className="mt-6">
        <h1 className="loud mb-3 text-5xl sm:text-6xl">{post?.title ?? 'news'}</h1>
        {post?.summary && <p className="mb-3 text-lg leading-snug text-paper">{post.summary}</p>}
        {markdown ? <NewsPost date={date} markdown={markdown} diagram={post?.diagram} /> : (
          <p className="mt-4 text-ash">couldn’t load this update. <a href={`${NEWS_REPO}/tree/main/posts`} className="link">see the updates on github</a>.</p>
        )}
      </article>
    </div>
  );
}
