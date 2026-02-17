import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}

const sizeClasses: Record<NonNullable<RatingProps['size']>, { star: string; text: string }> = {
  sm: { star: 'h-3.5 w-3.5', text: 'text-xs' },
  md: { star: 'h-5 w-5', text: 'text-sm' },
};

export function Rating({ value, count, size = 'md' }: RatingProps) {
  const { star: starSize, text: textSize } = sizeClasses[size];
  const fullStars = Math.floor(value);
  const hasHalfStar = value - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${starSize} fill-yellow-400 text-yellow-400`}
          />
        ))}
        {/* Half star rendered as full for simplicity */}
        {hasHalfStar && (
          <Star
            key="half"
            className={`${starSize} fill-yellow-400 text-yellow-400`}
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          />
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${starSize} text-gray-300`}
          />
        ))}
      </div>
      {count !== undefined && (
        <span className={`${textSize} text-gray-500`}>({count})</span>
      )}
    </div>
  );
}
