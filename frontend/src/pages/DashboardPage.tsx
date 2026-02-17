import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  Package,
  ArrowRight,
  BarChart3,
  Store as StoreIcon,
  AlertCircle,
  Tag,
  Plus,
  Trash2,
  Edit3,
  Plug,
} from 'lucide-react';
import { orderService } from '@/services/order.service';
import { storeService } from '@/services/store.service';
import { promotionService } from '@/services/promotion.service';
import { useAuth } from '@/hooks/useAuth';
import type { Order, Store, OrderStatus, Promotion, CreatePromotionData } from '@/types';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalOrders: number;
  revenue: number;
  avgOrderValue: number;
  pendingOrders: number;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  READY: 'bg-green-100 text-green-700',
  PICKED_UP: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    revenue: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Promotions state (Feature 6)
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState<CreatePromotionData>({
    code: '',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: undefined,
    maxUses: undefined,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isActive: true,
  });
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'STORE_OWNER' && user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch owner's stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await storeService.getMyStores();
        if (response.data) {
          const storeList = response.data;
          setStores(storeList);
          if (storeList.length > 0 && !selectedStoreId) {
            setSelectedStoreId(storeList[0].id);
          }
        }
      } catch {
        setError('Failed to load your stores.');
      }
    };

    if (user?.id) {
      fetchStores();
    }
  }, [user?.id, selectedStoreId]);

  // Fetch stats and orders for selected store
  useEffect(() => {
    if (!selectedStoreId) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Try fetching order stats
        let fetchedStats: DashboardStats | null = null;
        try {
          const statsResponse = await orderService.getOrderStats(selectedStoreId);
          if (statsResponse.data) {
            const raw = statsResponse.data as any;
            fetchedStats = {
              totalOrders: raw.totalOrders ?? 0,
              revenue: raw.totalRevenue ?? 0,
              avgOrderValue: raw.averageOrderValue ?? 0,
              pendingOrders: raw.pendingOrders ?? raw.ordersByStatus?.PENDING ?? 0,
            };
          }
        } catch {
          // Stats endpoint may not be implemented; compute from orders
        }

        // Fetch recent orders
        const ordersResponse = await orderService.getOrders({
          storeId: selectedStoreId,
          limit: 5,
        });
        const orderList: Order[] = ordersResponse.data ?? [];
        setRecentOrders(orderList);

        // Compute stats from orders if stats endpoint didn't work
        if (fetchedStats) {
          setStats(fetchedStats);
        } else {
          const totalOrders = orderList.length;
          const revenue = orderList
            .filter((o) => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + o.total, 0);
          const nonCancelledOrders = orderList.filter((o) => o.status !== 'CANCELLED');
          const avgOrderValue =
            nonCancelledOrders.length > 0 ? revenue / nonCancelledOrders.length : 0;
          const pendingOrders = orderList.filter((o) => o.status === 'PENDING').length;
          setStats({ totalOrders, revenue, avgOrderValue, pendingOrders });
        }
        // Fetch promotions
        try {
          const promosResponse = await promotionService.getStorePromotions(selectedStoreId);
          const promosData = (promosResponse as any).data;
          setPromotions(Array.isArray(promosData) ? promosData : promosData?.data ?? []);
        } catch {
          // Promotions optional
        }
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedStoreId]);

  const handleCreatePromotion = async () => {
    if (!selectedStoreId) return;
    try {
      setCreatingPromo(true);
      const response = await promotionService.createPromotion(selectedStoreId, promoForm);
      setPromotions((prev) => [...prev, response.data]);
      setShowPromoForm(false);
      setPromoForm({
        code: '',
        type: 'PERCENTAGE',
        value: 10,
        minOrderAmount: undefined,
        maxUses: undefined,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        isActive: true,
      });
      toast.success('Promotion created!');
    } catch {
      toast.error('Failed to create promotion');
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this promotion?');
    if (!confirmed) return;
    try {
      setDeletingPromoId(id);
      await promotionService.deletePromotion(id);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      toast.success('Promotion deleted');
    } catch {
      toast.error('Failed to delete promotion');
    } finally {
      setDeletingPromoId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Revenue',
      value: `$${Number(stats.revenue).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Avg Order Value',
      value: `$${Number(stats.avgOrderValue).toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  if (loading && stores.length === 0) {
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
            <div className="mt-8 h-64 rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Welcome back, {user?.firstName}! Here is your store overview.
            </p>
          </div>

          {/* Store Selector */}
          {stores.length > 1 && (
            <div className="flex items-center gap-2">
              <StoreIcon size={18} className="text-gray-400" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

        {/* Stats Cards */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
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
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                <Link
                  to="/dashboard/orders"
                  className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div className="animate-pulse space-y-4 p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <Package size={40} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No orders yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to="/dashboard/orders"
                      className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[order.status]
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Quick Links</h2>
              <div className="mt-4 space-y-3">
                <Link
                  to="/dashboard/products"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-green-300 hover:bg-green-50"
                >
                  <div className="rounded-lg bg-green-100 p-2">
                    <Package size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Product Management</p>
                    <p className="text-xs text-gray-500">Manage your inventory</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>

                <Link
                  to="/dashboard/orders"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-green-300 hover:bg-green-50"
                >
                  <div className="rounded-lg bg-blue-100 p-2">
                    <ShoppingCart size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Order Management</p>
                    <p className="text-xs text-gray-500">Process incoming orders</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>

                <Link
                  to="/stores"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-green-300 hover:bg-green-50"
                >
                  <div className="rounded-lg bg-purple-100 p-2">
                    <BarChart3 size={20} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">View Store Page</p>
                    <p className="text-xs text-gray-500">See your public storefront</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>

                <Link
                  to="/dashboard/integrations"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-green-300 hover:bg-green-50"
                >
                  <div className="rounded-lg bg-orange-100 p-2">
                    <Plug size={20} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Integrations</p>
                    <p className="text-xs text-gray-500">Connect POS and inventory systems</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Promotions Card (Feature 6) */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Tag size={16} className="text-green-600" />
                  Promotions
                </h2>
                <button
                  onClick={() => setShowPromoForm(!showPromoForm)}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  <Plus size={14} />
                  New
                </button>
              </div>

              {/* Create Promotion Form */}
              {showPromoForm && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-700">Create Promotion</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Coupon Code</label>
                      <input
                        type="text"
                        value={promoForm.code || ''}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })
                        }
                        placeholder="e.g., SAVE10"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Type</label>
                        <select
                          value={promoForm.type}
                          onChange={(e) =>
                            setPromoForm({
                              ...promoForm,
                              type: e.target.value as CreatePromotionData['type'],
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                        >
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FIXED_AMOUNT">Fixed Amount</option>
                          <option value="BUY_X_GET_Y">Buy X Get Y</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          Value {promoForm.type === 'PERCENTAGE' ? '(%)' : '($)'}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={promoForm.value}
                          onChange={(e) =>
                            setPromoForm({ ...promoForm, value: parseFloat(e.target.value) || 0 })
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">
                        Min Order Amount ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={promoForm.minOrderAmount || ''}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            minOrderAmount: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder="No minimum"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Start Date</label>
                        <input
                          type="date"
                          value={promoForm.startDate}
                          onChange={(e) =>
                            setPromoForm({ ...promoForm, startDate: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">End Date</label>
                        <input
                          type="date"
                          value={promoForm.endDate}
                          onChange={(e) =>
                            setPromoForm({ ...promoForm, endDate: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleCreatePromotion}
                        disabled={creatingPromo}
                        className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {creatingPromo ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        onClick={() => setShowPromoForm(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Promotions List */}
              <div className="mt-4 space-y-2">
                {promotions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">
                    No promotions yet. Create one to attract customers!
                  </p>
                ) : (
                  promotions.map((promo) => (
                    <div
                      key={promo.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            {promo.type === 'PERCENTAGE'
                              ? `${promo.value}%`
                              : promo.type === 'FIXED_AMOUNT'
                              ? `$${promo.value}`
                              : `B${promo.value}G1`}
                          </span>
                          {promo.code && (
                            <span className="text-sm font-medium text-gray-900">{promo.code}</span>
                          )}
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              promo.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {new Date(promo.startDate).toLocaleDateString()} -{' '}
                          {new Date(promo.endDate).toLocaleDateString()}
                          {promo.currentUses > 0 && ` | ${promo.currentUses} uses`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePromotion(promo.id)}
                        disabled={deletingPromoId === promo.id}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Store Info Card */}
            {stores.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900">Store Info</h2>
                {(() => {
                  const currentStore = stores.find((s) => s.id === selectedStoreId);
                  if (!currentStore) return null;
                  return (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="font-medium text-gray-900">{currentStore.name}</p>
                      <p className="text-gray-600">{currentStore.address}</p>
                      <p className="text-gray-600">
                        {currentStore.city}, {currentStore.state} {currentStore.zipCode}
                      </p>
                      <p className="text-gray-600">{currentStore.phone}</p>
                      <div className="flex items-center gap-1 pt-1">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            currentStore.isActive ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-xs text-gray-500">
                          {currentStore.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
