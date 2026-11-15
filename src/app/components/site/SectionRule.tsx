import { cn } from '../../lib/utils';

export default function SectionRule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('red-rule w-full', className)} />;
}
