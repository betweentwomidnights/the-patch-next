import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getNewsFeed, getNewsPost, newsDate, NEWS_REPO, recentNewsDays } from '../../lib/news';
import NewsPost from './NewsPost';

export const metadata: Metadata = {
  title: 'news · the patch',
  description: 'what we’ve been building at the collabage patch.',
};

function Activity({ feed }: { feed: NonNullable<Awaited<ReturnType<typeof getNewsFeed>>> }) {
  if (!feed.checkedThrough) return null;
  const dates = recentNewsDays(feed.checkedThrough);
  const max = Math.max(1, ...dates.flatMap(date => {
    const day = feed.days[date];
    return day ? [day.releases, day.merges] : [];
  }));

  return (
    // Phones show this first, so it stays compact there; the sidebar (lg) gets the full card.
    <section aria-labelledby="news-activity" className="card sketch-quiet !p-4 lg:!p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 lg:block">
        <h2 id="news-activity" className="loud text-2xl lg:text-3xl">github this week</h2>
        <p className="label lg:mt-2">{newsDate(dates[0], true)} to {newsDate(feed.checkedThrough, true)}</p>
      </div>
      <p className="label mt-1"><span className="text-paper">■</span> merges <span className="ml-2 text-patch">■</span> releases</p>
      <ul className="mt-3 grid grid-cols-7 gap-1.5 lg:mt-4">
        {dates.map(date => {
          const day = feed.days[date];
          return (
            <li key={date} className="text-center" title={day ? `${day.merges} merges, ${day.releases} releases` : 'unavailable'}>
              <span className="sr-only">{day ? `${day.merges} merges, ${day.releases} releases on ` : 'no counts for '}</span>
              <div aria-hidden="true" className="relative flex h-10 items-end justify-center gap-[2px] border-b border-paper/20 pb-1 lg:h-16">
                {day ? (
                  <>
                    <span className="w-2 bg-paper/75" style={{ height: `${day.merges / max * 100}%` }} />
                    <span className="w-2 bg-patch" style={{ height: `${day.releases / max * 100}%` }} />
                    {day.merges === 0 && day.releases === 0 && <span className="absolute h-0.5 w-3 bg-paper/50" />}
                  </>
                ) : <span className="text-xs text-ash">·</span>}
              </div>
              <time dateTime={date} className="mt-1 block text-[0.65rem] text-ash">
                <span aria-hidden="true">{Number(date.slice(-2))}</span>
                <span className="sr-only">{newsDate(date, true)}</span>
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function NewsPage() {
  await connection();
  const feed = await getNewsFeed();
  const [latest, ...archive] = feed?.posts ?? [];
  const markdown = latest ? await getNewsPost(latest.date) : null;
  const checked = feed?.checkedThrough;
  const quiet = checked && feed.days[checked]?.status === 'quiet';

  return (
    <div className="pb-16">
      <div className="flex items-end gap-3">
        <h1 className="loud text-5xl sm:text-6xl">news</h1>
        <span className="label mb-1 rounded-sm border border-patch/70 px-1.5 py-0.5 text-paper">beta</span>
      </div>
      {quiet && (
        <div className="mt-8 max-w-prose">
          <time dateTime={checked} className="label">{newsDate(checked)}</time>
          <p className="mt-1 text-ash">not a lot happened on github. kev and kyle were probably jamming.</p>
        </div>
      )}
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {latest ? (
          <article className="card">
            <h2 className="loud mb-2 text-4xl sm:text-5xl">
              <Link href={`/news/${latest.date}`} className="hover:text-patch">{latest.title}</Link>
            </h2>
            {latest.summary && <p className="mb-3 max-w-prose text-lg leading-snug text-paper">{latest.summary}</p>}
            {markdown ? <NewsPost date={latest.date} markdown={markdown} diagram={latest.diagram} /> : (
              <p className="mt-4 text-ash">couldn’t load this update. <a className="link" href={`${NEWS_REPO}/blob/main/posts/${latest.date}.md`}>read it on github</a>.</p>
            )}
          </article>
        ) : (
          <p className="card max-w-prose">{feed ? 'no updates yet.' : 'couldn’t load the news right now.'}</p>
        )}
        {feed && (
          <div className="order-first lg:order-none">
            <Activity feed={feed} />
          </div>
        )}
      </div>
      {archive.length > 0 && (
        <section aria-labelledby="news-archive" className="mt-10 max-w-prose">
          <h2 id="news-archive" className="loud text-3xl">older updates</h2>
          <ul className="mt-4 divide-y divide-paper/20">
            {archive.map(post => (
              <li key={post.date} className="flex flex-wrap items-baseline gap-x-4 py-3">
                <time className="label w-32 shrink-0" dateTime={post.date}>{newsDate(post.date)}</time>
                <div className="min-w-0 flex-1">
                  <Link href={`/news/${post.date}`} className="link">{post.title}</Link>
                  {post.summary && <p className="mt-1 text-sm text-ash">{post.summary}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
