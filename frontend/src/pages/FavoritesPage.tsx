import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Store as StoreIcon, Package, AlertCircle, Trash2 } from 'lucide-react';
import { favoriteService } from '@/services/favorite.service';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { addToCart } from '@/store/cartSlice';
import type { Favorite } from '@/types';
import toast from 'react-hot-toast';

type FavTab = 'products' | 'stores';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<FavTab>('products');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const response = await favoriteService.getFavorites();
        setFavorites(response.data ?? []);
      } catch {
        setError('Failed to load favorites.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, navigate]);

  const handleRemoveFavorite = async (id: string) => {
    try {
      setRemovingId(id);
      await favoriteService.removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Removed from favorites');
    } catch {
      toast.error('Failed to remove favorite');
    } finally {
      setRemovingId(null);
    }
  };

  const productFavorites = favorites.filter((f) => f.productId && f.product);
  const storeFavorites = favorites.filter((f) => f.storeId && f.store);

  const currentFavorites = activeTab === 'products' ? productFavorites : storeFavorites;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-40 rounded bg-gray-200" />
            <div className="mt-6 flex gap-2">
              <div className="h-10 w-24 rounded-lg bg-gray-200" />
              <div className="h-10 w-24 rounded-lg bg-gray-200" />
            </div>
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Favorites</h1>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'products'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Products ({productFavorites.length})
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'stores'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Stores ({storeFavorites.length})
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          </div>
        )}

        {/* Favorites List */}
        <div className="mt-6 space-y-4">
          {currentFavorites.length === 0 ? (
            <div className="py-16 text-center">
              <Heart size={56} className="mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No favorite {activeTab} yet
              </h3>
              <p className="mt-2 text-gray-500">
                {activeTab === 'products'
                  ? 'Browse stores and tap the heart icon on products you love.'
                  : 'Tap the heart icon on stores to save them here.'}
              </p>
              <button
                onClick={() => navigate('/stores')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700"
              >
                Browse stores
              </button>
            </div>
          ) : activeTab === 'products' ? (
            currentFavorites.map((fav) => {
              const product = fav.product!;
              return (
                <div
                  key={fav.id}
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  {/* Product Image */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        {product.store && (
                          <p className="mt-0.5 text-sm text-gray-500">{product.store.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFavorite(fav.id)}
                        disabled={removingId === fav.id}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                        aria-label="Remove from favorites"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-gray-900">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => {
                          dispatch(addToCart({ product, quantity: 1 }));
                          toast.success(`${product.name} added to cart`);
                        }}
                        disabled={product.stockQuantity <= 0}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {product.stockQuantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            currentFavorites.map((fav) => {
              const store = fav.store!;
              return (
                <button
                  key={fav.id}
                  onClick={() => navigate(`/stores/${store.id}`)}
                  className="flex w-full gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-green-200 hover:shadow-md"
                >
                  {/* Store Image */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    {store.imageUrl ? (
                      <img
                        src={store.imageUrl}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-linear-to-br from-emerald-400 to-teal-600">
                        <StoreIcon size={24} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Store Details */}
                  <div className="flex flex-1 items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{store.name}</h3>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {store.address}, {store.city}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-400">{store.phone}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(fav.id);
                      }}
                      disabled={removingId === fav.id}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                      aria-label="Remove from favorites"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
