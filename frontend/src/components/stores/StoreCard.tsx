import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Heart } from 'lucide-react';
import type { Store } from '@/types';
import { Rating } from '@/components/common/Rating';
import { useAuth } from '@/hooks/useAuth';
import { favoriteService } from '@/services/favorite.service';
import toast from 'react-hot-toast';

interface StoreCardProps {
  store: Store;
  isFavorited?: boolean;
  favoriteId?: string;
  onFavoriteToggle?: (storeId: string, favorited: boolean, favoriteId?: string) => void;
}

export function StoreCard({ store, isFavorited = false, favoriteId, onFavoriteToggle }: StoreCardProps) {
  const { isAuthenticated } = useAuth();
  const [favorited, setFavorited] = useState(isFavorited);
  const [favId, setFavId] = useState(favoriteId);
  const [togglingFav, setTogglingFav] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to save favorites');
      return;
    }
    try {
      setTogglingFav(true);
      if (favorited && favId) {
        await favoriteService.removeFavorite(favId);
        setFavorited(false);
        setFavId(undefined);
        onFavoriteToggle?.(store.id, false);
        toast.success('Removed from favorites');
      } else {
        const response = await favoriteService.addFavorite({ storeId: store.id });
        setFavorited(true);
        setFavId(response.data.id);
        onFavoriteToggle?.(store.id, true, response.data.id);
        toast.success('Added to favorites');
      }
    } catch {
      toast.error('Failed to update favorite');
    } finally {
      setTogglingFav(false);
    }
  };

  return (
    <Link
      to={`/stores/${store.id}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
    >
      {/* Store Image or Gradient Placeholder */}
      <div className="relative h-40 w-full overflow-hidden">
        {store.imageUrl ? (
          <img
            src={store.imageUrl}
            alt={store.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-400 to-teal-600">
            <span className="text-5xl font-bold text-white/80">
              {store.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {!store.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
              Closed
            </span>
          </div>
        )}
        <button
          onClick={handleToggleFavorite}
          disabled={togglingFav}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1.5 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={18}
            className={favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>
      </div>

      {/* Store Info */}
      <div className="p-4">
        <h3 className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-emerald-600">
          {store.name}
        </h3>

        <div className="mb-2">
          <Rating value={store.rating} count={store.reviewCount} size="sm" />
        </div>

        <div className="flex items-start gap-1.5 text-sm text-gray-500">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span className="line-clamp-1">
            {store.address}, {store.city}, {store.state} {store.zipCode}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <Phone className="h-4 w-4 shrink-0 text-gray-400" />
          <span>{store.phone}</span>
        </div>
      </div>
    </Link>
  );
}
