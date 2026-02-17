import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  ShoppingBag,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { orderService } from '@/services/order.service';
import { useAuth } from '@/hooks/useAuth';
import type { Order, OrderStatus } from '@/types';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: CheckCircle,
  },
  PREPARING: {
    label: 'Preparing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: ChefHat,
  },
  READY: { label: 'Ready', color: 'text-green-700', bgColor: 'bg-green-100', icon: Package },
  PICKED_UP: {
    label: 'Picked Up',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: ShoppingBag,
  },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
};

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [reordering, setReordering] = useState<string | null>(null);

  const handleReorder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setReordering(orderId);
      const response = await orderService.reorder(orderId);
      toast.success('Order placed again!');
      navigate(`/orders/${response.data.id}`);
    } catch {
      toast.error('Failed to reorder. Please try again.');
    } finally {
      setReordering(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await orderService.getOrders();
        setOrders(response.data ?? []);
      } catch {
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, navigate]);

  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case 'active':
        return ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status);
      case 'completed':
        return order.status === 'PICKED_UP';
      case 'cancelled':
        return order.status === 'CANCELLED';
      default:
        return true;
    }
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-40 rounded bg-gray-200" />
            <div className="mt-6 flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-24 rounded-lg bg-gray-200" />
              ))}
            </div>
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-gray-200" />
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
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Orders</h1>

        {/* Filter Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count = orders.filter((o) => {
              switch (tab.key) {
                case 'active':
                  return ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status);
                case 'completed':
                  return o.status === 'PICKED_UP';
                case 'cancelled':
                  return o.status === 'CANCELLED';
                default:
                  return true;
              }
            }).length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          </div>
        )}

        {/* Orders List */}
        <div className="mt-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={56} className="mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No orders found</h3>
              <p className="mt-2 text-gray-500">
                {activeTab === 'all'
                  ? "You haven't placed any orders yet."
                  : `No ${activeTab} orders.`}
              </p>
              {activeTab === 'all' && (
                <button
                  onClick={() => navigate('/stores')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700"
                >
                  <ShoppingBag size={18} />
                  Browse stores
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => {
              const statusInfo = STATUS_CONFIG[order.status];
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-green-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </div>
                      {order.store && (
                        <p className="mt-1 text-sm text-gray-600">{order.store.name}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">
                          ${Number(order.total).toFixed(2)}
                        </span>
                        {order.items && (
                          <p className="mt-0.5 text-sm text-gray-500">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {order.status === 'PICKED_UP' && (
                        <button
                          onClick={(e) => handleReorder(order.id, e)}
                          disabled={reordering === order.id}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                        >
                          {reordering === order.id ? (
                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <RotateCcw size={12} />
                          )}
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
