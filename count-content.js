
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.content.count();
    console.log('Content Count:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
