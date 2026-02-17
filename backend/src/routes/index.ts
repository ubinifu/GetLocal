import { Express } from 'express';
import authRoutes from './auth.routes';
import storeRoutes from './store.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import reviewRoutes from './review.routes';
import notificationRoutes from './notification.routes';
import favoriteRoutes from './favorite.routes';
import messageRoutes from './message.routes';
import promotionRoutes from './promotion.routes';
import integrationRoutes from './integration.routes';
import adminRoutes from './admin.routes';

// ---------------------------------------------------------------------------
// Route Registration
// ---------------------------------------------------------------------------
// This function is called by app.ts to register all API routes.
// ---------------------------------------------------------------------------

export function registerRoutes(app: Express): void {
  // ─── Health check ───────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── Domain routes ──────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/stores', storeRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api', messageRoutes);
  app.use('/api', promotionRoutes);
  app.use('/api/integrations', integrationRoutes);
  app.use('/api/admin', adminRoutes);
}

export default registerRoutes;
