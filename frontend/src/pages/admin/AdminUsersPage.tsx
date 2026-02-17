import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import type { User } from '@/types';
import toast from 'react-hot-toast';

interface AdminUser extends User {
  _count?: {
    orders?: number;
  };
}

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: 'bg-gray-100 text-gray-700',
  STORE_OWNER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: { page: number; limit: number; role?: string; search?: string } = {
        page,
        limit: 10,
      };
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const result = await adminService.getUsers(params);
      if (Array.isArray(result)) {
        setUsers(result);
        setTotalPages(1);
      } else if (result && typeof result === 'object') {
        setUsers(result.users ?? result.data ?? []);
        setTotalPages(result.pagination?.totalPages ?? result.totalPages ?? 1);
      }
    } catch {
      setError('Failed to load users.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminService.updateUser(userId, { role: newRole });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole as User['role'] } : u
        )
      );
      setEditingRole(null);
      toast.success('User role updated');
    } catch {
      toast.error('Failed to update user role');
    }
  };

  const handleToggleVerified = async (userId: string, currentVerified: boolean) => {
    try {
      await adminService.updateUser(userId, { isVerified: !currentVerified });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isVerified: !currentVerified } : u
        )
      );
      toast.success(`User ${!currentVerified ? 'verified' : 'unverified'}`);
    } catch {
      toast.error('Failed to update verification status');
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${userName}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await adminService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                className="text-sm text-gray-500 hover:text-emerald-600"
              >
                Admin
              </Link>
              <span className="text-sm text-gray-400">/</span>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            </div>
            <p className="mt-1 text-gray-600">Manage platform users and roles</p>
          </div>
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
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="STORE_OWNER">Store Owner</option>
              <option value="ADMIN">Admin</option>
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
        ) : users.length === 0 ? (
          <div className="mt-12 text-center">
            <Users size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No users found</h3>
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
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Verified
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {user.firstName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {editingRole === user.id ? (
                          <select
                            defaultValue={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            autoFocus
                            className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                          >
                            <option value="CUSTOMER">CUSTOMER</option>
                            <option value="STORE_OWNER">STORE_OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingRole(user.id)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'
                            }`}
                            title="Click to change role"
                          >
                            {user.role === 'ADMIN' && <Shield size={10} />}
                            {user.role.replace('_', ' ')}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleVerified(user.id, user.isVerified)}
                          className={`inline-flex items-center justify-center rounded-full p-1 ${
                            user.isVerified
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={user.isVerified ? 'Verified - click to unverify' : 'Not verified - click to verify'}
                        >
                          {user.isVerified ? <Check size={18} /> : <X size={18} />}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {user._count?.orders ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            handleDelete(user.id, `${user.firstName} ${user.lastName}`)
                          }
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete user"
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
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                        {user.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDelete(user.id, `${user.firstName} ${user.lastName}`)
                      }
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.role === 'ADMIN' && <Shield size={10} />}
                      {user.role.replace('_', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isVerified
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.isVerified ? <Check size={10} /> : <X size={10} />}
                      {user.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user._count?.orders ?? 0} orders
                    </span>
                    <span className="text-xs text-gray-400">
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="STORE_OWNER">STORE_OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button
                      onClick={() => handleToggleVerified(user.id, user.isVerified)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        user.isVerified
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {user.isVerified ? 'Unverify' : 'Verify'}
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
