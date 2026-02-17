import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Clock,
  FileText,
  ArrowLeft,
  ShoppingBag,
  Store as StoreIcon,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  removeFromCart,
  updateQuantity,
  clearCart,
  selectCartTotal,
  selectCartItemCount,
  setSubstitutionPreference,
} from '@/store/cartSlice';
import { orderService } from '@/services/order.service';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const TAX_RATE = 0.085;

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const cartItems = useAppSelector((state) => state.cart.items);
  const subtotal = useAppSelector(selectCartTotal);
  const itemCount = useAppSelector(selectCartItemCount);

  const [pickupTime, setPickupTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Coupon state (Feature 6)
  const [couponCode, setCouponCode] = useState('');
  const [couponExpanded, setCouponExpanded] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + tax;

  const storeName = cartItems.length > 0 ? cartItems[0].product.store?.name : '';
  const storeId = cartItems.length > 0 ? cartItems[0].product.storeId : '';

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch(removeFromCart(productId));
    } else {
      dispatch(updateQuantity({ productId, quantity: newQuantity }));
    }
  };

  const handleRemoveItem = (productId: string) => {
    dispatch(removeFromCart(productId));
    toast.success('Item removed from cart');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setApplyingCoupon(true);
      // We store the coupon code for now and apply it when creating the order
      // For a real implementation, we'd validate with the server
      setAppliedCoupon(couponCode.trim().toUpperCase());
      // Simulate a discount calculation (server will calculate actual discount)
      setDiscount(subtotal * 0.1); // Placeholder 10% discount
      toast.success(`Coupon "${couponCode.trim().toUpperCase()}" applied!`);
      setCouponCode('');
    } catch {
      toast.error('Invalid coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setDiscount(0);
    toast.success('Coupon removed');
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to place an order');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) return;

    try {
      setIsPlacingOrder(true);
      const orderData = {
        storeId,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          substitutionPreference: item.substitutionPreference || ('REMOVE' as const),
          substituteProductId: item.substituteProductId || undefined,
        })),
        pickupTime: pickupTime || undefined,
        notes: notes.trim() || undefined,
        couponCode: appliedCoupon || undefined,
      };

      const response = await orderService.createOrder(orderData as any);
      dispatch(clearCart());
      toast.success('Order placed successfully!');

      const orderId =
        response.data && typeof response.data === 'object' && 'id' in response.data
          ? (response.data as { id: string }).id
          : response.data &&
            typeof response.data === 'object' &&
            'data' in response.data &&
            (response.data as { data: { id: string } }).data?.id;

      navigate(`/orders/${orderId || ''}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      toast.error(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Generate available pickup times (next 4 hours in 30-min intervals)
  const getPickupTimeOptions = () => {
    const options: string[] = [];
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    for (let i = 1; i <= 8; i++) {
      const time = new Date(now.getTime() + i * 30 * 60 * 1000);
      options.push(time.toISOString().slice(0, 16));
    }
    return options;
  };

  const formatPickupTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <ShoppingCart size={64} className="mx-auto text-gray-300" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="mt-2 text-gray-600">
            Browse local stores and add some items to get started.
          </p>
          <Link
            to="/stores"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
          >
            <ShoppingBag size={18} />
            Browse stores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/stores/${storeId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600"
        >
          <ArrowLeft size={16} />
          Back to store
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Shopping Cart</h1>

        {/* Store Header */}
        {storeName && (
          <div className="mt-4 flex items-center gap-2 text-gray-600">
            <StoreIcon size={18} className="text-green-600" />
            <span className="font-medium">{storeName}</span>
            <span className="text-sm text-gray-400">({itemCount} items)</span>
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag size={24} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                          <p className="mt-0.5 text-sm text-gray-500">
                            ${Number(item.product.price).toFixed(2)} each
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.product.id, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.product.stockQuantity}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Line Total */}
                        <span className="font-semibold text-gray-900">
                          ${(Number(item.product.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Substitution Preference (Feature 7) */}
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={14} className="text-gray-400" />
                      <label className="text-xs font-medium text-gray-500">If unavailable:</label>
                      <select
                        value={item.substitutionPreference || 'REMOVE'}
                        onChange={(e) =>
                          dispatch(
                            setSubstitutionPreference({
                              productId: item.product.id,
                              preference: e.target.value as 'REMOVE' | 'BEST_MATCH' | 'SPECIFIC_ITEM',
                            })
                          )
                        }
                        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-green-500"
                      >
                        <option value="REMOVE">Remove item</option>
                        <option value="BEST_MATCH">Best match</option>
                        <option value="SPECIFIC_ITEM">Pick specific substitute</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Cart */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  dispatch(clearCart());
                  toast.success('Cart cleared');
                }}
                className="text-sm font-medium text-red-500 hover:text-red-600"
              >
                Clear cart
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

              {/* Pickup Time */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock size={16} />
                  Pickup time (optional)
                </label>
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="">As soon as possible</option>
                  {getPickupTimeOptions().map((time) => (
                    <option key={time} value={time}>
                      {formatPickupTime(time)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText size={16} />
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests?"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              {/* Coupon Section (Feature 6) */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setCouponExpanded(!couponExpanded)}
                  className="flex w-full items-center justify-between text-sm font-medium text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-green-600" />
                    Have a coupon?
                  </div>
                  {couponExpanded ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {couponExpanded && (
                  <div className="mt-3">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {appliedCoupon}
                          </span>
                          <span className="text-xs text-green-600">
                            (-${discount.toFixed(2)})
                          </span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-medium text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyCoupon();
                          }}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={applyingCoupon || !couponCode.trim()}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          {applyingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (8.5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || cartItems.length === 0}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPlacingOrder ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin text-white"
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
                    Placing order...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Place Order -- ${total.toFixed(2)}
                  </>
                )}
              </button>

              {!isAuthenticated && (
                <p className="mt-3 text-center text-xs text-gray-500">
                  You will need to{' '}
                  <Link to="/login" className="text-green-600 hover:underline">
                    sign in
                  </Link>{' '}
                  to place your order.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
