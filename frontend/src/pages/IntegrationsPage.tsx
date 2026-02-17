import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plug,
  Puzzle,
  RefreshCw,
  Settings,
  Trash2,
  Plus,
  Check,
  X,
  AlertTriangle,
  Clock,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { integrationService } from '@/services/integration.service';
import { storeService } from '@/services/store.service';
import { useAuth } from '@/hooks/useAuth';
import type {
  StoreIntegration,
  IntegrationType,
  IntegrationStatus,
  IntegrationStats,
  CreateIntegrationData,
  UpdateIntegrationData,
  Store,
} from '@/types';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────

const INTEGRATION_META: Record<
  IntegrationType,
  { label: string; color: string; bgColor: string; helpText: string }
> = {
  SQUARE: {
    label: 'Square',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    helpText: 'Enter your Square access token and location ID',
  },
  SHOPIFY: {
    label: 'Shopify',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    helpText: 'Enter your Shopify Admin API access token',
  },
  TOAST: {
    label: 'Toast',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    helpText: 'Enter your Toast API credentials',
  },
  CUSTOM_REST: {
    label: 'Custom REST API',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    helpText: 'Configure your custom REST API endpoint',
  },
};

const STATUS_BADGE: Record<IntegrationStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  ERROR: 'bg-red-100 text-red-700',
};

const SYNC_INTERVALS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 10, label: 'Every 10 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every 60 minutes' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function syncIntervalLabel(minutes: number): string {
  const match = SYNC_INTERVALS.find((i) => i.value === minutes);
  return match ? match.label : `Every ${minutes} minutes`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Store selection
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Integration data
  const [integrations, setIntegrations] = useState<StoreIntegration[]>([]);
  const [stats, setStats] = useState<IntegrationStats>({
    active: 0,
    inactive: 0,
    error: 0,
    lastSyncAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<StoreIntegration | null>(null);
  const [formData, setFormData] = useState<{
    type: IntegrationType;
    apiKey: string;
    apiSecret: string;
    webhookUrl: string;
    syncInterval: number;
    status: IntegrationStatus;
  }>({
    type: 'SQUARE',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    syncInterval: 30,
    status: 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);

  // ── Auth Guard ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'STORE_OWNER' && user?.role !== 'ADMIN') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // ── Fetch Stores ─────────────────────────────────────────────────────────

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

    if (user?.id) {
      fetchStores();
    }
  }, [user?.id, selectedStoreId]);

  // ── Fetch Integrations ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!selectedStoreId) return;
    try {
      setLoading(true);
      const [integrationsData, statsResponse] = await Promise.allSettled([
        integrationService.getIntegrations(selectedStoreId),
        integrationService.getIntegrationStats(selectedStoreId),
      ]);

      if (integrationsData.status === 'fulfilled') {
        setIntegrations(integrationsData.value);
      } else {
        setIntegrations([]);
      }

      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value.data);
      } else {
        // Compute stats from integrations if stats endpoint unavailable
        if (integrationsData.status === 'fulfilled') {
          const list = integrationsData.value;
          const lastSync = list
            .filter((i) => i.lastSyncAt)
            .sort(
              (a, b) =>
                new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime()
            )[0]?.lastSyncAt ?? null;
          setStats({
            active: list.filter((i) => i.status === 'ACTIVE').length,
            inactive: list.filter((i) => i.status === 'INACTIVE').length,
            error: list.filter((i) => i.status === 'ERROR').length,
            lastSyncAt: lastSync,
          });
        }
      }
    } catch {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSync = async (id: string) => {
    try {
      setSyncingId(id);
      await integrationService.syncIntegration(id);
      toast.success('Sync started successfully');
      await fetchData();
    } catch {
      toast.error('Failed to sync integration');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this integration? This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      setDeletingId(id);
      await integrationService.deleteIntegration(id);
      toast.success('Integration deleted');
      await fetchData();
    } catch {
      toast.error('Failed to delete integration');
    } finally {
      setDeletingId(null);
    }
  };

  const openAddModal = () => {
    setEditingIntegration(null);
    setFormData({
      type: 'SQUARE',
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      syncInterval: 30,
      status: 'ACTIVE',
    });
    setShowModal(true);
  };

  const openEditModal = (integration: StoreIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      type: integration.type,
      apiKey: '',
      apiSecret: '',
      webhookUrl: integration.webhookUrl || '',
      syncInterval: integration.syncInterval,
      status: integration.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedStoreId) return;

    try {
      setSaving(true);

      if (editingIntegration) {
        // Update
        const updateData: UpdateIntegrationData = {
          syncInterval: formData.syncInterval,
          status: formData.status,
          webhookUrl: formData.webhookUrl || undefined,
        };
        if (formData.apiKey) {
          updateData.apiKey = formData.apiKey;
        }
        if (formData.apiSecret) {
          updateData.apiSecret = formData.apiSecret;
        }
        await integrationService.updateIntegration(editingIntegration.id, updateData);
        toast.success('Integration updated');
      } else {
        // Create
        if (!formData.apiKey || !formData.apiSecret) {
          toast.error('API Key and API Secret are required');
          setSaving(false);
          return;
        }
        const createData: CreateIntegrationData = {
          type: formData.type,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          webhookUrl: formData.webhookUrl || undefined,
          syncInterval: formData.syncInterval,
        };
        await integrationService.createIntegration(selectedStoreId, createData);
        toast.success('Integration created');
      }

      setShowModal(false);
      await fetchData();
    } catch {
      toast.error(
        editingIntegration ? 'Failed to update integration' : 'Failed to create integration'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && integrations.length === 0 && stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-200" />
              ))}
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 rounded-xl bg-gray-200" />
              ))}
            </div>
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
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Integrations</h1>
                <p className="mt-1 text-gray-600">
                  Connect your POS and inventory systems
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Store Selector */}
            {stores.length > 1 && (
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
            )}

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Integration
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <div className="rounded-xl bg-green-100 p-3">
                <Check size={20} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.inactive}</p>
              </div>
              <div className="rounded-xl bg-gray-100 p-3">
                <Plug size={20} className="text-gray-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Errors</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.error}</p>
              </div>
              <div className="rounded-xl bg-red-100 p-3">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Last Sync</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {relativeTime(stats.lastSyncAt)}
                </p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3">
                <Clock size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Integration Cards */}
        {integrations.length === 0 && !loading ? (
          <EmptyState onAdd={openAddModal} />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                syncing={syncingId === integration.id}
                deleting={deletingId === integration.id}
                onSync={() => handleSync(integration.id)}
                onEdit={() => openEditModal(integration)}
                onDelete={() => handleDelete(integration.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <IntegrationModal
          isEditing={!!editingIntegration}
          formData={formData}
          saving={saving}
          onFormChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Sub-Components ─────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  syncing,
  deleting,
  onSync,
  onEdit,
  onDelete,
}: {
  integration: StoreIntegration;
  syncing: boolean;
  deleting: boolean;
  onSync: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = INTEGRATION_META[integration.type];

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${meta.bgColor}`}>
            {integration.type === 'CUSTOM_REST' ? (
              <Puzzle size={20} className={meta.color} />
            ) : (
              <Plug size={20} className={meta.color} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{meta.label}</h3>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[integration.status]}`}
            >
              {integration.status}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2.5">
        {integration.apiKey && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">API Key</span>
            <span className="font-mono text-gray-700">****{integration.apiKey}</span>
          </div>
        )}

        {integration.webhookUrl && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Webhook</span>
            <a
              href={integration.webhookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-emerald-600 hover:text-emerald-700"
              title={integration.webhookUrl}
            >
              <span className="max-w-[140px] truncate">{integration.webhookUrl}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Last Sync</span>
          <span className="text-gray-700">{relativeTime(integration.lastSyncAt)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Sync Interval</span>
          <span className="text-gray-700">{syncIntervalLabel(integration.syncInterval)}</span>
        </div>
      </div>

      {/* Error Message */}
      {integration.status === 'ERROR' && integration.lastSyncError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-xs text-red-700">{integration.lastSyncError}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          title="Edit"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mx-auto flex items-center justify-center gap-4">
        <div className="rounded-xl bg-blue-100 p-3">
          <Plug size={24} className="text-blue-700" />
        </div>
        <div className="rounded-xl bg-green-100 p-3">
          <Plug size={24} className="text-green-700" />
        </div>
        <div className="rounded-xl bg-orange-100 p-3">
          <Plug size={24} className="text-orange-700" />
        </div>
        <div className="rounded-xl bg-purple-100 p-3">
          <Puzzle size={24} className="text-purple-700" />
        </div>
      </div>
      <h3 className="mt-6 text-lg font-semibold text-gray-900">No integrations yet</h3>
      <p className="mt-2 text-sm text-gray-500">
        Connect your POS or inventory system to automatically sync products and orders.
        <br />
        We support Square, Shopify, Toast, and custom REST APIs.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        <Plus size={16} />
        Get Started
      </button>
    </div>
  );
}

function IntegrationModal({
  isEditing,
  formData,
  saving,
  onFormChange,
  onSave,
  onClose,
}: {
  isEditing: boolean;
  formData: {
    type: IntegrationType;
    apiKey: string;
    apiSecret: string;
    webhookUrl: string;
    syncInterval: number;
    status: IntegrationStatus;
  };
  saving: boolean;
  onFormChange: (updates: Partial<typeof formData>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const meta = INTEGRATION_META[formData.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Integration' : 'Add Integration'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Type Selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Integration Type
            </label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-2 ${INTEGRATION_META[formData.type].bgColor}`}>
                  {formData.type === 'CUSTOM_REST' ? (
                    <Puzzle size={16} className={INTEGRATION_META[formData.type].color} />
                  ) : (
                    <Plug size={16} className={INTEGRATION_META[formData.type].color} />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {INTEGRATION_META[formData.type].label}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(INTEGRATION_META) as IntegrationType[]).map((type) => {
                  const typeMeta = INTEGRATION_META[type];
                  const isSelected = formData.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onFormChange({ type })}
                      className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`rounded-md p-1.5 ${typeMeta.bgColor}`}>
                        {type === 'CUSTOM_REST' ? (
                          <Puzzle size={14} className={typeMeta.color} />
                        ) : (
                          <Plug size={14} className={typeMeta.color} />
                        )}
                      </div>
                      <span className="text-gray-900">{typeMeta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-700">{meta.helpText}</p>
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              API Key{isEditing && ' (leave blank to keep current)'}
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => onFormChange({ apiKey: e.target.value })}
              placeholder={isEditing ? '********' : 'Enter API key'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              API Secret{isEditing && ' (leave blank to keep current)'}
            </label>
            <input
              type="password"
              value={formData.apiSecret}
              onChange={(e) => onFormChange({ apiSecret: e.target.value })}
              placeholder={isEditing ? '********' : 'Enter API secret'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Webhook URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Webhook URL (optional)
            </label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => onFormChange({ webhookUrl: e.target.value })}
              placeholder="https://example.com/webhook"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Sync Interval */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Sync Interval</label>
            <select
              value={formData.syncInterval}
              onChange={(e) => onFormChange({ syncInterval: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {SYNC_INTERVALS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Toggle (edit only) */}
          {isEditing && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onFormChange({ status: 'ACTIVE' })}
                  className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                    formData.status === 'ACTIVE'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Check size={14} />
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => onFormChange({ status: 'INACTIVE' })}
                  className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                    formData.status === 'INACTIVE'
                      ? 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <X size={14} />
                  Inactive
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={14} />
                {isEditing ? 'Save Changes' : 'Create Integration'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
