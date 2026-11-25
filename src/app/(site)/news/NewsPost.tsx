import { newsDate } from '../../lib/news';

function inlineLinks(line: string) {
  return line.split(/(\[[^\]\n]+\]\(https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+[^\s()]*\))/g)
    .map((part, index) => {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      return index % 2 && link ? <a key={index} href={link[2]} className="link">{link[1]}</a> : part;
    });
}

export default function NewsPost({ date, markdown }: { date: string; markdown: string }) {
  // The feed uses plain Markdown paragraphs and inline GitHub links.
  return (
    <>
      <time dateTime={date} className="label">{newsDate(date)}</time>
      <div className="mt-4 max-w-prose space-y-4 text-paper/90">
        {markdown.split(/\r?\n\s*\r?\n/).map((paragraph, index) => (
          <p key={index}>{inlineLinks(paragraph.replace(/\r?\n/g, ' '))}</p>
        ))}
      </div>
    </>
  );
}
