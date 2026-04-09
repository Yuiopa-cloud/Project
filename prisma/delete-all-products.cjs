/**
 * Removes every product from the database.
 * Deletes all OrderItem rows first (they reference products).
 * Order headers are kept but may have no line items.
 *
 *   node prisma/delete-all-products.cjs
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();
  const lineCount = await prisma.orderItem.count();

  const { count: deletedLines } = await prisma.orderItem.deleteMany({});
  const { count: deletedProducts } = await prisma.product.deleteMany({});

  // eslint-disable-next-line no-console
  console.log(
    `[delete-all-products] before: ${productCount} products, ${lineCount} order line items`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `[delete-all-products] deleted: ${deletedLines} order line items, ${deletedProducts} products`,
  );
}

main()
  .catch((e) => {
    console.error('[delete-all-products] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
