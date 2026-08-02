// prisma/seed.js
// Run with: npx prisma db seed
// Populates: fake customers, fake vendors + approved stores, fake products with images.

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { faker } = require('@faker-js/faker')

const prisma = new PrismaClient()

// ---- Config ----
const NUM_VENDORS = 8          // each gets their own approved store
const NUM_CUSTOMERS = 25
const PRODUCTS_PER_STORE = 20  // 8 * 20 = 160 products
const DEFAULT_PASSWORD = 'Password123!'
const BCRYPT_COST = 12         // must match lib/auth.js hashPassword()

const CATEGORIES = [
  'Clothing', 'Electronics', 'Accessories', 'Footwear',
  'Home & Kitchen', 'Beauty', 'Sports', 'Books', 'Toys', 'Grocery',
]

// ---- Helpers ----
function makeUserId() {
  // Same format your real register route uses (app/api/auth/register/route.js)
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function productImages(seedBase, count = 3) {
  return Array.from({ length: count }, (_, i) =>
    `https://picsum.photos/seed/${encodeURIComponent(seedBase)}-${i}/600/600`
  )
}

async function main() {
  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_COST)

  // ---------------------------------------------------------------------
  // 1. VENDORS (User + their Store)
  // ---------------------------------------------------------------------
  const stores = []

  for (let i = 0; i < NUM_VENDORS; i++) {
    const name = faker.person.fullName()
    const storeName = faker.company.name()
    const username = `${slugify(storeName)}-${i}` // ensure uniqueness

    const vendorUser = await prisma.user.create({
      data: {
        id: makeUserId(),
        name,
        email: faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase(),
        image: '',
        passwordHash,
        role: 'VENDOR',
        isEmailVerified: true,
      },
    })

    const store = await prisma.store.create({
      data: {
        userId: vendorUser.id,
        name: storeName,
        description: faker.company.catchPhrase() + '. ' + faker.lorem.sentence(12),
        username,
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()}`,
        status: 'APPROVED',     // bypass manual admin approval for seed data
        isActive: true,         // required for the store to show up publicly
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(storeName)}&background=random&size=256`,
        email: faker.internet.email().toLowerCase(),
        contact: faker.phone.number(),
        commission: 10,
      },
    })

    stores.push(store)
    console.log(`Created vendor "${name}" with store "${storeName}"`)
  }

  // ---------------------------------------------------------------------
  // 2. CUSTOMERS
  // ---------------------------------------------------------------------
  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const name = faker.person.fullName()
    await prisma.user.create({
      data: {
        id: makeUserId(),
        name,
        email: faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase(),
        image: '',
        passwordHash,
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
    })
  }
  console.log(`Created ${NUM_CUSTOMERS} customers`)

  // ---------------------------------------------------------------------
  // 3. PRODUCTS — per store
  // ---------------------------------------------------------------------
  let totalProducts = 0

  for (const store of stores) {
    const productsData = Array.from({ length: PRODUCTS_PER_STORE }, () => {
      const category = faker.helpers.arrayElement(CATEGORIES)
      const name = faker.commerce.productName()
      const mrp = Number(faker.commerce.price({ min: 300, max: 8000, dec: 0 }))
      const discountPct = faker.number.int({ min: 0, max: 30 })
      const price = Math.round(mrp * (1 - discountPct / 100))

      return {
        name,
        description: faker.commerce.productDescription() + ' ' + faker.lorem.sentence(15),
        mrp,
        price,
        images: productImages(`${store.username}-${slugify(name)}-${faker.string.alphanumeric(6)}`),
        category,
        inStock: true,
        stockCount: faker.number.int({ min: 5, max: 200 }),
        storeId: store.id,
        isActive: true,
      }
    })

    await prisma.product.createMany({ data: productsData })
    totalProducts += productsData.length
  }

  console.log(`Created ${totalProducts} products across ${stores.length} stores`)
  console.log('---')
  console.log(`All seeded users can log in with password: ${DEFAULT_PASSWORD}`)
  console.log('Seeding complete.')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })