import { PrismaClient, Category } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// PLACEHOLDER prices (INR). The owner sets real prices/stock from the Admin page.
const oils = ['Groundnut Oil', 'Sesame (Gingelly) Oil', 'Coconut Oil', 'Sunflower Oil'];
const dry = ['Cashew', 'Almonds', 'Raisins', 'Dates'];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 12 chars) before seeding.');
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'VSP Owner', email, role: 'ADMIN', isVerified: true,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    },
  });

  const make = async (name: string, category: Category, labels: [string, number][]) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const imageUrl = category === 'OIL' ? '/images/products/oil.svg' : '/images/products/dry-fruit.svg';
    await prisma.product.upsert({
      where: { slug },
      update: { imageUrl },
      create: {
        slug, name, category, imageUrl,
        description: category === 'OIL'
          ? 'Cold pressed in small batches and bottled for your kitchen.'
          : 'Carefully sorted and packed fresh. Good for snacking, sweets and gifting.',
        variants: { create: labels.map(([label, price]) => ({ label, price, stock: 20 })) },
      },
    });
  };
  for (const n of oils) await make(n, 'OIL', [['500 ml', 260], ['1 L', 500], ['5 L', 2400]]);
  for (const n of dry) await make(n, 'DRY_FRUIT', [['250 g', 220], ['500 g', 430], ['1 kg', 850]]);
}

main().finally(() => prisma.$disconnect());
