# Local Corner Store Pickup Platform - Project Reference

## Database Migrations
Always verify migration compatibility before running:
1. Check existing data constraints before adding new column constraints
2. Handle foreign key dependencies in correct order
3. Test migrations against current production data state (e.g., existing values must satisfy new CHECK constraints)
4. When PostgreSQL syntax issues arise, verify version-specific compatibility (e.g., FILTER clauses)

## API Conventions
- All API request/response payloads use camelCase field names (not snake_case)
- Always register new endpoints BEFORE any catch-all/404 handlers in the router
- When testing endpoints, verify the actual response format matches assertions before claiming tests pass

## Testing Protocol
- After claiming tests pass, always re-run the full suite one more time to confirm
- Never claim a feature is working without actually testing it in the browser/endpoint
- Run E2E tests with correct credentials (check test fixtures for current vendor/user creds)
- After multi-file changes, run both unit tests AND Playwright E2E tests before declaring done

## Deployment (Fly.io)
- After `fly deploy`, always check machine status with `fly status` and verify the app is actually running
- Common issues: missing COPY directives in Dockerfile, CSP headers blocking new external APIs, app crashes requiring `fly logs` inspection
- Always run migrations on the production database after deploy if schema changes were made

## Frontend Conventions
- This project uses JavaScript (not TypeScript) for frontend code despite TypeScript being in the stack
- Avoid duplicate variable declarations — always search the file for existing declarations before adding new ones
- When adding external API calls from the browser, use a server-side proxy to avoid CORS/CSP issues
- Glassmorphism styles: keep backgrounds light (rgba values with high alpha), test dark-themed pages specifically

## Project Overview
A mobile-first application connecting local customers with independent corner stores for product ordering and in-store pickup, featuring real-time inventory management and seamless communication between customers and store owners.

## Technology Stack

### Frontend (Mobile & Web)
- **iOS**: Swift with UIKit/SwiftUI, Xcode 14+
- **Android**: Kotlin with Jetpack Compose, Android Studio
- **Cross-Platform**: React Native or Flutter (alternative)
- **Web App**: React.js with TypeScript, Vite
- **UI Framework**: Tailwind CSS + Headless UI
- **State Management**: Redux Toolkit or MobX-State-Tree

### Backend & API
- **Runtime**: Node.js 18+ with Express.js
- **Language**: TypeScript
- **API**: RESTful + GraphQL
- **Auth**: JWT + OAuth 2.0 (Google, Apple, Facebook)
- **Validation**: Joi or Zod
- **Documentation**: Swagger/OpenAPI 3.0

### Database & Storage
- **Primary DB**: PostgreSQL 15+ with JSONB
- **Caching**: Redis
- **File Storage**: AWS S3
- **Search**: Elasticsearch
- **ORM**: Prisma or TypeORM

### Infrastructure
- **Cloud**: AWS (primary) or Google Cloud
- **Containers**: Docker + docker-compose
- **Orchestration**: AWS ECS or Google Cloud Run
- **CDN**: CloudFlare
- **SSL**: Let's Encrypt

## Core Features

### Customer App Features
- **Store Discovery**: Location-based search with Google Maps integration
- **Product Browsing**: Real-time inventory with search and filters
- **Order Management**: Cart, checkout, order tracking
- **Notifications**: Push notifications for order status updates
- **User Profile**: Order history, favorites, saved preferences
- **Reviews**: Rate stores and products
- **Digital Receipts**: Order history and receipt storage

### Store Owner Features
- **Inventory Management**: Real-time stock updates and product catalog
- **Order Processing**: Order notifications and status management
- **Analytics**: Sales reporting and business intelligence
- **Notifications**: Low-stock alerts and customer communications
- **Integration**: POS system sync (Square, Shopify, Toast)
- **Store Profile**: Hours, contact info, store photos

## Technical Architecture

### Database Schema (Key Tables)
```sql
-- Users (customers and store owners)
users: id, email, password_hash, role, created_at, updated_at

-- Stores
stores: id, owner_id, name, address, coordinates, hours, phone, status

-- Products
products: id, store_id, name, description, price, stock_quantity, category_id

-- Orders
orders: id, customer_id, store_id, status, total_amount, pickup_time, created_at

-- Order Items
order_items: id, order_id, product_id, quantity, unit_price
```

### API Endpoints Structure
```
GET    /api/stores              # Get nearby stores
GET    /api/stores/:id/products # Get store inventory
POST   /api/orders              # Create new order
GET    /api/orders/:id          # Get order details
PUT    /api/orders/:id/status   # Update order status
POST   /api/auth/login          # User authentication
POST   /api/integrations/sync   # Inventory sync
```

## Third-Party Integrations

### Payment Processing
- **Stripe Connect**: Marketplace payments with automatic splits
- **Commission Model**: Platform fee deducted automatically

### POS System Integration
- **Square API**: Inventory sync and order management
- **Shopify API**: E-commerce integration
- **Toast API**: Restaurant POS integration
- **Generic REST**: Custom integration capabilities

### Communication Services
- **Firebase FCM**: Push notifications
- **SendGrid**: Email notifications
- **Twilio**: SMS confirmations and alerts

## Development Workflow

### Environment Setup
```bash
# Backend setup
npm install
cp .env.example .env
docker-compose up -d postgres redis
npm run migrate
npm run seed
npm run dev

# Frontend setup
cd mobile
npm install
npx react-native run-ios
npx react-native run-android
```

### Testing Strategy
- **Unit Tests**: Jest for backend logic
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Cypress for web, Detox for mobile
- **Load Testing**: Artillery for performance testing

## Security Implementation

### Data Protection
- **Encryption**: bcrypt for passwords, AES for sensitive data
- **API Security**: Rate limiting, input validation, CORS
- **Authentication**: JWT with refresh tokens
- **Compliance**: GDPR/CCPA data handling

### Security Checklist
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (Content Security Policy)
- [ ] HTTPS enforcement
- [ ] Rate limiting implementation
- [ ] Audit logging for sensitive operations

## Deployment Configuration

### Production Environment
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    ports:
      - "80:3000"
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: cornerstore_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### CI/CD Pipeline (GitHub Actions)
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci && npm test
      - run: docker build -t app .
      - run: docker push ${{ secrets.REGISTRY_URL }}/app
```

## Monitoring & Analytics

### Application Monitoring
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Infrastructure monitoring and APM
- **Google Analytics**: User behavior tracking
- **Mixpanel**: Event-based analytics

### Key Metrics to Track
- **Customer Metrics**: DAU/MAU, retention rate, order completion rate
- **Business Metrics**: GMV, average order value, store adoption rate
- **Technical Metrics**: API response times, error rates, uptime

## Launch Strategy

### Phase 1: MVP (Months 1-3)
- [ ] Basic customer app (iOS/Android)
- [ ] Store owner dashboard (web)
- [ ] Core ordering functionality
- [ ] Payment processing
- [ ] Basic inventory management

### Phase 2: Enhancement (Months 4-6)
- [ ] Push notifications
- [ ] POS integrations
- [ ] Advanced analytics
- [ ] Customer reviews
- [ ] Marketing features

### Phase 3: Scale (Months 7-12)
- [ ] Multi-city expansion
- [ ] Advanced inventory features
- [ ] Loyalty programs
- [ ] B2B features
- [ ] API marketplace

## Budget Estimates

### Development Costs (6-month timeline)
- **Backend Developer**: $80k - $120k
- **Mobile Developer (iOS/Android)**: $140k - $180k
- **Frontend Developer**: $70k - $100k
- **UI/UX Designer**: $60k - $90k
- **DevOps Engineer**: $40k - $60k
- **Project Manager**: $50k - $70k

### Infrastructure Costs (Monthly)
- **AWS/GCP**: $500 - $2,000 (scales with usage)
- **Third-party APIs**: $200 - $800
- **Security/Monitoring**: $100 - $400
- **App Store fees**: 30% of in-app purchases

### Additional Costs
- **App Store registration**: $100/year (Apple) + $25 (Google)
- **SSL certificates**: Free (Let's Encrypt)
- **Domain registration**: $12/year
- **Legal/compliance**: $5k - $15k

## Risk Mitigation

### Technical Risks
- **Scalability**: Use microservices architecture for future scaling
- **Data Loss**: Automated backups with point-in-time recovery
- **Security Breaches**: Regular security audits and penetration testing

### Business Risks
- **Market Competition**: Focus on local community and personalized service
- **Store Adoption**: Provide excellent onboarding and support
- **Customer Retention**: Implement loyalty programs and excellent UX

## Support Documentation

### Store Onboarding
1. Account creation and verification
2. Inventory setup and integration
3. Order management training
4. Payment setup and tax configuration
5. Marketing materials and promotion

### Customer Support
- **FAQ Section**: Common issues and solutions
- **Live Chat**: Integration with customer support platform
- **Help Videos**: Step-by-step tutorials
- **Contact Forms**: Direct support requests

## Future Enhancements

### Advanced Features (Future Releases)
- **AI Recommendations**: Personalized product suggestions
- **Loyalty Programs**: Points and rewards system
- **Subscription Orders**: Regular delivery setup
- **Social Features**: Share favorites, recommendations
- **Multi-language**: Internationalization support
- **Voice Ordering**: Integration with voice assistants

### Integration Opportunities
- **Delivery Services**: Partner with local delivery providers
- **Payment Methods**: Apple Pay, Google Pay, cryptocurrency
- **Marketing Tools**: Email campaigns, social media integration
- **Analytics**: Advanced business intelligence and reporting

---

## Quick Reference Commands

### Development
```bash
# Start development environment
npm run dev:full

# Run tests
npm run test:all

# Build for production
npm run build:prod

# Deploy to staging
npm run deploy:staging
```

### Database
```bash
# Create migration
npm run migrate:create -- add_new_table

# Run migrations
npm run migrate:up

# Seed database
npm run seed:run
```

### Troubleshooting
- Check logs: `docker-compose logs app`
- Reset database: `npm run db:reset`
- Clear cache: `docker-compose restart redis`
