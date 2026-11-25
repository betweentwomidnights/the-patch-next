import { newsDate, type NewsDiagram } from '../../lib/news';

function inlineLinks(line: string) {
  return line.split(/(\[[^\]\n]+\]\(https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+[^\s()]*\))/g)
    .map((part, index) => {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      return index % 2 && link ? <a key={index} href={link[2]} className="link">{link[1]}</a> : part;
    });
}

function ProjectDiagram({ diagram }: { diagram: NewsDiagram }) {
  return (
    <figure aria-label={diagram.title} className="mt-7 max-w-prose border-t border-paper/20 pt-5">
      <p className="loud text-3xl">{diagram.title}</p>
      <ol className="mx-auto mt-4 max-w-md">
        {diagram.steps.map((step, index) => (
          <li key={step.label + index}>
            {index > 0 && <div aria-hidden="true" className="mx-auto h-3 w-px bg-paper/30" />}
            <div className="rounded-sm border border-paper/20 bg-ink/50 px-3 py-2 text-center">
              <a href={step.url} className="loud text-2xl text-paper hover:text-patch">{step.label}</a>
              <p className="mt-1 text-sm text-ash">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 text-sm text-ash">{diagram.caption}</figcaption>
    </figure>
  );
}

export default function NewsPost({ date, markdown, diagram }: { date: string; markdown: string; diagram?: NewsDiagram }) {
  // The feed uses plain Markdown paragraphs and inline GitHub links.
  return (
    <>
      <time dateTime={date} className="label">{newsDate(date)}</time>
      <div className="mt-4 max-w-prose space-y-4 text-paper/90">
        {markdown.split(/\r?\n\s*\r?\n/).map((paragraph, index) => (
          <p key={index}>{inlineLinks(paragraph.replace(/\r?\n/g, ' '))}</p>
        ))}
      </div>
      {diagram && <ProjectDiagram diagram={diagram} />}
    </>
  );
}
