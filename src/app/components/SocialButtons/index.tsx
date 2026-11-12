import React from 'react';
import { FaDiscord, FaYoutube } from 'react-icons/fa';
import { cn } from '../../lib/utils';

interface SocialMediaButtonGroupProps {
  className?: string;
  compact?: boolean;
  fixed?: boolean;
}

const XLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 512 512"
    width="1em"
    height="1em"
    className={className}
    fill="currentColor"
  >
    <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9L389.2 48zM364.4 421.8h39.1L151.1 88h-42l255.3 333.8z" />
  </svg>
);

const socialLinks = [
  {
    href: 'https://x.com/thepatch_kev',
    label: 'X',
    Icon: XLogo,
  },
  {
    href: 'https://discord.gg/VECkyXEnAd',
    label: 'Discord',
    Icon: FaDiscord,
  },
  {
    href: 'https://youtube.com/@thepatch_dev',
    label: 'YouTube',
    Icon: FaYoutube,
  },
];

const SocialMediaButtonGroup: React.FC<SocialMediaButtonGroupProps> = ({
  className,
  compact = false,
  fixed = true,
}) => {
  const iconClassName = compact ? 'text-lg sm:text-2xl' : 'text-[2em]';
  const linkClassName = compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-9 w-9';

  return (
    <nav
      aria-label="Social links"
      className={cn(
        fixed && 'social-media-button-group',
        'flex flex-row items-center justify-between border border-white/70 bg-black/75 text-white backdrop-blur-md',
        'shadow-[0_0_18px_rgba(255,255,255,0.16)]',
        compact ? 'w-auto gap-1.5 rounded-full px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2' : 'w-[200px] rounded-[15px] p-2.5',
        className
      )}
    >
      {socialLinks.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(linkClassName, 'flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-80')}
        >
          <Icon className={cn(iconClassName, 'transition-transform duration-200 hover:scale-110 active:scale-95')} />
        </a>
      ))}
    </nav>
  );
};

export default SocialMediaButtonGroup;
