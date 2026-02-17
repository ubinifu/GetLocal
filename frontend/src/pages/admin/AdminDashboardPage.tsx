import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Store,
  ShoppingCart,
  DollarSign,
  ArrowRight,
  BarChart3,
  Tag,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  revenueLastSevenDays: { date: string; revenue: number }[];
  newUsersLast30Days: number;
  newOrdersLast30Days: number;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-indigo-100 text-indigo-700',
  READY: 'bg-green-100 text-green-700',
  PICKED_UP: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await adminService.getDashboardStats();
        setStats(response.data ?? response);
      } catch {
        setError('Failed to load dashboard data.');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const maxRevenue =
    stats?.revenueLastSevenDays && stats.revenueLastSevenDays.length > 0
      ? Math.max(...stats.revenueLastSevenDays.map((d) => Number(d.revenue)))
      : 0;

  const statCards = stats
    ? [
        {
          title: 'Total Users',
          value: stats.totalUsers.toLocaleString(),
          icon: Users,
          color: 'bg-blue-100 text-blue-600',
          link: '/admin/users',
        },
        {
          title: 'Total Stores',
          value: stats.totalStores.toLocaleString(),
          icon: Store,
          color: 'bg-green-100 text-green-600',
          link: '/admin/stores',
        },
        {
          title: 'Total Orders',
          value: stats.totalOrders.toLocaleString(),
          icon: ShoppingCart,
          color: 'bg-purple-100 text-purple-600',
          link: '/admin/orders',
        },
        {
          title: 'Total Revenue',
          value: `$${Number(stats.totalRevenue).toFixed(2)}`,
          icon: DollarSign,
          color: 'bg-yellow-100 text-yellow-600',
          link: '/admin/orders',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-gray-200" />
              ))}
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div className="h-64 rounded-xl bg-gray-200" />
              <div className="h-64 rounded-xl bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Platform overview and management</p>
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

        {stats && (
          <>
            {/* Stats Cards */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => (
                <Link
                  key={card.title}
                  to={card.link}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{card.title}</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${card.color}`}>
                      <card.icon size={24} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Charts Section */}
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              {/* Orders by Status */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <BarChart3 size={18} className="text-gray-500" />
                  Orders by Status
                </h2>
                <div className="mt-4 space-y-3">
                  {stats.ordersByStatus &&
                    Object.entries(stats.ordersByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            STATUS_BADGE_COLORS[status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {status === 'PENDING' && <Clock size={12} />}
                          {status === 'CONFIRMED' && <CheckCircle size={12} />}
                          {status === 'PREPARING' && <Package size={12} />}
                          {status === 'READY' && <CheckCircle size={12} />}
                          {status === 'PICKED_UP' && <ShoppingCart size={12} />}
                          {status === 'CANCELLED' && <XCircle size={12} />}
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  {(!stats.ordersByStatus ||
                    Object.keys(stats.ordersByStatus).length === 0) && (
                    <p className="py-4 text-center text-sm text-gray-400">
                      No order data available
                    </p>
                  )}
                </div>
              </div>

              {/* Revenue Last 7 Days */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <DollarSign size={18} className="text-gray-500" />
                  Revenue Last 7 Days
                </h2>
                <div className="mt-4 flex items-end gap-2" style={{ height: '180px' }}>
                  {stats.revenueLastSevenDays && stats.revenueLastSevenDays.length > 0 ? (
                    stats.revenueLastSevenDays.map((day) => {
                      const revenue = Number(day.revenue);
                      const heightPercent = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                      const dateLabel = new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                      });
                      return (
                        <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            ${revenue.toFixed(0)}
                          </span>
                          <div
                            className="w-full rounded-t-md bg-emerald-500 transition-all"
                            style={{
                              height: `${Math.max(heightPercent, 4)}%`,
                              minHeight: '4px',
                            }}
                          />
                          <span className="text-xs text-gray-500">{dateLabel}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex w-full items-center justify-center">
                      <p className="text-sm text-gray-400">No revenue data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity + Quick Links */}
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              {/* Recent Activity */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-2">
                        <Users size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">New Users</p>
                        <p className="text-xs text-gray-500">Last 30 days</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.newUsersLast30Days ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-100 p-2">
                        <ShoppingCart size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">New Orders</p>
                        <p className="text-xs text-gray-500">Last 30 days</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.newOrdersLast30Days ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900">Quick Links</h2>
                <div className="mt-4 space-y-3">
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">User Management</p>
                      <p className="text-xs text-gray-500">Manage users and roles</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </Link>

                  <Link
                    to="/admin/stores"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="rounded-lg bg-green-100 p-2">
                      <Store size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Store Management</p>
                      <p className="text-xs text-gray-500">Manage stores and approvals</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </Link>

                  <Link
                    to="/admin/orders"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="rounded-lg bg-purple-100 p-2">
                      <ShoppingCart size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Order Management</p>
                      <p className="text-xs text-gray-500">View and manage all orders</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </Link>

                  <Link
                    to="/admin/categories"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="rounded-lg bg-yellow-100 p-2">
                      <Tag size={20} className="text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Category Management</p>
                      <p className="text-xs text-gray-500">Manage product categories</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
