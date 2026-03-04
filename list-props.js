
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const props = await prisma.propertyDefinition.findMany();
    console.log(JSON.stringify(props, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
