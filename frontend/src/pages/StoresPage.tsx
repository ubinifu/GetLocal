import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Star,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Store as StoreIcon,
  Clock,
} from 'lucide-react';
import { storeService } from '@/services/store.service';
import type { Store } from '@/types';

export default function StoresPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    rating: 0,
    openNow: false,
    distance: 10,
  });

  const fetchStores = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await storeService.getStores({
        page,
        limit: 12,
        search: searchQuery.trim() || undefined,
      });
      setStores(response.data ?? []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    fetchStores(1);
  }, [fetchStores]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(searchQuery ? { search: searchQuery } : {});
    fetchStores(1);
  };

  const handlePageChange = (page: number) => {
    fetchStores(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({ rating: 0, openNow: false, distance: 10 });
    setSearchQuery('');
    setSearchParams({});
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));

  const isStoreOpen = (store: Store): boolean => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];
    const todayHours = store.hours?.[today];
    if (!todayHours) return false;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  };

  const StoreSkeleton = () => (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white">
      <div className="h-40 rounded-t-xl bg-gray-200" />
      <div className="p-4">
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Browse stores</h1>
          <form onSubmit={handleSearch} className="mt-4 flex gap-3">
            <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20">
              <Search size={18} className="ml-3 shrink-0 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-none px-3 py-2.5 text-gray-900 placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchParams({});
                  }}
                  className="mr-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-green-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium transition-colors ${
                showFilters
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-end gap-6">
                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Minimum rating
                  </label>
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            rating: prev.rating === r ? 0 : r,
                          }))
                        }
                        className="p-1"
                      >
                        <Star
                          size={20}
                          className={
                            r <= filters.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-300'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Distance: {filters.distance} mi
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={filters.distance}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, distance: Number(e.target.value) }))
                    }
                    className="mt-2 w-40 accent-green-600"
                  />
                </div>

                {/* Open Now Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, openNow: !prev.openNow }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      filters.openNow ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        filters.openNow ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700">Open now</span>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stores Grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoreSkeleton key={i} />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="py-20 text-center">
            <StoreIcon size={56} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No stores found</h3>
            <p className="mt-2 text-gray-500">
              {searchQuery
                ? `No stores match "${searchQuery}". Try a different search term.`
                : 'No stores are available in your area yet. Check back soon!'}
            </p>
            {(searchQuery || filters.rating > 0 || filters.openNow) && (
              <button
                onClick={clearFilters}
                className="mt-4 font-medium text-green-600 hover:text-green-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              Showing {stores.length} of {pagination.total} stores
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => {
                const open = isStoreOpen(store);
                return (
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
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          open
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {open ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                        {store.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1">
                        {renderStars(store.rating)}
                        <span className="ml-1 text-sm text-gray-500">
                          {store.rating.toFixed(1)} ({store.reviewCount})
                        </span>
                      </div>
                      <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-500">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span>
                          {store.address}, {store.city}, {store.state}
                        </span>
                      </div>
                      {store.phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                          <Clock size={14} className="shrink-0" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      const current = pagination.page;
                      return p === 1 || p === pagination.totalPages || Math.abs(p - current) <= 1;
                    })
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`min-w-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            p === pagination.page
                              ? 'bg-green-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
