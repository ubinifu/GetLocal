import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { IntegrationType, IntegrationStatus, Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateIntegrationData {
  type: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  syncInterval?: number;
  config?: Record<string, unknown>;
}

interface UpdateIntegrationData {
  status?: 'ACTIVE' | 'INACTIVE';
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string | null;
  syncInterval?: number;
  config?: Record<string, unknown>;
}

interface IntegrationQuery {
  type?: IntegrationType;
  status?: IntegrationStatus;
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mask a sensitive string, showing only the last 4 characters.
 * Returns null if the input is null or undefined.
 */
const maskSecret = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
};

/**
 * Remove sensitive fields from an integration record before returning to the client.
 */
const maskIntegrationSecrets = <
  T extends { apiKey?: string | null; apiSecret?: string | null },
>(
  integration: T
): T => {
  return {
    ...integration,
    apiKey: maskSecret(integration.apiKey),
    apiSecret: maskSecret(integration.apiSecret),
  };
};

/**
 * Verify that the given store exists and belongs to the specified user.
 * Throws AppError if not found or not authorised.
 */
const verifyStoreOwnership = async (storeId: string, userId: string) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.ownerId !== userId) {
    throw new AppError('You are not authorized to manage integrations for this store', 403);
  }

  return store;
};

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * List integrations for a store (paginated, with optional filters).
 */
export const getIntegrations = async (
  storeId: string,
  userId: string,
  query: IntegrationQuery
): Promise<PaginatedResult<any>> => {
  await verifyStoreOwnership(storeId, userId);

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const where: Prisma.StoreIntegrationWhereInput = { storeId };

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  const [integrations, total] = await Promise.all([
    prisma.storeIntegration.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.storeIntegration.count({ where }),
  ]);

  return {
    data: integrations.map(maskIntegrationSecrets),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single integration by ID (verify ownership).
 */
export const getIntegrationById = async (id: string, userId: string) => {
  const integration = await prisma.storeIntegration.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  if (!integration) {
    throw new AppError('Integration not found', 404);
  }

  if (integration.store.ownerId !== userId) {
    throw new AppError('You are not authorized to view this integration', 403);
  }

  // Strip ownerId from the store response before returning
  const { ownerId: _ownerId, ...storeData } = integration.store;
  const result = { ...integration, store: storeData };

  return maskIntegrationSecrets(result);
};

/**
 * Create a new integration for a store.
 * Enforces the unique constraint on (storeId, type).
 */
export const createIntegration = async (
  storeId: string,
  userId: string,
  data: CreateIntegrationData
) => {
  await verifyStoreOwnership(storeId, userId);

  // Check for duplicate integration type on this store
  const existing = await prisma.storeIntegration.findUnique({
    where: { storeId_type: { storeId, type: data.type } },
  });

  if (existing) {
    throw new AppError(
      `A ${data.type} integration already exists for this store`,
      409
    );
  }

  const integration = await prisma.storeIntegration.create({
    data: {
      storeId,
      type: data.type,
      apiKey: data.apiKey ?? null,
      apiSecret: data.apiSecret ?? null,
      webhookUrl: data.webhookUrl ?? null,
      syncInterval: data.syncInterval ?? 30,
      config: (data.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return maskIntegrationSecrets(integration);
};

/**
 * Update an existing integration's configuration or status.
 */
export const updateIntegration = async (
  id: string,
  userId: string,
  data: UpdateIntegrationData
) => {
  const integration = await prisma.storeIntegration.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!integration) {
    throw new AppError('Integration not found', 404);
  }

  if (integration.store.ownerId !== userId) {
    throw new AppError('You are not authorized to update this integration', 403);
  }

  const updateData: Prisma.StoreIntegrationUpdateInput = {};

  if (data.status !== undefined) updateData.status = data.status;
  if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
  if (data.apiSecret !== undefined) updateData.apiSecret = data.apiSecret;
  if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
  if (data.syncInterval !== undefined) updateData.syncInterval = data.syncInterval;
  if (data.config !== undefined) updateData.config = data.config as Prisma.InputJsonValue;

  const updatedIntegration = await prisma.storeIntegration.update({
    where: { id },
    data: updateData,
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return maskIntegrationSecrets(updatedIntegration);
};

/**
 * Delete an integration. Verifies that the user owns the store.
 */
export const deleteIntegration = async (id: string, userId: string) => {
  const integration = await prisma.storeIntegration.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!integration) {
    throw new AppError('Integration not found', 404);
  }

  if (integration.store.ownerId !== userId) {
    throw new AppError('You are not authorized to delete this integration', 403);
  }

  await prisma.storeIntegration.delete({ where: { id } });

  return { message: 'Integration deleted successfully' };
};

/**
 * Trigger a manual sync for an integration.
 * For now this just updates `lastSyncAt` and sets status to ACTIVE.
 * Actual API calls to third-party providers would be implemented later.
 */
export const syncIntegration = async (id: string, userId: string) => {
  const integration = await prisma.storeIntegration.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!integration) {
    throw new AppError('Integration not found', 404);
  }

  if (integration.store.ownerId !== userId) {
    throw new AppError('You are not authorized to sync this integration', 403);
  }

  const updatedIntegration = await prisma.storeIntegration.update({
    where: { id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: null,
      status: 'ACTIVE',
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return maskIntegrationSecrets(updatedIntegration);
};

/**
 * Get integration statistics for a store.
 * Returns counts by status and last sync timestamps.
 */
export const getIntegrationStats = async (storeId: string, userId: string) => {
  await verifyStoreOwnership(storeId, userId);

  const integrations = await prisma.storeIntegration.findMany({
    where: { storeId },
    select: {
      id: true,
      type: true,
      status: true,
      lastSyncAt: true,
      lastSyncError: true,
    },
  });

  const statusCounts = {
    active: 0,
    inactive: 0,
    error: 0,
    total: integrations.length,
  };

  const integrationSummaries = integrations.map((integration) => {
    if (integration.status === 'ACTIVE') statusCounts.active++;
    else if (integration.status === 'INACTIVE') statusCounts.inactive++;
    else if (integration.status === 'ERROR') statusCounts.error++;

    return {
      id: integration.id,
      type: integration.type,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      lastSyncError: integration.lastSyncError,
    };
  });

  return {
    statusCounts,
    integrations: integrationSummaries,
  };
};
