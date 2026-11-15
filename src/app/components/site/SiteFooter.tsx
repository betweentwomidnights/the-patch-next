import SocialMediaButtonGroup from '../SocialButtons';
import { SupportLinks } from '../SponsorButton';
import SectionRule from './SectionRule';

export default function SiteFooter() {
  return (
    <footer className="mt-24 pb-[var(--dock-h)]">
      <SectionRule />
      <div className="mx-auto flex max-w-page flex-col items-center gap-4 px-4 pt-10 text-center">
        <SupportLinks />
        <SocialMediaButtonGroup />
        <div className="label leading-relaxed">
          <div>the collabage patch, inc.</div>
          <a href="mailto:kev@thecollabagepatch.com" className="underline underline-offset-2 hover:text-paper">
            kev@thecollabagepatch.com
          </a>
        </div>
      </div>
    </footer>
  );
}
