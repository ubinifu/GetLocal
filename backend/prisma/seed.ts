import { PrismaClient, UserRole, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Password123';
const BCRYPT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GL-${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

async function main() {
  console.log('[Seed] Starting database seed...');

  const passwordHash = await hashPassword(SEED_PASSWORD);

  // ── Clean existing data (in reverse dependency order) ───────────────────
  console.log('[Seed] Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  // ── Admin Users ─────────────────────────────────────────────────────────
  console.log('[Seed] Creating admin users...');

  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@getlocal.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      phone: '+1-555-000-0001',
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'support@getlocal.com',
      passwordHash,
      firstName: 'Support',
      lastName: 'Admin',
      phone: '+1-555-000-0002',
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  console.log(`[Seed] Created admins: ${admin1.email}, ${admin2.email}`);

  // ── Store Owners ────────────────────────────────────────────────────────
  console.log('[Seed] Creating store owners...');

  const owner1 = await prisma.user.create({
    data: {
      email: 'maria@cornermart.com',
      passwordHash,
      firstName: 'Maria',
      lastName: 'Garcia',
      phone: '+1-555-100-0001',
      role: UserRole.STORE_OWNER,
      isVerified: true,
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      email: 'james@quickstop.com',
      passwordHash,
      firstName: 'James',
      lastName: 'Wilson',
      phone: '+1-555-100-0002',
      role: UserRole.STORE_OWNER,
      isVerified: true,
    },
  });

  const owner3 = await prisma.user.create({
    data: {
      email: 'aisha@freshcorner.com',
      passwordHash,
      firstName: 'Aisha',
      lastName: 'Patel',
      phone: '+1-555-100-0003',
      role: UserRole.STORE_OWNER,
      isVerified: true,
    },
  });

  const owner4 = await prisma.user.create({
    data: {
      email: 'amber@amberssubshop.com',
      passwordHash,
      firstName: 'Amber',
      lastName: 'Owner',
      phone: '+1-845-342-4814',
      role: UserRole.STORE_OWNER,
      isVerified: true,
    },
  });

  console.log(
    `[Seed] Created store owners: ${owner1.email}, ${owner2.email}, ${owner3.email}, ${owner4.email}`,
  );

  // ── Customer Users ──────────────────────────────────────────────────────
  console.log('[Seed] Creating customers...');

  const customer1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Johnson',
      phone: '+1-555-200-0001',
      role: UserRole.CUSTOMER,
      isVerified: true,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Smith',
      phone: '+1-555-200-0002',
      role: UserRole.CUSTOMER,
      isVerified: true,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'carol@example.com',
      passwordHash,
      firstName: 'Carol',
      lastName: 'Davis',
      phone: '+1-555-200-0003',
      role: UserRole.CUSTOMER,
      isVerified: false,
    },
  });

  console.log(
    `[Seed] Created customers: ${customer1.email}, ${customer2.email}, ${customer3.email}`,
  );

  // ── Stores ──────────────────────────────────────────────────────────────
  console.log('[Seed] Creating stores...');

  const storeHours = {
    monday: { open: '07:00', close: '21:00' },
    tuesday: { open: '07:00', close: '21:00' },
    wednesday: { open: '07:00', close: '21:00' },
    thursday: { open: '07:00', close: '21:00' },
    friday: { open: '07:00', close: '22:00' },
    saturday: { open: '08:00', close: '22:00' },
    sunday: { open: '09:00', close: '18:00' },
  };

  const store1 = await prisma.store.create({
    data: {
      ownerId: owner1.id,
      name: "Maria's Corner Mart",
      description:
        'A family-owned corner store serving the neighborhood for over 15 years. Fresh produce, snacks, and everyday essentials.',
      address: '123 Main Street',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      latitude: 40.6892,
      longitude: -73.9857,
      phone: '+1-555-300-0001',
      email: 'info@cornermart.com',
      isActive: true,
      hours: storeHours,
      rating: 4.5,
      reviewCount: 3,
    },
  });

  const store2 = await prisma.store.create({
    data: {
      ownerId: owner2.id,
      name: 'Quick Stop Convenience',
      description:
        'Your one-stop shop for beverages, snacks, and household essentials. Open late for your convenience.',
      address: '456 Oak Avenue',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11215',
      latitude: 40.6681,
      longitude: -73.9822,
      phone: '+1-555-300-0002',
      email: 'info@quickstop.com',
      isActive: true,
      hours: {
        ...storeHours,
        friday: { open: '06:00', close: '23:00' },
        saturday: { open: '06:00', close: '23:00' },
      },
      rating: 4.2,
      reviewCount: 2,
    },
  });

  const store3 = await prisma.store.create({
    data: {
      ownerId: owner3.id,
      name: 'Fresh Corner Market',
      description:
        'Specializing in fresh produce, organic dairy, and artisan snacks. Quality you can taste.',
      address: '789 Elm Boulevard',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11217',
      latitude: 40.6826,
      longitude: -73.9754,
      phone: '+1-555-300-0003',
      email: 'info@freshcorner.com',
      isActive: true,
      hours: storeHours,
      rating: 4.8,
      reviewCount: 1,
    },
  });

  const store4 = await prisma.store.create({
    data: {
      ownerId: owner4.id,
      name: "Amber's Sub Shop",
      description:
        'A beloved Middletown deli serving overstuffed sandwiches, breakfast favorites, and homemade salads with premium Boar\'s Head meats since day one.',
      address: '125 W Main Street',
      city: 'Middletown',
      state: 'NY',
      zipCode: '10940',
      latitude: 41.4459,
      longitude: -74.4225,
      phone: '+1-845-342-4814',
      email: 'info@amberssubshop.com',
      imageUrl: '/images/stores/ambers-sub-shop.svg',
      isActive: true,
      hours: {
        monday: { open: '06:00', close: '19:00' },
        tuesday: { open: '06:00', close: '19:00' },
        wednesday: { open: '06:00', close: '19:00' },
        thursday: { open: '06:00', close: '19:00' },
        friday: { open: '06:00', close: '19:00' },
        saturday: { open: '06:00', close: '19:00' },
        sunday: { open: '06:00', close: '18:00' },
      },
      rating: 4.0,
      reviewCount: 2,
      defaultPrepTime: 10,
    },
  });

  console.log(
    `[Seed] Created stores: ${store1.name}, ${store2.name}, ${store3.name}, ${store4.name}`,
  );

  // ── Categories ──────────────────────────────────────────────────────────
  console.log('[Seed] Creating categories...');

  const [catSnacks, catBeverages, catDairy, catHousehold, catProduce] =
    await Promise.all([
      prisma.category.create({
        data: {
          name: 'Snacks',
          description: 'Chips, cookies, candy, and other snack items',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Beverages',
          description: 'Sodas, juices, water, coffee, and tea',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Dairy',
          description: 'Milk, cheese, yogurt, and other dairy products',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Household',
          description: 'Cleaning supplies, paper goods, and home essentials',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Fresh Produce',
          description: 'Fresh fruits and vegetables',
        },
      }),
    ]);

  const [catBreakfast, catSubsHeroes, catWraps, catSalads] = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Breakfast',
        description: 'Breakfast sandwiches, omelettes, and morning favorites',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Subs & Heroes',
        description: 'Cold and hot submarine sandwiches and heroes',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Wraps',
        description: 'Tortilla wraps with various fillings',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Salads',
        description: 'Fresh salads and homemade salad platters',
      },
    }),
  ]);

  console.log(
    `[Seed] Created categories: ${catSnacks.name}, ${catBeverages.name}, ${catDairy.name}, ${catHousehold.name}, ${catProduce.name}, ${catBreakfast.name}, ${catSubsHeroes.name}, ${catWraps.name}, ${catSalads.name}`,
  );

  // ── Products ────────────────────────────────────────────────────────────
  console.log('[Seed] Creating products...');

  // Store 1 - Maria's Corner Mart (7 products)
  const products = await Promise.all([
    // --- Store 1 products (indices 0-6) ---
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catSnacks.id,
        name: 'Classic Potato Chips',
        description: 'Crispy salted potato chips, family size bag',
        price: 4.99,
        compareAtPrice: 5.99,
        sku: 'MCM-SNK-001',
        barcode: '012345678901',
        stockQuantity: 50,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catSnacks.id,
        name: 'Chocolate Chip Cookies',
        description: 'Homestyle chocolate chip cookies, 12-pack',
        price: 5.49,
        sku: 'MCM-SNK-002',
        barcode: '012345678902',
        stockQuantity: 35,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catBeverages.id,
        name: 'Orange Juice',
        description: 'Fresh-squeezed orange juice, 32oz',
        price: 6.99,
        sku: 'MCM-BEV-001',
        barcode: '012345678903',
        stockQuantity: 20,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catDairy.id,
        name: 'Whole Milk',
        description: 'Farm-fresh whole milk, 1 gallon',
        price: 4.49,
        sku: 'MCM-DRY-001',
        barcode: '012345678904',
        stockQuantity: 15,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catProduce.id,
        name: 'Organic Bananas',
        description: 'Bunch of 6 organic bananas',
        price: 2.99,
        sku: 'MCM-PRD-001',
        barcode: '012345678905',
        stockQuantity: 40,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catHousehold.id,
        name: 'Paper Towels',
        description: 'Ultra-absorbent paper towels, 6-roll pack',
        price: 8.99,
        sku: 'MCM-HH-001',
        barcode: '012345678906',
        stockQuantity: 25,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: catProduce.id,
        name: 'Fresh Avocados',
        description: 'Ripe Hass avocados, pack of 3',
        price: 4.99,
        sku: 'MCM-PRD-002',
        barcode: '012345678907',
        stockQuantity: 30,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),

    // --- Store 2 - Quick Stop Convenience (indices 7-12) ---
    prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: catBeverages.id,
        name: 'Cola 12-Pack',
        description: 'Classic cola, 12 cans of 12oz',
        price: 7.99,
        compareAtPrice: 9.49,
        sku: 'QSC-BEV-001',
        barcode: '023456789001',
        stockQuantity: 60,
        lowStockThreshold: 15,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: catBeverages.id,
        name: 'Bottled Water 24-Pack',
        description: 'Purified spring water, 24 bottles of 16.9oz',
        price: 5.99,
        sku: 'QSC-BEV-002',
        barcode: '023456789002',
        stockQuantity: 45,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: catSnacks.id,
        name: 'Trail Mix',
        description: 'Assorted nuts and dried fruit, 16oz bag',
        price: 8.49,
        sku: 'QSC-SNK-001',
        barcode: '023456789003',
        stockQuantity: 30,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: catHousehold.id,
        name: 'All-Purpose Cleaner',
        description: 'Multi-surface cleaning spray, 32oz',
        price: 4.99,
        sku: 'QSC-HH-001',
        barcode: '023456789004',
        stockQuantity: 20,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: catDairy.id,
        name: 'Greek Yogurt',
        description: 'Plain Greek yogurt, 32oz tub',
        price: 5.99,
        sku: 'QSC-DRY-001',
        barcode: '023456789005',
        stockQuantity: 18,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: catSnacks.id,
        name: 'Beef Jerky',
        description: 'Original smoked beef jerky, 10oz',
        price: 9.99,
        sku: 'QSC-SNK-002',
        barcode: '023456789006',
        stockQuantity: 25,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),

    // --- Store 3 - Fresh Corner Market (indices 13-19) ---
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catProduce.id,
        name: 'Organic Strawberries',
        description: 'Locally-grown organic strawberries, 1 lb',
        price: 5.99,
        sku: 'FCM-PRD-001',
        barcode: '034567890001',
        stockQuantity: 25,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catProduce.id,
        name: 'Mixed Salad Greens',
        description: 'Pre-washed organic mixed greens, 10oz',
        price: 4.49,
        sku: 'FCM-PRD-002',
        barcode: '034567890002',
        stockQuantity: 30,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catDairy.id,
        name: 'Artisan Cheddar Cheese',
        description: 'Aged sharp cheddar, 8oz block',
        price: 7.99,
        sku: 'FCM-DRY-001',
        barcode: '034567890003',
        stockQuantity: 15,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catDairy.id,
        name: 'Organic Whole Milk',
        description: 'Grass-fed organic whole milk, half gallon',
        price: 5.49,
        sku: 'FCM-DRY-002',
        barcode: '034567890004',
        stockQuantity: 20,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catSnacks.id,
        name: 'Artisan Granola',
        description: 'Honey almond granola with dried cranberries, 12oz',
        price: 6.99,
        sku: 'FCM-SNK-001',
        barcode: '034567890005',
        stockQuantity: 35,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catBeverages.id,
        name: 'Cold Brew Coffee',
        description: 'Small-batch cold brew coffee, 32oz',
        price: 8.99,
        sku: 'FCM-BEV-001',
        barcode: '034567890006',
        stockQuantity: 12,
        lowStockThreshold: 4,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store3.id,
        categoryId: catProduce.id,
        name: 'Heirloom Tomatoes',
        description: 'Vine-ripened heirloom tomatoes, 1 lb',
        price: 4.99,
        sku: 'FCM-PRD-003',
        barcode: '034567890007',
        stockQuantity: 22,
        lowStockThreshold: 6,
        isActive: true,
      },
    }),

    // --- Store 4 - Amber's Sub Shop (indices 20-34) ---

    // Breakfast items
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catBreakfast.id,
        name: 'Bacon, Egg & Cheese',
        description: 'Classic breakfast sandwich with crispy bacon, fresh egg, and melted American cheese on a roll',
        price: 6.99,
        imageUrl: '/images/products/bacon-egg-cheese.svg',
        sku: 'ASS-BRK-001',
        barcode: '045678901001',
        stockQuantity: 50,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catBreakfast.id,
        name: 'Cheese Steak Omelette',
        description: 'Fluffy omelette loaded with cheese steak, peppers, onions, and melted cheese - a crowd favorite',
        price: 10.99,
        imageUrl: '/images/products/cheesesteak-omelette.svg',
        sku: 'ASS-BRK-002',
        barcode: '045678901002',
        stockQuantity: 30,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catBreakfast.id,
        name: 'Sausage, Egg & Cheese',
        description: 'Savory sausage patty with egg and melted cheese on a fresh roll',
        price: 6.99,
        imageUrl: '/images/products/sausage-egg-cheese.svg',
        sku: 'ASS-BRK-003',
        barcode: '045678901003',
        stockQuantity: 45,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catBreakfast.id,
        name: 'Western Omelette',
        description: 'Ham, peppers, onions, and cheese folded into a fluffy omelette',
        price: 9.99,
        imageUrl: '/images/products/western-omelette.svg',
        sku: 'ASS-BRK-004',
        barcode: '045678901004',
        stockQuantity: 30,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),

    // Subs & Heroes
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSubsHeroes.id,
        name: 'Italian Combo Hero',
        description: 'Boar\'s Head ham, salami, capicola, provolone, lettuce, tomato, onion, oil & vinegar on a fresh hero',
        price: 13.99,
        imageUrl: '/images/products/italian-combo.svg',
        sku: 'ASS-SUB-001',
        barcode: '045678901005',
        stockQuantity: 40,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSubsHeroes.id,
        name: 'Turkey & Roast Beef Hero',
        description: 'Boar\'s Head ovengold turkey and roast beef with lettuce, tomato, and your choice of cheese',
        price: 13.99,
        imageUrl: '/images/products/turkey-roast-beef.svg',
        sku: 'ASS-SUB-002',
        barcode: '045678901006',
        stockQuantity: 35,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSubsHeroes.id,
        name: 'Chicken Cutlet Sandwich',
        description: 'Crispy breaded chicken cutlet with lettuce, tomato, and mayo on a hero roll',
        price: 12.99,
        imageUrl: '/images/products/chicken-cutlet.svg',
        sku: 'ASS-SUB-003',
        barcode: '045678901007',
        stockQuantity: 40,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSubsHeroes.id,
        name: 'Philly Cheese Steak',
        description: 'Thinly sliced steak with sautéed peppers, onions, and melted cheese on a hoagie roll',
        price: 13.99,
        imageUrl: '/images/products/philly-cheesesteak.svg',
        sku: 'ASS-SUB-004',
        barcode: '045678901008',
        stockQuantity: 35,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSubsHeroes.id,
        name: 'Boar\'s Head Ham & Cheese',
        description: 'Premium Boar\'s Head ham with your choice of cheese, lettuce, tomato on a fresh sub roll',
        price: 12.49,
        imageUrl: '/images/products/ham-cheese.svg',
        sku: 'ASS-SUB-005',
        barcode: '045678901009',
        stockQuantity: 40,
        lowStockThreshold: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSubsHeroes.id,
        name: 'Meatball Parm Hero',
        description: 'Homemade meatballs smothered in marinara sauce with melted mozzarella on a toasted hero',
        price: 12.99,
        imageUrl: '/images/products/meatball-parm.svg',
        sku: 'ASS-SUB-006',
        barcode: '045678901010',
        stockQuantity: 30,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),

    // Wraps
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catWraps.id,
        name: 'Chicken Caesar Wrap',
        description: 'Grilled chicken, romaine lettuce, parmesan, and Caesar dressing in a flour tortilla',
        price: 11.99,
        imageUrl: '/images/products/chicken-caesar-wrap.svg',
        sku: 'ASS-WRP-001',
        barcode: '045678901011',
        stockQuantity: 35,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catWraps.id,
        name: 'BBQ Rib Wrap',
        description: 'Tender BBQ rib meat with coleslaw and pickles in a warm tortilla wrap',
        price: 12.99,
        imageUrl: '/images/products/bbq-rib-wrap.svg',
        sku: 'ASS-WRP-002',
        barcode: '045678901012',
        stockQuantity: 25,
        lowStockThreshold: 6,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catWraps.id,
        name: 'Turkey Club Wrap',
        description: 'Boar\'s Head turkey, bacon, lettuce, tomato, and mayo in a flour tortilla',
        price: 11.99,
        imageUrl: '/images/products/turkey-club-wrap.svg',
        sku: 'ASS-WRP-003',
        barcode: '045678901013',
        stockQuantity: 35,
        lowStockThreshold: 8,
        isActive: true,
      },
    }),

    // Salads
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSalads.id,
        name: 'Homemade Chicken Salad',
        description: 'Amber\'s famous homemade chicken salad on a bed of mixed greens with tomato and cucumber',
        price: 10.99,
        imageUrl: '/images/products/chicken-salad.svg',
        sku: 'ASS-SAL-001',
        barcode: '045678901014',
        stockQuantity: 20,
        lowStockThreshold: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        storeId: store4.id,
        categoryId: catSalads.id,
        name: 'Garden Salad',
        description: 'Fresh mixed greens, tomatoes, cucumbers, red onion, and croutons with your choice of dressing',
        price: 8.99,
        imageUrl: '/images/products/garden-salad.svg',
        sku: 'ASS-SAL-002',
        barcode: '045678901015',
        stockQuantity: 25,
        lowStockThreshold: 6,
        isActive: true,
      },
    }),
  ]);

  console.log(`[Seed] Created ${products.length} products`);

  // ── Orders ──────────────────────────────────────────────────────────────
  console.log('[Seed] Creating orders...');

  // Order 1: Alice orders from Maria's Corner Mart (completed)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer1.id,
      storeId: store1.id,
      status: OrderStatus.PICKED_UP,
      subtotal: 16.97,
      tax: 1.51,
      total: 18.48,
      pickupTime: new Date('2026-02-14T15:30:00Z'),
      notes: 'Will pick up after work',
      items: {
        create: [
          {
            productId: products[0].id, // Classic Potato Chips
            quantity: 2,
            unitPrice: 4.99,
            totalPrice: 9.98,
          },
          {
            productId: products[2].id, // Orange Juice
            quantity: 1,
            unitPrice: 6.99,
            totalPrice: 6.99,
          },
        ],
      },
    },
  });

  // Order 2: Bob orders from Quick Stop (ready for pickup)
  const order2 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer2.id,
      storeId: store2.id,
      status: OrderStatus.READY,
      subtotal: 22.47,
      tax: 2.00,
      total: 24.47,
      pickupTime: new Date('2026-02-15T12:00:00Z'),
      items: {
        create: [
          {
            productId: products[7].id, // Cola 12-Pack
            quantity: 1,
            unitPrice: 7.99,
            totalPrice: 7.99,
          },
          {
            productId: products[9].id, // Trail Mix
            quantity: 1,
            unitPrice: 8.49,
            totalPrice: 8.49,
          },
          {
            productId: products[11].id, // Greek Yogurt
            quantity: 1,
            unitPrice: 5.99,
            totalPrice: 5.99,
          },
        ],
      },
    },
  });

  // Order 3: Alice orders from Fresh Corner Market (pending)
  const order3 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer1.id,
      storeId: store3.id,
      status: OrderStatus.PENDING,
      subtotal: 18.47,
      tax: 1.64,
      total: 20.11,
      pickupTime: new Date('2026-02-16T10:00:00Z'),
      notes: 'Please pick the ripest strawberries',
      items: {
        create: [
          {
            productId: products[13].id, // Organic Strawberries
            quantity: 1,
            unitPrice: 5.99,
            totalPrice: 5.99,
          },
          {
            productId: products[14].id, // Mixed Salad Greens
            quantity: 1,
            unitPrice: 4.49,
            totalPrice: 4.49,
          },
          {
            productId: products[15].id, // Artisan Cheddar Cheese
            quantity: 1,
            unitPrice: 7.99,
            totalPrice: 7.99,
          },
        ],
      },
    },
  });

  // Order 4: Bob orders from Maria's Corner Mart (cancelled)
  const order4 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer2.id,
      storeId: store1.id,
      status: OrderStatus.CANCELLED,
      subtotal: 13.48,
      tax: 1.20,
      total: 14.68,
      items: {
        create: [
          {
            productId: products[3].id, // Whole Milk
            quantity: 1,
            unitPrice: 4.49,
            totalPrice: 4.49,
          },
          {
            productId: products[5].id, // Paper Towels
            quantity: 1,
            unitPrice: 8.99,
            totalPrice: 8.99,
          },
        ],
      },
    },
  });

  // Order 5: Carol orders from Quick Stop (preparing)
  const order5 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer3.id,
      storeId: store2.id,
      status: OrderStatus.PREPARING,
      subtotal: 15.98,
      tax: 1.42,
      total: 17.40,
      pickupTime: new Date('2026-02-15T17:00:00Z'),
      items: {
        create: [
          {
            productId: products[8].id, // Bottled Water 24-Pack
            quantity: 1,
            unitPrice: 5.99,
            totalPrice: 5.99,
          },
          {
            productId: products[12].id, // Beef Jerky
            quantity: 1,
            unitPrice: 9.99,
            totalPrice: 9.99,
          },
        ],
      },
    },
  });

  console.log(
    `[Seed] Created 5 orders: ${order1.orderNumber}, ${order2.orderNumber}, ${order3.orderNumber}, ${order4.orderNumber}, ${order5.orderNumber}`,
  );

  // ── Reviews ─────────────────────────────────────────────────────────────
  console.log('[Seed] Creating reviews...');

  await Promise.all([
    // Reviews for Maria's Corner Mart (3 reviews)
    prisma.review.create({
      data: {
        customerId: customer1.id,
        storeId: store1.id,
        orderId: order1.id,
        rating: 5,
        comment:
          'Wonderful store! Maria always has the freshest produce and is so friendly. The pickup experience was seamless.',
      },
    }),
    prisma.review.create({
      data: {
        customerId: customer2.id,
        storeId: store1.id,
        rating: 4,
        comment:
          'Great selection and fair prices. Wish they had more organic options, but overall a solid neighborhood store.',
      },
    }),
    prisma.review.create({
      data: {
        customerId: customer3.id,
        storeId: store1.id,
        rating: 5,
        comment:
          'Love that I can order ahead and just pick up. Saves so much time!',
      },
    }),

    // Reviews for Quick Stop Convenience (2 reviews)
    prisma.review.create({
      data: {
        customerId: customer2.id,
        storeId: store2.id,
        orderId: order2.id,
        rating: 4,
        comment:
          'Very convenient location and great hours. The pickup process is quick and easy.',
      },
    }),
    prisma.review.create({
      data: {
        customerId: customer1.id,
        storeId: store2.id,
        rating: 4,
        comment:
          'Good snack selection. Prices are a bit higher than grocery stores but the convenience makes up for it.',
      },
    }),

    // Review for Fresh Corner Market (1 review)
    prisma.review.create({
      data: {
        customerId: customer1.id,
        storeId: store3.id,
        rating: 5,
        comment:
          'The best produce in the neighborhood, hands down! Everything is so fresh and the organic options are amazing.',
      },
    }),

    // Reviews for Amber's Sub Shop (2 reviews)
    prisma.review.create({
      data: {
        customerId: customer1.id,
        storeId: store4.id,
        rating: 4,
        comment:
          'Excellent heroes! Overstuffed with Boar\'s Head meats. The Italian combo is worth every penny of that $14. Will definitely be back.',
      },
    }),
    prisma.review.create({
      data: {
        customerId: customer2.id,
        storeId: store4.id,
        rating: 4,
        comment:
          'The cheese steak omelette is a must-try for breakfast. Huge portions and friendly service. Love this local gem!',
      },
    }),
  ]);

  console.log('[Seed] Created 8 reviews');

  // ── Notifications ───────────────────────────────────────────────────────
  console.log('[Seed] Creating sample notifications...');

  await Promise.all([
    prisma.notification.create({
      data: {
        userId: customer1.id,
        type: 'ORDER_STATUS',
        title: 'Order Picked Up',
        message: `Your order ${order1.orderNumber} has been picked up. Thanks for shopping with us!`,
        isRead: true,
        data: { orderId: order1.id, status: 'PICKED_UP' },
      },
    }),
    prisma.notification.create({
      data: {
        userId: customer2.id,
        type: 'ORDER_STATUS',
        title: 'Order Ready for Pickup',
        message: `Your order ${order2.orderNumber} is ready! Head to Quick Stop Convenience to pick it up.`,
        isRead: false,
        data: { orderId: order2.id, status: 'READY' },
      },
    }),
    prisma.notification.create({
      data: {
        userId: owner1.id,
        type: 'LOW_STOCK',
        title: 'Low Stock Alert',
        message:
          'Whole Milk is running low (15 remaining). Consider restocking soon.',
        isRead: false,
        data: { productId: products[3].id, stockQuantity: 15 },
      },
    }),
    prisma.notification.create({
      data: {
        userId: customer1.id,
        type: 'PROMOTION',
        title: 'Weekend Special!',
        message:
          'Fresh Corner Market has 20% off all organic produce this weekend!',
        isRead: false,
        data: { storeId: store3.id },
      },
    }),
  ]);

  console.log('[Seed] Created 4 notifications');

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n[Seed] Database seeded successfully!');
  console.log('[Seed] Summary:');
  console.log('  - 2 admin users');
  console.log('  - 4 store owners');
  console.log('  - 3 customers');
  console.log('  - 4 stores (incl. Amber\'s Sub Shop, Middletown NY)');
  console.log('  - 9 categories');
  console.log(`  - ${products.length} products`);
  console.log('  - 5 orders (with order items)');
  console.log('  - 8 reviews');
  console.log('  - 4 notifications');
  console.log(`\n[Seed] All seed passwords: "${SEED_PASSWORD}"`);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('[Seed] Error seeding database:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
