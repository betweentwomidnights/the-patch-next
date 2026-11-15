import { repoUrl } from '../../lib/catalog';

/** Keep the runtime credit linked in catalog copy wherever it is displayed. */
export default function SoftwareCopy({ children }: { children: string }) {
  return children.split(/(sa3\.cpp)/g).map((part, index) => (
    part === 'sa3.cpp' ? (
      <a key={index} href={repoUrl('sa3.cpp')} target="_blank" rel="noopener noreferrer" className="link relative z-10">
        {part}
      </a>
    ) : part
  ));
}
