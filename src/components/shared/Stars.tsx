import { IconStar } from '../Icons';

export default function Stars({ rating, size = 'sm' }: { rating: number; size?: string }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <IconStar key={i} className={`${s} ${i <= Math.round(rating) ? 'text-accent-500' : 'text-cream-300'}`} filled={i <= Math.round(rating)} />
      ))}
    </div>
  );
}
