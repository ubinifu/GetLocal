import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShoppingCart,
  Package,
  Star,
  ArrowRight,
  Store as StoreIcon,
  Apple,
  Coffee,
  Milk,
  Sandwich,
  Pill,
  ShoppingBag,
} from 'lucide-react';
import { storeService } from '@/services/store.service';
import type { Store } from '@/types';

const CATEGORIES = [
  { name: 'Groceries', icon: ShoppingBag, color: 'bg-green-100 text-green-600' },
  { name: 'Snacks', icon: Apple, color: 'bg-orange-100 text-orange-600' },
  { name: 'Beverages', icon: Coffee, color: 'bg-amber-100 text-amber-600' },
  { name: 'Dairy', icon: Milk, color: 'bg-blue-100 text-blue-600' },
  { name: 'Deli', icon: Sandwich, color: 'bg-red-100 text-red-600' },
  { name: 'Health', icon: Pill, color: 'bg-purple-100 text-purple-600' },
];

const STEPS = [
  {
    icon: Search,
    title: 'Browse',
    description: 'Discover local corner stores near you and explore their products.',
  },
  {
    icon: ShoppingCart,
    title: 'Order',
    description: 'Add items to your cart and place your order in just a few taps.',
  },
  {
    icon: Package,
    title: 'Pickup',
    description: 'Head to the store when your order is ready and grab your items.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const response = await storeService.getStores({ limit: 6 });
        setFeaturedStores(response.data ?? []);
      } catch {
        // Silently fail for featured stores - not critical
        setFeaturedStores([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/stores?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/stores');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-green-600 via-green-700 to-emerald-800 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Fresh finds from your{' '}
              <span className="text-green-200">neighborhood stores</span>
            </h1>
            <p className="mt-6 text-lg text-green-100 sm:text-xl">
              Support your local corner stores. Browse products, place orders, and pick up when
              it's ready -- all from your phone.
            </p>
            <form onSubmit={handleSearch} className="mx-auto mt-10 max-w-xl">
              <div className="flex overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex flex-1 items-center px-4">
                  <Search size={20} className="shrink-0 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search stores or products near you..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-none px-3 py-4 text-gray-900 placeholder-gray-400 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="m-1.5 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-gray-600">
              Getting your favorite local products is easier than ever.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                  <step.icon size={28} className="text-green-600" />
                </div>
                <div className="absolute -top-2 left-1/2 flex h-7 w-7 translate-x-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">Shop by category</h2>
            <Link
              to="/stores"
              className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((category) => (
              <Link
                key={category.name}
                to={`/stores?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center rounded-xl border border-gray-200 p-6 transition-all hover:border-green-300 hover:shadow-md"
              >
                <div className={`rounded-xl p-3 ${category.color}`}>
                  <category.icon size={24} />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-900 group-hover:text-green-600">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">Featured stores</h2>
            <Link
              to="/stores"
              className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
            >
              View all stores <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="h-40 rounded-lg bg-gray-200" />
                    <div className="mt-4 h-5 w-3/4 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
                  </div>
                ))
              : featuredStores.map((store) => (
                  <Link
                    key={store.id}
                    to={`/stores/${store.id}`}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-green-300 hover:shadow-lg"
                  >
                    <div className="relative h-40 bg-linear-to-br from-green-100 to-emerald-50">
                      {store.imageUrl ? (
                        <img
                          src={store.imageUrl}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <StoreIcon size={48} className="text-green-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                        {store.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1">
                        {renderStars(store.rating)}
                        <span className="ml-1 text-sm text-gray-500">
                          ({store.reviewCount})
                        </span>
                      </div>
                      <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-500">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span>
                          {store.address}, {store.city}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
          {!loading && featuredStores.length === 0 && (
            <div className="mt-8 text-center">
              <StoreIcon size={48} className="mx-auto text-gray-300" />
              <p className="mt-4 text-gray-500">No stores available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-700 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <StoreIcon size={40} className="mx-auto text-green-200" />
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Own a corner store?
            </h2>
            <p className="mt-4 text-lg text-green-100">
              Join GetLocal and reach more customers in your neighborhood. Manage your inventory,
              receive orders, and grow your business -- all from one simple dashboard.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="rounded-lg bg-white px-8 py-3 font-semibold text-green-700 transition-colors hover:bg-green-50"
              >
                Sign up as a store owner
              </Link>
              <Link
                to="/stores"
                className="rounded-lg border-2 border-green-400 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-600"
              >
                Explore stores
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
