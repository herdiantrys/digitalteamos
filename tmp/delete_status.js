const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const result = await prisma.propertyDefinition.deleteMany({
            where: { name: { contains: 'Status' } }
        });
        console.log('Deleted:', result.count);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
创新
