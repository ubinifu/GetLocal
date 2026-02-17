import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChevronDown, LogOut, LayoutDashboard, User as UserIcon, Heart, Shield, Bell, Store as StoreIcon, Package, ClipboardList, Plug } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { selectCartItemCount } from '@/store/cartSlice';
import { setUnreadCount } from '@/store/notificationSlice';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notification.service';
import { storeService } from '@/services/store.service';
import type { Notification } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const cartItemCount = useAppSelector(selectCartItemCount);
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user?.role === 'STORE_OWNER') {
      storeService.getMyStores().then((res) => {
        if (res.data && res.data.length > 0) {
          setStoreName(res.data[0].name);
        }
      }).catch(() => {});
    } else {
      setStoreName('');
    }
  }, [isAuthenticated, user?.role, user?.id]);

  const handleOpenNotifications = async () => {
    setNotifDropdownOpen(!notifDropdownOpen);
    if (!notifDropdownOpen) {
      try {
        setLoadingNotifs(true);
        const result = await notificationService.getNotifications(1, 15);
        setNotifications(result.data);
      } catch {
        // Silently fail
      } finally {
        setLoadingNotifs(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch(setUnreadCount(0));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Silently fail
    }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      dispatch(setUnreadCount(Math.max(0, unreadCount - 1)));
    } catch {
      // Silently fail
    }
  };

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Store Greeting */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-600">GetLocal</span>
            </Link>
            {isAuthenticated && user && (
              <div className="hidden items-center gap-2 border-l border-gray-200 pl-4 md:flex">
                {user.role === 'STORE_OWNER' && storeName && (
                  <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1">
                    <StoreIcon size={14} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">{storeName}</span>
                  </div>
                )}
                <span className="text-sm text-gray-500">
                  {getGreeting()}, <span className="font-medium text-gray-700">{user.firstName}</span>
                </span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {user?.role === 'STORE_OWNER' ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/orders"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Orders
                </Link>
                <Link
                  to="/dashboard/products"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Products
                </Link>
                <Link
                  to="/dashboard/integrations"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Integrations
                </Link>
              </>
            ) : user?.role === 'ADMIN' ? (
              <>
                <Link
                  to="/admin"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/users"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Users
                </Link>
                <Link
                  to="/admin/stores"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Stores
                </Link>
                <Link
                  to="/admin/orders"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Orders
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/stores"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                >
                  Stores
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/orders"
                    className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                  >
                    Orders
                  </Link>
                )}
                {isAuthenticated && (
                  <Link
                    to="/favorites"
                    className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
                  >
                    Favorites
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Cart - only for customers */}
            {user?.role !== 'STORE_OWNER' && user?.role !== 'ADMIN' && (
              <Link to="/cart" className="relative p-2 text-gray-700 transition-colors hover:text-emerald-600">
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notification Bell */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={handleOpenNotifications}
                  className="relative p-2 text-gray-700 transition-colors hover:text-emerald-600"
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setNotifDropdownOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {loadingNotifs ? (
                          <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
                        ) : notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`flex items-start gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 ${
                                !notif.isRead ? 'bg-emerald-50/50' : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                                  {notif.title}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                  {new Date(notif.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <button
                                  onClick={() => handleDismissNotification(notif.id)}
                                  className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  aria-label="Dismiss"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Auth Section */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    {user.firstName.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.firstName}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <div className="border-b border-gray-100 px-4 py-2">
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <UserIcon className="h-4 w-4" />
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            {user?.role !== 'STORE_OWNER' && user?.role !== 'ADMIN' && (
              <Link to="/cart" className="relative p-2 text-gray-700">
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {user?.role === 'STORE_OWNER' ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/dashboard/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Orders
                  </Link>
                  <Link
                    to="/dashboard/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Package className="h-4 w-4" />
                    Products
                  </Link>
                  <Link
                    to="/dashboard/integrations"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Plug className="h-4 w-4" />
                    Integrations
                  </Link>
                </>
              ) : user?.role === 'ADMIN' ? (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4" />
                    Users
                  </Link>
                  <Link
                    to="/admin/stores"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <StoreIcon className="h-4 w-4" />
                    Stores
                  </Link>
                  <Link
                    to="/admin/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Orders
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/stores"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Stores
                  </Link>
                  {isAuthenticated && (
                    <Link
                      to="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Orders
                    </Link>
                  )}
                  {isAuthenticated && (
                    <Link
                      to="/favorites"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Heart className="h-4 w-4" />
                      Favorites
                    </Link>
                  )}
                </>
              )}
              {isAuthenticated && user ? (
                <>
                  <div className="my-2 border-t border-gray-200" />
                  <div className="px-4 py-2">
                    <p className="text-sm text-gray-500">
                      {getGreeting()}, <span className="font-medium text-gray-900">{user.firstName}</span>
                    </p>
                    {user.role === 'STORE_OWNER' && storeName && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <StoreIcon size={12} className="text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">{storeName}</span>
                      </div>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="my-2 border-t border-gray-200" />
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
