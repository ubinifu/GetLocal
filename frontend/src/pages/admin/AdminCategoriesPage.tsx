import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import toast from 'react-hot-toast';

interface AdminCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  _count?: {
    products?: number;
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminService.getCategories();
      const data = result.data ?? result;
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load categories.');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      setCreating(true);
      const result = await adminService.createCategory({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      const newCategory = result.data ?? result;
      setCategories((prev) => [...prev, newCategory]);
      setNewName('');
      setNewDescription('');
      toast.success('Category created');
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (category: AdminCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      setSaving(true);
      await adminService.updateCategory(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: editName.trim(), description: editDescription.trim() || undefined }
            : c
        )
      );
      setEditingId(null);
      toast.success('Category updated');
    } catch {
      toast.error('Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete category "${name}"?`
    );
    if (!confirmed) return;
    try {
      await adminService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          </div>
          <p className="mt-1 text-gray-600">Manage product categories</p>
        </div>

        {/* Create Form */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <Plus size={18} className="text-emerald-600" />
            Add New Category
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500">
                Description (optional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add Category'}
            </button>
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-200" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="mt-12 text-center">
            <Tag size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No categories yet
            </h3>
            <p className="mt-1 text-gray-500">
              Create your first category above.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {categories.map((category) => {
              const productCount = category._count?.products ?? 0;
              const isEditing = editingId === category.id;

              return (
                <div
                  key={category.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300"
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-emerald-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(category.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(category.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdate(category.id)}
                          disabled={saving || !editName.trim()}
                          className="rounded p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                          title="Save"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                          <Tag size={18} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          {productCount} product{productCount !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => startEdit(category)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit category"
                        >
                          <Edit size={16} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
                            disabled={productCount > 0}
                            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            title={
                              productCount > 0
                                ? `Cannot delete: ${productCount} product${productCount !== 1 ? 's' : ''} assigned`
                                : 'Delete category'
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
