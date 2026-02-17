import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  ShoppingBag,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  Store as StoreIcon,
  RotateCcw,
  MessageCircle,
  Send,
  QrCode,
  Navigation,
} from 'lucide-react';
import { orderService } from '@/services/order.service';
import { messageService } from '@/services/message.service';
import { useAuth } from '@/hooks/useAuth';
import type { Order, OrderStatus, Message } from '@/types';
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
  READY: {
    label: 'Ready for Pickup',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: Package,
  },
  PICKED_UP: {
    label: 'Picked Up',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: ShoppingBag,
  },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
};

const STATUS_STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'];

// Simple QR Code SVG generator
function generateQRCodeSVG(text: string): string {
  // Create a simple representation - in production you would use a proper QR library
  // This generates a deterministic pattern based on the text
  const size = 21;
  const cells: boolean[][] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let row = 0; row < size; row++) {
    cells[row] = [];
    for (let col = 0; col < size; col++) {
      // Finder patterns (top-left, top-right, bottom-left)
      const inFinderTL = row < 7 && col < 7;
      const inFinderTR = row < 7 && col >= size - 7;
      const inFinderBL = row >= size - 7 && col < 7;

      if (inFinderTL || inFinderTR || inFinderBL) {
        const fr = inFinderTL ? row : inFinderTR ? row : row - (size - 7);
        const fc = inFinderTL ? col : inFinderTR ? col - (size - 7) : col;
        const isOuter = fr === 0 || fr === 6 || fc === 0 || fc === 6;
        const isInner = fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4;
        cells[row][col] = isOuter || isInner;
      } else {
        // Data area: use hash-based pattern
        const seed = (hash * (row + 1) * (col + 1)) & 0xffff;
        cells[row][col] = seed % 3 !== 0;
      }
    }
  }

  const cellSize = 8;
  const padding = 16;
  const svgSize = size * cellSize + padding * 2;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">`;
  svg += `<rect width="${svgSize}" height="${svgSize}" fill="white"/>`;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (cells[row][col]) {
        svg += `<rect x="${padding + col * cellSize}" y="${padding + row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Messaging state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrder = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await orderService.getOrderById(id);
        if (response.data) {
          setOrder(response.data);
        }
      } catch {
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, isAuthenticated, navigate]);

  // Fetch messages when panel opens
  useEffect(() => {
    if (!showMessages || !id) return;
    const fetchMessages = async () => {
      try {
        const response = await messageService.getMessages(id);
        setMessages(response.data ?? []);
      } catch {
        // Messages may not be available yet
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [showMessages, id]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;

    try {
      setCancelling(true);
      await orderService.updateOrderStatus(order.id, 'CANCELLED');
      setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      toast.success('Order cancelled successfully');
    } catch {
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    try {
      setReordering(true);
      const response = await orderService.reorder(order.id);
      toast.success('Order placed again!');
      navigate(`/orders/${response.data.id}`);
    } catch {
      toast.error('Failed to reorder. Please try again.');
    } finally {
      setReordering(false);
    }
  };

  const handleCheckin = async () => {
    if (!order) return;
    try {
      setCheckingIn(true);
      const response = await orderService.checkin(order.id);
      setOrder(response.data);
      toast.success("Store has been notified you've arrived!");
    } catch {
      toast.error('Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSendMessage = async () => {
    if (!id || !newMessage.trim()) return;
    try {
      setSendingMessage(true);
      const response = await messageService.sendMessage(id, newMessage.trim());
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
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatPickupTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEstimatedReadyDisplay = (order: Order) => {
    if (!order.estimatedReadyTime) return null;
    const readyTime = new Date(order.estimatedReadyTime);
    const now = new Date();
    const diffMs = readyTime.getTime() - now.getTime();
    const diffMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60)));

    if (diffMinutes <= 0) {
      return 'Should be ready now!';
    }
    if (diffMinutes <= 60) {
      return `Ready in ~${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    }
    return `Estimated ready: ${formatPickupTime(order.estimatedReadyTime)}`;
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const canCancel = order && ['PENDING', 'CONFIRMED'].includes(order.status);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-6 w-32 rounded bg-gray-200" />
            <div className="mt-6 h-48 rounded-xl bg-gray-200" />
            <div className="mt-6 h-64 rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {error || 'Order not found'}
          </h2>
          <Link
            to="/orders"
            className="mt-4 inline-flex items-center gap-2 font-medium text-green-600 hover:text-green-700"
          >
            <ArrowLeft size={16} />
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[order.status];
  const StatusIcon = statusInfo.icon;
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/orders"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600"
        >
          <ArrowLeft size={16} />
          Back to orders
        </Link>

        {/* Order Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Order #{order.orderNumber}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
            >
              <StatusIcon size={16} />
              {statusInfo.label}
            </span>
          </div>

          {/* Estimated Ready Time (Feature 5) */}
          {order.estimatedReadyTime &&
            !['PICKED_UP', 'CANCELLED'].includes(order.status) && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                <Clock size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {getEstimatedReadyDisplay(order)}
                </span>
              </div>
            )}

          {/* Status Progress Bar */}
          {order.status !== 'CANCELLED' && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const stepConfig = STATUS_CONFIG[step];
                  const isComplete = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const StepIcon = stepConfig.icon;

                  return (
                    <div key={step} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        {index > 0 && (
                          <div
                            className={`h-0.5 flex-1 ${
                              isComplete ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isCurrent
                              ? 'bg-green-600 text-white ring-4 ring-green-100'
                              : isComplete
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <StepIcon size={14} />
                        </div>
                        {index < STATUS_STEPS.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 ${
                              index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-1 text-xs ${
                          isCurrent ? 'font-semibold text-green-700' : 'text-gray-500'
                        }`}
                      >
                        {stepConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Arrival Check-In & QR Code (Feature 4) */}
        {order.status === 'READY' && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-green-800">
              <Package size={18} />
              Your order is ready for pickup!
            </h2>

            {/* Check-in button */}
            {!order.customerCheckedIn ? (
              <button
                onClick={handleCheckin}
                disabled={checkingIn}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
              >
                {checkingIn ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking in...
                  </>
                ) : (
                  <>
                    <Navigation size={18} />
                    I've Arrived
                  </>
                )}
              </button>
            ) : (
              <div className="mt-3 rounded-lg bg-green-100 p-3 text-sm font-medium text-green-700">
                You've checked in! The store knows you're here.
              </div>
            )}

            {/* QR Code & Pickup Code */}
            {order.pickupCode && (
              <div className="mt-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-4">
                    <div
                      className="h-44 w-44"
                      dangerouslySetInnerHTML={{
                        __html: generateQRCodeSVG(order.pickupCode),
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Show this code at pickup</p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-4 py-2 border border-gray-200">
                      <QrCode size={16} className="text-green-600" />
                      <span className="text-xl font-bold tracking-widest text-gray-900">
                        {order.pickupCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Store Info */}
        {order.store && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <StoreIcon size={18} className="text-green-600" />
              Store Information
            </h2>
            <div className="mt-3 space-y-2">
              <p className="font-medium text-gray-900">{order.store.name}</p>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {order.store.address}, {order.store.city}, {order.store.state}{' '}
                  {order.store.zipCode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} className="shrink-0 text-gray-400" />
                <span>{order.store.phone}</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900">Order Items</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-5">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {item.product?.name || `Product #${item.productId.slice(0, 8)}`}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    ${Number(item.unitPrice).toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <span className="font-semibold text-gray-900">
                  ${Number(item.totalPrice).toFixed(2)}
                </span>
              </div>
            ))}
            {(!order.items || order.items.length === 0) && (
              <div className="p-5 text-center text-sm text-gray-500">
                Order item details are not available.
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="border-t border-gray-200 p-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              {order.discount != null && Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>${Number(order.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Time & Notes */}
        {(order.pickupTime || order.notes) && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {order.pickupTime && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Pickup at: {formatPickupTime(order.pickupTime)}
                </span>
              </div>
            )}
            {order.notes && (
              <div className={`flex items-start gap-2 ${order.pickupTime ? 'mt-3' : ''}`}>
                <FileText size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Notes:</span>
                  <p className="mt-0.5 text-sm text-gray-600">{order.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages Panel (Feature 3) */}
        <div className="mt-6">
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-green-600" />
              <span className="font-semibold text-gray-900">Messages</span>
              {messages.length > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {messages.length}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {showMessages ? 'Hide' : 'Show'}
            </span>
          </button>

          {showMessages && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Messages list */}
              <div className="max-h-80 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageCircle size={32} className="mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No messages yet. Send a message to the store.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isOwn = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isOwn
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {!isOwn && msg.sender && (
                              <p className="mb-0.5 text-xs font-medium text-gray-500">
                                {msg.sender.firstName} ({msg.sender.role === 'STORE_OWNER' ? 'Store' : 'Customer'})
                              </p>
                            )}
                            <p className="text-sm">{msg.content}</p>
                            <p
                              className={`mt-1 text-xs ${
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

              {/* Message input */}
              {!['PICKED_UP', 'CANCELLED'].includes(order.status) && (
                <div className="border-t border-gray-200 p-3">
                  <div className="flex gap-2">
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
                      placeholder="Type a message..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="flex items-center justify-center rounded-lg bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {/* Reorder Button (Feature 2) */}
          {order.status === 'PICKED_UP' && (
            <button
              onClick={handleReorder}
              disabled={reordering}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {reordering ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Placing reorder...
                </>
              ) : (
                <>
                  <RotateCcw size={18} />
                  Reorder
                </>
              )}
            </button>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-red-300 px-4 py-3 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-red-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle size={18} />
                  Cancel Order
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
