import React from 'react';
import { FaDiscord, FaGithub, FaYoutube } from 'react-icons/fa';
import { cn } from '../../lib/utils';

const XLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg aria-hidden="true" viewBox="0 0 512 512" width="1em" height="1em" className={className} fill="currentColor">
    <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9L389.2 48zM364.4 421.8h39.1L151.1 88h-42l255.3 333.8z" />
  </svg>
);

const socialLinks = [
  { href: 'https://github.com/betweentwomidnights', label: 'GitHub', Icon: FaGithub },
  { href: 'https://discord.gg/VECkyXEnAd', label: 'Discord', Icon: FaDiscord },
  { href: 'https://youtube.com/@thepatch_dev', label: 'YouTube', Icon: FaYoutube },
  { href: 'https://x.com/thepatch_kev', label: 'X', Icon: XLogo },
];

export default function SocialMediaButtonGroup({ className }: { className?: string }) {
  return (
    <nav aria-label="social links" className={cn('flex items-center gap-1', className)}>
      {socialLinks.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="grid h-10 w-10 place-items-center text-xl text-paper/80 transition-all duration-150 hover:-rotate-6 hover:scale-110 hover:text-patch"
        >
          <Icon />
        </a>
      ))}
    </nav>
  );
}
