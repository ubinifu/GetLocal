import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import type { OrderStatus } from '@/types';
import toast from 'react-hot-toast';

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number | string;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  store?: {
    id: string;
    name: string;
  };
}

const STATUS_BADGE_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-indigo-100 text-indigo-700',
  READY: 'bg-green-100 text-green-700',
  PICKED_UP: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY: CheckCircle,
  PICKED_UP: ShoppingCart,
  CANCELLED: XCircle,
};

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'CANCELLED',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [debouncedStoreSearch, setDebouncedStoreSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce store search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStoreSearch(storeSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [storeSearch]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: {
        page: number;
        limit: number;
        status?: string;
        storeId?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
      } = {
        page,
        limit: 15,
      };
      if (statusFilter) params.status = statusFilter;
      if (debouncedStoreSearch) params.search = debouncedStoreSearch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const result = await adminService.getOrders(params);
      if (Array.isArray(result)) {
        setOrders(result);
        setTotalPages(1);
      } else if (result && typeof result === 'object') {
        setOrders(result.orders ?? result.data ?? []);
        setTotalPages(result.pagination?.totalPages ?? result.totalPages ?? 1);
      }
    } catch {
      setError('Failed to load orders.');
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedStoreSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          </div>
          <p className="mt-1 text-gray-600">View all platform orders</p>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              placeholder="Search by store or customer..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
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
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-200" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 text-center">
            <ShoppingCart size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No orders found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Store
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const StatusIcon = STATUS_ICONS[order.status] || Clock;
                    return (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <Link
                            to={`/orders/${order.id}`}
                            className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`
                            : 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {order.store?.name ?? 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_BADGE_COLORS[order.status]
                            }`}
                          >
                            <StatusIcon size={12} />
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          ${Number(order.total).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mt-6 space-y-3 lg:hidden">
              {orders.map((order) => {
                const StatusIcon = STATUS_ICONS[order.status] || Clock;
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-medium text-emerald-600 hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`
                            : 'Unknown'}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_COLORS[order.status]
                        }`}
                      >
                        <StatusIcon size={12} />
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.store?.name ?? 'Unknown store'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
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
