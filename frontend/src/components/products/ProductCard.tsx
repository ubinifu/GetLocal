import { useState } from 'react';
import { ShoppingCart, Heart } from 'lucide-react';
import type { Product } from '@/types';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { favoriteService } from '@/services/favorite.service';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isFavorited?: boolean;
  favoriteId?: string;
  onFavoriteToggle?: (productId: string, favorited: boolean, favoriteId?: string) => void;
}

function getStockStatus(product: Product): { label: string; classes: string } {
  if (product.stockQuantity <= 0) {
    return { label: 'Out of Stock', classes: 'text-red-600 bg-red-50' };
  }
  if (product.stockQuantity <= product.lowStockThreshold) {
    return { label: 'Low Stock', classes: 'text-yellow-700 bg-yellow-50' };
  }
  return { label: 'In Stock', classes: 'text-green-700 bg-green-50' };
}

export function ProductCard({ product, onAddToCart, isFavorited = false, favoriteId, onFavoriteToggle }: ProductCardProps) {
  const stockStatus = getStockStatus(product);
  const isOutOfStock = product.stockQuantity <= 0;
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
        onFavoriteToggle?.(product.id, false);
        toast.success('Removed from favorites');
      } else {
        const response = await favoriteService.addFavorite({ productId: product.id });
        setFavorited(true);
        setFavId(response.data.id);
        onFavoriteToggle?.(product.id, true, response.data.id);
        toast.success('Added to favorites');
      }
    } catch {
      toast.error('Failed to update favorite');
    } finally {
      setTogglingFav(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Product Image or Placeholder */}
      <div className="relative h-48 w-full overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-100 to-gray-200">
            <span className="text-5xl font-bold text-gray-300">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${stockStatus.classes}`}
        >
          {stockStatus.label}
        </span>
        <button
          onClick={handleToggleFavorite}
          disabled={togglingFav}
          className="absolute left-2 top-2 rounded-full bg-white/80 p-1.5 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={18}
            className={favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 text-base font-semibold text-gray-900 line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="mb-3 text-sm text-gray-500 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-auto">
          {/* Price */}
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">
              ${Number(product.price).toFixed(2)}
            </span>
            {product.compareAtPrice != null && Number(product.compareAtPrice) > Number(product.price) && (
              <span className="text-sm text-gray-400 line-through">
                ${Number(product.compareAtPrice).toFixed(2)}
              </span>
            )}
          </div>

          {/* Add to Cart */}
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
