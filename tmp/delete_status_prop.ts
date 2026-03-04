import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const statusProp = await prisma.propertyDefinition.findFirst({
        where: { name: { contains: 'Status' } }
    });
    if (statusProp) {
        console.log(`Deleting property: ${statusProp.name} (${statusProp.id})`);
        await prisma.propertyDefinition.delete({ where: { id: statusProp.id } });
    } else {
        console.log('No Status property found.');
    }
    process.exit(0);
}
main();
创新
