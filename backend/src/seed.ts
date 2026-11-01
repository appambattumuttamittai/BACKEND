import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { weight: '250gm', weightGrams: 250, price: 150 },
  { weight: '500gm', weightGrams: 500, price: 300 },
  { weight: '750gm', weightGrams: 750, price: 450 },
  { weight: '1kg', weightGrams: 1000, price: 600 },
];

async function main() {
  console.log('Seeding products...');
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { weight: p.weight } });
    if (!existing) {
      await prisma.product.create({ data: p });
      console.log(`Created product: ${p.weight} @ ₹${p.price}`);
    } else {
      console.log(`Product already exists: ${p.weight}`);
    }
  }
  console.log('Seed complete!');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
