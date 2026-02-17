import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Package, AlertTriangle, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { setUnreadCount } from '@/store/notificationSlice';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types';

const POLL_INTERVAL = 15_000; // 15 seconds

/**
 * Renders a custom toast for a notification with a dismiss button.
 * On dismiss, marks the notification as read in the backend.
 */
function NotificationToastContent({
  notification,
  toastId,
  onDismiss,
}: {
  notification: Notification;
  toastId: string;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();

  const icon = (() => {
    switch (notification.type) {
      case 'ORDER_STATUS':
        return notification.title.includes('New Order')
          ? <ShoppingCart size={18} className="text-blue-500" />
          : <Package size={18} className="text-green-500" />;
      case 'LOW_STOCK':
        return <AlertTriangle size={18} className="text-orange-500" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  })();

  const handleClick = () => {
    const data = notification.data as Record<string, unknown> | undefined;
    if (data?.orderId) {
      navigate(`/orders/${data.orderId}`);
    }
    onDismiss(notification.id);
    toast.dismiss(toastId);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
    toast.dismiss(toastId);
  };

  return (
    <div
      className="flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-lg"
      onClick={handleClick}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
        <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{notification.message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Polls for new notifications and shows toast messages.
 * Renders nothing visible — just handles side-effects.
 */
export default function NotificationToast() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialFetchDone = useRef(false);

  const handleDismiss = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch {
      // Ignore dismiss errors
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const [{ data: notifications }, unreadCount] = await Promise.all([
        notificationService.getNotifications(1, 10),
        notificationService.getUnreadCount(),
      ]);

      dispatch(setUnreadCount(unreadCount));

      // Show toasts only for unread notifications we haven't already shown
      const unread = notifications.filter((n: Notification) => !n.isRead);
      const isInitial = !initialFetchDone.current;
      initialFetchDone.current = true;

      for (const notification of unread) {
        if (seenIdsRef.current.has(notification.id)) continue;

        seenIdsRef.current.add(notification.id);

        // Skip toasting on the very first fetch (to avoid flooding on page load)
        if (isInitial) continue;

        toast.custom(
          (t) => (
            <div
              className={`pointer-events-auto w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg transition-all ${
                t.visible ? 'animate-enter' : 'animate-leave'
              }`}
            >
              <NotificationToastContent
                notification={notification}
                toastId={t.id}
                onDismiss={handleDismiss}
              />
            </div>
          ),
          { duration: 8000, position: 'top-right' }
        );
      }
    } catch {
      // Silently fail — don't disrupt the user
    }
  }, [isAuthenticated, dispatch, handleDismiss]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear state when logged out
      seenIdsRef.current = new Set();
      initialFetchDone.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Set up polling
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchNotifications]);

  return null; // This component is invisible — it only triggers toasts
}
