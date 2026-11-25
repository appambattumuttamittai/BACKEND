"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const products = [
    { weight: '250gm', weightGrams: 250, price: 150 },
    { weight: '500gm', weightGrams: 500, price: 300 },
    { weight: '750gm', weightGrams: 750, price: 450 },
    { weight: '1kg', weightGrams: 1000, price: 600 },
];
const dummyFeedbacks = [
    {
        name: 'Ramesh Kumar',
        rating: 5,
        message: 'Best mutta mittai I have ever tasted! The texture is perfect and the sweetness is just right. My whole family loved it. Will definitely order again!',
        isApproved: true,
    },
    {
        name: 'Priya Lakshmi',
        rating: 5,
        message: 'அருமையான முட்டை மிட்டாய்! பாரம்பரிய சுவை அப்படியே இருக்கிறது. விழுப்புரத்தில் இருந்து எடுத்துச் சென்றேன். மிகவும் திருப்தி.',
        isApproved: true,
    },
    {
        name: 'Suresh Babu',
        rating: 4,
        message: 'Very authentic taste. Reminds me of the traditional sweets from my childhood. The cashew nut flavour is excellent. Pickup was easy and hassle-free.',
        isApproved: true,
    },
    {
        name: 'Kavitha Devi',
        rating: 5,
        message: 'Ordered 1kg pack for our family function. Everyone was asking where we got it from! Pure ingredients, no artificial taste. Highly recommended for special occasions.',
        isApproved: true,
    },
];
async function main() {
    let createdCount = 0;
    for (const p of products) {
        const existing = await prisma.product.findUnique({ where: { weight: p.weight } });
        if (!existing) {
            await prisma.product.create({ data: p });
            createdCount++;
        }
    }
    const existingFeedbacks = await prisma.feedback.count();
    if (existingFeedbacks === 0) {
        for (const f of dummyFeedbacks) {
            await prisma.feedback.create({ data: f });
            createdCount++;
        }
    }
    if (createdCount > 0) {
        console.log(`✅ Seeded ${createdCount} initial records into database.`);
    }
}
main()
    .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map