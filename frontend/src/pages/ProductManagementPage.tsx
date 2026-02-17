import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  X,
  AlertTriangle,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { productService } from '@/services/product.service';
import { storeService } from '@/services/store.service';
import { useAuth } from '@/hooks/useAuth';
import type { Product, Store } from '@/types';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  stockQuantity: string;
  lowStockThreshold: string;
  imageUrl: string;
  sku: string;
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  stockQuantity: '',
  lowStockThreshold: '5',
  imageUrl: '',
  sku: '',
};

export default function ProductManagementPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Inline stock edit
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState('');

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
        toast.error('Failed to load stores');
      }
    };
    if (user?.id) fetchStores();
  }, [user?.id, selectedStoreId]);

  // Fetch products
  useEffect(() => {
    if (!selectedStoreId) return;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await productService.getProducts({ storeId: selectedStoreId });
        setProducts(response.data ?? []);
      } catch {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedStoreId]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.price || Number(formData.price) <= 0) errors.price = 'Valid price is required';
    if (!formData.stockQuantity || Number(formData.stockQuantity) < 0)
      errors.stockQuantity = 'Valid stock quantity is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      categoryId: product.categoryId,
      stockQuantity: product.stockQuantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      imageUrl: product.imageUrl || '',
      sku: product.sku || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId || '',
        stockQuantity: parseInt(formData.stockQuantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
        imageUrl: formData.imageUrl.trim() || undefined,
        sku: formData.sku.trim() || undefined,
      };

      if (editingProduct) {
        const response = await productService.updateProduct(editingProduct.id, payload);
        const updated =
          response.data && typeof response.data === 'object' && 'data' in response.data
            ? (response.data as { data: Product }).data
            : (response.data as Product);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? { ...p, ...updated } : p))
        );
        toast.success('Product updated successfully');
      } else {
        const response = await productService.createProduct(selectedStoreId, payload);
        const newProduct =
          response.data && typeof response.data === 'object' && 'data' in response.data
            ? (response.data as { data: Product }).data
            : (response.data as Product);
        setProducts((prev) => [...prev, newProduct]);
        toast.success('Product created successfully');
      }
      setShowForm(false);
      setEditingProduct(null);
      setFormData(EMPTY_FORM);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save product. Please try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    try {
      setDeleting(productId);
      await productService.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(null);
    }
  };

  const handleStockUpdate = async (productId: string) => {
    const newStock = parseInt(stockValue);
    if (isNaN(newStock) || newStock < 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }

    try {
      await productService.updateProduct(productId, { stockQuantity: newStock });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stockQuantity: newStock } : p))
      );
      setEditingStock(null);
      toast.success('Stock updated');
    } catch {
      toast.error('Failed to update stock');
    }
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
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Product Management</h1>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20">
            <Search size={18} className="ml-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none px-3 py-2.5 text-gray-900 placeholder-gray-400 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Product Form (inline) */}
        {showForm && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product name *
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                    formErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Price *</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleFormChange}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                    formErrors.price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {formErrors.price && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Product description (optional)"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Category ID</label>
                <input
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Category ID"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  name="sku"
                  value={formData.sku}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Optional SKU"
                />
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock quantity *
                </label>
                <input
                  name="stockQuantity"
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={handleFormChange}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                    formErrors.stockQuantity ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {formErrors.stockQuantity && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.stockQuantity}</p>
                )}
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Low stock threshold
                </label>
                <input
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="5"
                />
              </div>

              {/* Image URL */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                  className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="h-24 rounded-lg bg-gray-200" />
                  <div className="mt-3 h-5 w-3/4 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={56} className="mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {searchQuery ? 'No products match your search' : 'No products yet'}
              </h3>
              <p className="mt-2 text-gray-500">
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Add your first product to get started.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openAddForm}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700"
                >
                  <Plus size={18} />
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const isLowStock =
                  product.stockQuantity > 0 &&
                  product.stockQuantity <= product.lowStockThreshold;
                const isOutOfStock = product.stockQuantity <= 0;

                return (
                  <div
                    key={product.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    {/* Product Image */}
                    <div className="relative h-28 overflow-hidden rounded-lg bg-gray-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package size={28} className="text-gray-300" />
                        </div>
                      )}
                      {(isLowStock || isOutOfStock) && (
                        <span
                          className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          <AlertTriangle size={10} />
                          {isOutOfStock ? 'Out of stock' : 'Low stock'}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="mt-3">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">
                          ${Number(product.price).toFixed(2)}
                        </span>

                        {/* Stock (inline editable) */}
                        {editingStock === product.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              className="w-16 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-green-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleStockUpdate(product.id);
                                if (e.key === 'Escape') setEditingStock(null);
                              }}
                            />
                            <button
                              onClick={() => handleStockUpdate(product.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={() => setEditingStock(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingStock(product.id);
                              setStockValue(product.stockQuantity.toString());
                            }}
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : isLowStock
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            } hover:opacity-80`}
                          >
                            Stock: {product.stockQuantity}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                      <button
                        onClick={() => openEditForm(product)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting === product.id}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        {deleting === product.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
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
