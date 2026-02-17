import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  ShoppingCart,
  Plus,
  Minus,
  ArrowLeft,
  Package,
  AlertCircle,
  Store as StoreIcon,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { storeService } from '@/services/store.service';
import { productService } from '@/services/product.service';
import { orderService } from '@/services/order.service';
import { promotionService } from '@/services/promotion.service';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { useAuth } from '@/hooks/useAuth';
import type { Store, Product, Category, Promotion, Order } from '@/types';
import toast from 'react-hot-toast';

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartStoreId = cartItems.length > 0 ? cartItems[0].product.storeId : null;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [buyAgainProducts, setBuyAgainProducts] = useState<Product[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchStore = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await storeService.getStore(id);
        if (response.data) {
          setStore(response.data);
        }
      } catch {
        setError('Failed to load store details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchProducts = async () => {
      if (!id) return;
      try {
        setProductsLoading(true);
        const response = await productService.getProducts({ storeId: id });
        const productList = response.data ?? [];
        setProducts(productList);

        // Extract unique categories
        const cats = productList.reduce<Category[]>((acc: Category[], p: Product) => {
          if (p.category && !acc.find((c: Category) => c.id === p.category!.id)) {
            acc.push(p.category);
          }
          return acc;
        }, []);
        setCategories(cats);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    const fetchPromotions = async () => {
      if (!id) return;
      try {
        const response = await promotionService.getStorePromotions(id);
        const promos = response.data ?? [];
        // Only show active promotions that haven't expired
        const now = new Date();
        setPromotions(
          promos.filter(
            (p) => p.isActive && new Date(p.endDate) > now && new Date(p.startDate) <= now
          )
        );
      } catch {
        // Promotions are optional
      }
    };

    const fetchBuyAgain = async () => {
      if (!id || !isAuthenticated) return;
      try {
        const ordersResponse = await orderService.getOrders({ storeId: id, status: 'PICKED_UP' as any });
        const orders: Order[] = ordersResponse.data ?? [];
        // Collect unique products from past orders
        const productMap = new Map<string, Product>();
        orders.forEach((order) => {
          order.items?.forEach((item) => {
            if (item.product && !productMap.has(item.product.id)) {
              productMap.set(item.product.id, item.product);
            }
          });
        });
        setBuyAgainProducts(Array.from(productMap.values()).slice(0, 8));
      } catch {
        // Buy again is optional
      }
    };

    fetchStore();
    fetchProducts();
    fetchPromotions();
    fetchBuyAgain();
  }, [id, isAuthenticated]);

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  const handleAddToCart = (product: Product) => {
    if (cartStoreId && cartStoreId !== product.storeId) {
      const confirmed = window.confirm(
        'Your cart contains items from another store. Adding this item will clear your current cart. Continue?'
      );
      if (!confirmed) return;
    }

    setAddingToCart(product.id);
    dispatch(addToCart({ product, quantity: 1 }));
    toast.success(`${product.name} added to cart`);
    setTimeout(() => setAddingToCart(null), 300);
  };

  const getCartQuantity = (productId: string): number => {
    const item = cartItems.find((ci) => ci.product.id === productId);
    return item ? item.quantity : 0;
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));

  const getDayHours = (s: Store) => {
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return dayNames.map((day) => {
      const hours = s.hours?.[day];
      return {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        hours: hours ? `${hours.open} - ${hours.close}` : 'Closed',
        isToday: dayNames[new Date().getDay()] === day,
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-6 w-32 rounded bg-gray-200" />
            <div className="mt-6 h-64 rounded-xl bg-gray-200" />
            <div className="mt-6 h-8 w-1/2 rounded bg-gray-200" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {error || 'Store not found'}
          </h2>
          <Link
            to="/stores"
            className="mt-4 inline-flex items-center gap-2 font-medium text-green-600 hover:text-green-700"
          >
            <ArrowLeft size={16} />
            Back to stores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            to="/stores"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600"
          >
            <ArrowLeft size={16} />
            Back to stores
          </Link>

          <div className="mt-2 flex flex-col gap-6 lg:flex-row">
            {/* Store Image */}
            <div className="h-48 w-full overflow-hidden rounded-xl bg-linear-to-br from-green-100 to-emerald-50 lg:h-56 lg:w-80">
              {store.imageUrl ? (
                <img
                  src={store.imageUrl}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <StoreIcon size={64} className="text-green-300" />
                </div>
              )}
            </div>

            {/* Store Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{store.name}</h1>
              {store.description && (
                <p className="mt-2 text-gray-600">{store.description}</p>
              )}
              <div className="mt-3 flex items-center gap-1">
                {renderStars(store.rating)}
                <span className="ml-1 text-sm font-medium text-gray-700">
                  {store.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">({store.reviewCount} reviews)</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" />
                  <span>
                    {store.address}, {store.city}, {store.state} {store.zipCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} className="shrink-0 text-gray-400" />
                  <span>{store.phone}</span>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:w-64">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Clock size={16} />
                Store hours
              </h3>
              <div className="mt-3 space-y-1.5">
                {getDayHours(store).map(({ day, hours, isToday }) => (
                  <div
                    key={day}
                    className={`flex justify-between text-sm ${
                      isToday ? 'font-semibold text-green-700' : 'text-gray-600'
                    }`}
                  >
                    <span>{day}</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Banner (Feature 6) */}
      {promotions.length > 0 && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={18} className="text-green-600" />
              <h3 className="font-semibold text-green-800">Active Promotions</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="shrink-0 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                      {promo.type === 'PERCENTAGE'
                        ? `${promo.value}% OFF`
                        : promo.type === 'FIXED_AMOUNT'
                        ? `$${promo.value} OFF`
                        : `Buy ${promo.value} Get 1 Free`}
                    </span>
                  </div>
                  {promo.minOrderAmount && (
                    <p className="mt-1 text-xs text-gray-500">
                      Min. order: ${Number(promo.minOrderAmount).toFixed(2)}
                    </p>
                  )}
                  {promo.code && (
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      Use code: <span className="font-bold text-green-600">{promo.code}</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Expires: {new Date(promo.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Buy Again Section (Feature 2) */}
      {buyAgainProducts.length > 0 && (
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw size={18} className="text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Buy Again</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {buyAgainProducts.map((product) => {
                const inCartQty = getCartQuantity(product.id);
                const isOutOfStock = product.stockQuantity <= 0;
                return (
                  <div
                    key={product.id}
                    className="shrink-0 w-40 rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="h-24 overflow-hidden rounded-lg bg-gray-100">
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
                    <h4 className="mt-2 text-sm font-medium text-gray-900 line-clamp-1">
                      {product.name}
                    </h4>
                    <p className="text-sm font-bold text-gray-900">${Number(product.price).toFixed(2)}</p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      <ShoppingCart size={12} />
                      {isOutOfStock ? 'Out of stock' : inCartQty > 0 ? `${inCartQty} in cart` : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-gray-900">Products</h2>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name} ({products.filter((p) => p.categoryId === cat.id).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {productsLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
                <div className="h-32 rounded-lg bg-gray-200" />
                <div className="mt-3 h-5 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
                <div className="mt-3 h-9 rounded-lg bg-gray-200" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-12 text-center">
            <Package size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No products available</h3>
            <p className="mt-1 text-gray-500">
              {selectedCategory !== 'all'
                ? 'No products in this category. Try another.'
                : 'This store has not added any products yet.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const inCartQty = getCartQuantity(product.id);
              const isOutOfStock = product.stockQuantity <= 0;
              const isLowStock =
                product.stockQuantity > 0 &&
                product.stockQuantity <= product.lowStockThreshold;

              return (
                <div
                  key={product.id}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-green-200 hover:shadow-md"
                >
                  {/* Product Image */}
                  <div className="relative h-32 overflow-hidden rounded-lg bg-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={32} className="text-gray-300" />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                          Out of stock
                        </span>
                      </div>
                    )}
                    {isLowStock && !isOutOfStock && (
                      <span className="absolute right-2 top-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Only {product.stockQuantity} left
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="mt-3">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    {product.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                        <span className="text-sm text-gray-400 line-through">
                          ${Number(product.compareAtPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add to Cart */}
                  <div className="mt-3">
                    {inCartQty > 0 ? (
                      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-1.5">
                        <button
                          onClick={() =>
                            dispatch(addToCart({ product, quantity: -1 }))
                          }
                          className="rounded p-1 text-green-700 hover:bg-green-100"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="text-sm font-semibold text-green-700">
                          {inCartQty} in cart
                        </span>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className="rounded p-1 text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock || addingToCart === product.id}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingCart size={16} />
                        {isOutOfStock ? 'Out of stock' : 'Add to cart'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{store.rating.toFixed(1)}</div>
              <div className="mt-1 flex justify-center">{renderStars(store.rating)}</div>
              <p className="mt-1 text-sm text-gray-500">{store.reviewCount} reviews</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <Star size={32} className="mx-auto text-gray-300" />
            <p className="mt-2 text-gray-500">
              Reviews will appear here. Be the first to leave a review!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
