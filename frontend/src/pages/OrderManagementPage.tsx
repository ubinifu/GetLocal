import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Package,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertCircle,
  MessageCircle,
  Send,
  UserCheck,
  ShieldCheck,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { orderService } from '@/services/order.service';
import { messageService } from '@/services/message.service';
import { storeService } from '@/services/store.service';
import { useAuth } from '@/hooks/useAuth';
import type { Order, OrderStatus, Store, Message } from '@/types';
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

type FilterTab = 'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PENDING: { status: 'CONFIRMED', label: 'Confirm Order' },
  CONFIRMED: { status: 'PREPARING', label: 'Start Preparing' },
  PREPARING: { status: 'READY', label: 'Mark Ready' },
};

const SUBSTITUTION_LABELS: Record<string, string> = {
  REMOVE: 'Remove item',
  BEST_MATCH: 'Best match',
  SPECIFIC_ITEM: 'Specific substitute',
};

export default function OrderManagementPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Feature 4: Verify pickup
  const [verifyCode, setVerifyCode] = useState<Record<string, string>>({});
  const [verifyingPickup, setVerifyingPickup] = useState<string | null>(null);

  // Feature 5: Estimated time
  const [estimatedMinutes, setEstimatedMinutes] = useState<Record<string, number>>({});
  const [settingTime, setSettingTime] = useState<string | null>(null);

  // Feature 3: Messaging
  const [messageOrderId, setMessageOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'STORE_OWNER' && user?.role !== 'ADMIN')) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch stores
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
        setError('Failed to load stores');
      }
    };
    if (user?.id) fetchStores();
  }, [user?.id, selectedStoreId]);

  // Fetch orders
  useEffect(() => {
    if (!selectedStoreId) return;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await orderService.getOrders({ storeId: selectedStoreId });
        setOrders(response.data ?? []);
      } catch {
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [selectedStoreId]);

  // Fetch messages for the selected order
  useEffect(() => {
    if (!messageOrderId) return;
    const fetchMessages = async () => {
      try {
        const response = await messageService.getMessages(messageOrderId);
        setMessages(response.data ?? []);
      } catch {
        // Messages may not be available
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [messageOrderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case 'pending':
        return order.status === 'PENDING';
      case 'confirmed':
        return order.status === 'CONFIRMED';
      case 'preparing':
        return order.status === 'PREPARING';
      case 'ready':
        return order.status === 'READY';
      case 'completed':
        return order.status === 'PICKED_UP' || order.status === 'CANCELLED';
      default:
        return true;
    }
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(orderId);
      await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleConfirmWithTime = async (orderId: string) => {
    const minutes = estimatedMinutes[orderId] || 15;
    try {
      setUpdatingStatus(orderId);
      // First confirm, then set estimated time
      await orderService.updateOrderStatus(orderId, 'CONFIRMED');
      await orderService.setEstimatedTime(orderId, minutes);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const readyTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            return { ...o, status: 'CONFIRMED' as OrderStatus, estimatedReadyTime: readyTime };
          }
          return o;
        })
      );
      toast.success(`Order confirmed! Estimated ready in ${minutes} minutes.`);
    } catch {
      toast.error('Failed to confirm order');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;

    try {
      setUpdatingStatus(orderId);
      await orderService.updateOrderStatus(orderId, 'CANCELLED');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' as OrderStatus } : o))
      );
      toast.success('Order cancelled');
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleVerifyPickup = async (orderId: string) => {
    const code = verifyCode[orderId]?.trim();
    if (!code) {
      toast.error('Please enter the pickup code');
      return;
    }
    try {
      setVerifyingPickup(orderId);
      await orderService.verifyPickup(orderId, code);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'PICKED_UP' as OrderStatus } : o))
      );
      toast.success('Pickup verified! Order completed.');
      setVerifyCode((prev) => ({ ...prev, [orderId]: '' }));
    } catch {
      toast.error('Invalid pickup code. Please try again.');
    } finally {
      setVerifyingPickup(null);
    }
  };

  const handleSetEstimatedTime = async (orderId: string) => {
    const minutes = estimatedMinutes[orderId] || 15;
    try {
      setSettingTime(orderId);
      await orderService.setEstimatedTime(orderId, minutes);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const readyTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            return { ...o, estimatedReadyTime: readyTime };
          }
          return o;
        })
      );
      toast.success(`Estimated ready time set to ${minutes} minutes`);
    } catch {
      toast.error('Failed to set estimated time');
    } finally {
      setSettingTime(null);
    }
  };

  const handleSendMessage = async () => {
    if (!messageOrderId || !newMessage.trim()) return;
    try {
      setSendingMessage(true);
      const response = await messageService.sendMessage(messageOrderId, newMessage.trim());
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
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

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTabCount = (tab: FilterTab): number => {
    return orders.filter((order) => {
      switch (tab) {
        case 'pending':
          return order.status === 'PENDING';
        case 'confirmed':
          return order.status === 'CONFIRMED';
        case 'preparing':
          return order.status === 'PREPARING';
        case 'ready':
          return order.status === 'READY';
        case 'completed':
          return order.status === 'PICKED_UP' || order.status === 'CANCELLED';
        default:
          return true;
      }
    }).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-green-600"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Order Management</h1>
          </div>
          {stores.length > 1 && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label} ({getTabCount(tab.key)})
            </button>
          ))}
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

        {/* Orders Table */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex gap-4">
                    <div className="h-5 w-24 rounded bg-gray-200" />
                    <div className="h-5 w-20 rounded bg-gray-200" />
                    <div className="flex-1" />
                    <div className="h-5 w-16 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={56} className="mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No orders found</h3>
              <p className="mt-2 text-gray-500">
                {activeTab === 'all'
                  ? 'No orders have been placed yet.'
                  : `No ${activeTab} orders at the moment.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const statusInfo = STATUS_CONFIG[order.status];
                const StatusIcon = statusInfo.icon;
                const nextAction = NEXT_STATUS[order.status];
                const isExpanded = expandedOrder === order.id;
                const isUpdating = updatingStatus === order.id;

                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    {/* Customer Arrived Indicator (Feature 4) */}
                    {order.customerCheckedIn && order.status === 'READY' && (
                      <div className="flex items-center gap-2 rounded-t-xl bg-green-50 px-5 py-2 border-b border-green-200">
                        <UserCheck size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          Customer has arrived!
                        </span>
                      </div>
                    )}

                    {/* Order Row */}
                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                      {/* Order Info */}
                      <div className="flex flex-1 items-center gap-4">
                        <button
                          onClick={() =>
                            setExpandedOrder(isExpanded ? null : order.id)
                          }
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              #{order.orderNumber}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                            >
                              <StatusIcon size={12} />
                              {statusInfo.label}
                            </span>
                            {order.customerCheckedIn && order.status === 'READY' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                <UserCheck size={10} />
                                Arrived
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                            {order.items && (
                              <span className="ml-2">
                                -- {order.items.length} item
                                {order.items.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-right sm:w-24">
                        <span className="text-lg font-bold text-gray-900">
                          ${Number(order.total).toFixed(2)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 sm:ml-4">
                        {/* Message button */}
                        <button
                          onClick={() =>
                            setMessageOrderId(
                              messageOrderId === order.id ? null : order.id
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <MessageCircle size={14} />
                          Chat
                        </button>

                        {/* Confirm with estimated time for PENDING orders */}
                        {order.status === 'PENDING' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={estimatedMinutes[order.id] || 15}
                              onChange={(e) =>
                                setEstimatedMinutes((prev) => ({
                                  ...prev,
                                  [order.id]: parseInt(e.target.value) || 15,
                                }))
                              }
                              className="w-14 rounded-lg border border-gray-300 px-2 py-2 text-xs text-center outline-none focus:border-green-500"
                              placeholder="min"
                            />
                            <span className="text-xs text-gray-500">min</span>
                            <button
                              onClick={() => handleConfirmWithTime(order.id)}
                              disabled={isUpdating}
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <CheckCircle size={14} />
                              )}
                              Confirm
                            </button>
                          </div>
                        ) : nextAction ? (
                          <button
                            onClick={() =>
                              handleStatusUpdate(order.id, nextAction.status)
                            }
                            disabled={isUpdating}
                            className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                          >
                            {isUpdating ? (
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            {nextAction.label}
                          </button>
                        ) : null}

                        {/* Verify Pickup for READY orders (Feature 4) */}
                        {order.status === 'READY' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={verifyCode[order.id] || ''}
                              onChange={(e) =>
                                setVerifyCode((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value.toUpperCase(),
                                }))
                              }
                              placeholder="Code"
                              className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-xs text-center uppercase outline-none focus:border-green-500"
                            />
                            <button
                              onClick={() => handleVerifyPickup(order.id)}
                              disabled={verifyingPickup === order.id}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                            >
                              <ShieldCheck size={14} />
                              Verify
                            </button>
                          </div>
                        )}

                        {['PENDING', 'CONFIRMED'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={isUpdating}
                            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Panel (Feature 3) */}
                    {messageOrderId === order.id && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <MessageCircle size={14} />
                          Customer Messages
                        </h4>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
                          {messages.length === 0 ? (
                            <p className="py-4 text-center text-xs text-gray-400">
                              No messages yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {messages.map((msg) => {
                                const isOwn = msg.senderId === user?.id;
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[75%] rounded-2xl px-3 py-1.5 ${
                                        isOwn
                                          ? 'bg-green-600 text-white'
                                          : 'bg-gray-100 text-gray-900'
                                      }`}
                                    >
                                      {!isOwn && msg.sender && (
                                        <p className="mb-0.5 text-xs font-medium text-gray-500">
                                          {msg.sender.firstName}
                                        </p>
                                      )}
                                      <p className="text-sm">{msg.content}</p>
                                      <p
                                        className={`mt-0.5 text-xs ${
                                          isOwn ? 'text-green-200' : 'text-gray-400'
                                        }`}
                                      >
                                        {formatMessageTime(msg.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={messagesEndRef} />
                            </div>
                          )}
                        </div>
                        {!['PICKED_UP', 'CANCELLED'].includes(order.status) && (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder="Reply to customer..."
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={sendingMessage || !newMessage.trim()}
                              className="rounded-lg bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-5">
                        {order.items && order.items.length > 0 ? (
                          <div>
                            <h4 className="mb-3 text-sm font-semibold text-gray-700">
                              Order Items
                            </h4>
                            <div className="rounded-lg border border-gray-200 bg-white">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    <th className="px-4 py-2">Product</th>
                                    <th className="px-4 py-2 text-center">Qty</th>
                                    <th className="px-4 py-2 text-right">Price</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                    <th className="px-4 py-2 text-right">If Unavailable</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {order.items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {item.product?.name ||
                                          `Product #${item.productId.slice(0, 8)}`}
                                      </td>
                                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                                        {item.quantity}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-600">
                                        ${Number(item.unitPrice).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                        ${Number(item.totalPrice).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {item.substitutionPreference ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                            <RefreshCw size={10} />
                                            {SUBSTITUTION_LABELS[item.substitutionPreference] || item.substitutionPreference}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400">--</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No item details available.
                          </p>
                        )}

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <span className="text-xs font-medium uppercase text-gray-500">
                              Subtotal
                            </span>
                            <p className="text-sm font-medium text-gray-900">
                              ${Number(order.subtotal).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium uppercase text-gray-500">
                              Tax
                            </span>
                            <p className="text-sm font-medium text-gray-900">
                              ${Number(order.tax).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium uppercase text-gray-500">
                              Total
                            </span>
                            <p className="text-sm font-bold text-gray-900">
                              ${Number(order.total).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Estimated Ready Time (Feature 5) */}
                        {['CONFIRMED', 'PREPARING'].includes(order.status) && (
                          <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                            <Timer size={16} className="text-blue-600" />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-blue-700">
                                Est. ready time:
                              </span>
                              <input
                                type="number"
                                min={5}
                                max={120}
                                value={estimatedMinutes[order.id] || 15}
                                onChange={(e) =>
                                  setEstimatedMinutes((prev) => ({
                                    ...prev,
                                    [order.id]: parseInt(e.target.value) || 15,
                                  }))
                                }
                                className="w-16 rounded border border-blue-200 px-2 py-1 text-sm text-center outline-none focus:border-blue-500"
                              />
                              <span className="text-sm text-blue-600">minutes</span>
                              <button
                                onClick={() => handleSetEstimatedTime(order.id)}
                                disabled={settingTime === order.id}
                                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {settingTime === order.id ? 'Setting...' : 'Update'}
                              </button>
                            </div>
                          </div>
                        )}

                        {order.estimatedReadyTime && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                            <Clock size={14} />
                            <span>
                              Estimated ready:{' '}
                              {new Date(order.estimatedReadyTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </div>
                        )}

                        {order.notes && (
                          <div className="mt-4 rounded-lg bg-yellow-50 p-3">
                            <span className="text-xs font-medium uppercase text-yellow-700">
                              Customer Notes
                            </span>
                            <p className="mt-1 text-sm text-yellow-800">{order.notes}</p>
                          </div>
                        )}

                        {order.pickupTime && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={14} className="text-green-600" />
                            <span>
                              Pickup at:{' '}
                              {new Date(order.pickupTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
