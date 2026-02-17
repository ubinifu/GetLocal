import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Star,
  MapPin,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import toast from 'react-hot-toast';

interface AdminStore {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    products?: number;
    orders?: number;
  };
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: { page: number; limit: number; isActive?: boolean; search?: string } = {
        page,
        limit: 10,
      };
      if (activeFilter === 'true') params.isActive = true;
      if (activeFilter === 'false') params.isActive = false;
      if (debouncedSearch) params.search = debouncedSearch;

      const result = await adminService.getStores(params);
      if (Array.isArray(result)) {
        setStores(result);
        setTotalPages(1);
      } else if (result && typeof result === 'object') {
        setStores(result.stores ?? result.data ?? []);
        setTotalPages(result.pagination?.totalPages ?? result.totalPages ?? 1);
      }
    } catch {
      setError('Failed to load stores.');
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter, debouncedSearch]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleToggleActive = async (storeId: string, currentActive: boolean) => {
    try {
      setTogglingId(storeId);
      await adminService.updateStore(storeId, { isActive: !currentActive });
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId ? { ...s, isActive: !currentActive } : s
        )
      );
      toast.success(`Store ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update store status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (storeId: string, storeName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete store "${storeName}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await adminService.deleteStore(storeId);
      setStores((prev) => prev.filter((s) => s.id !== storeId));
      toast.success('Store deleted');
    } catch {
      toast.error('Failed to delete store');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="text-sm text-gray-500 hover:text-emerald-600"
            >
              Admin
            </Link>
            <span className="text-sm text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          </div>
          <p className="mt-1 text-gray-600">Manage platform stores</p>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Status:</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="mt-6 animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-200" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="mt-12 text-center">
            <Store size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No stores found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Store Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Location
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Products
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stores.map((store) => (
                    <tr
                      key={store.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          to={`/stores/${store.id}`}
                          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          {store.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {store.owner
                          ? `${store.owner.firstName} ${store.owner.lastName}`
                          : 'Unknown'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin size={14} className="text-gray-400" />
                          {store.city}, {store.state}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 text-sm">
                          <Star
                            size={14}
                            className="fill-yellow-400 text-yellow-400"
                          />
                          <span className="font-medium text-gray-900">
                            {Number(store.rating).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {store._count?.products ?? 0}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {store._count?.orders ?? 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(store.id, store.isActive)}
                          disabled={togglingId === store.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                            store.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                          title={store.isActive ? 'Deactivate store' : 'Activate store'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              store.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(store.id, store.name)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete store"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mt-6 space-y-3 lg:hidden">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/stores/${store.id}`}
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        {store.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {store.owner
                          ? `${store.owner.firstName} ${store.owner.lastName}`
                          : 'Unknown owner'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(store.id, store.isActive)}
                      disabled={togglingId === store.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        store.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          store.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {store.city}, {store.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      {Number(store.rating).toFixed(1)}
                    </span>
                    <span>{store._count?.products ?? 0} products</span>
                    <span>{store._count?.orders ?? 0} orders</span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleDelete(store.id, store.name)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
