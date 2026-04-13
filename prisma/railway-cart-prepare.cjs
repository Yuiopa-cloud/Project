/**
 * Runs before `prisma db push` on Railway so legacy databases can migrate safely.
 *
 * Problem: `CartItem` gained required `lineKey` + new @@unique([cartId, lineKey]) while
 * dropping @@unique([cartId, productId]). Existing rows / old indexes make `db push` fail.
 *
 * This script is idempotent: safe to run on every deploy.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const tc = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'CartItem';
    `;
    if (Number(tc[0]?.c ?? 0) === 0) {
      // eslint-disable-next-line no-console
      console.log('[railway-cart-prepare] No CartItem table yet — skipping (db push will create it).');
      return;
    }

    // Old Prisma unique on (cartId, productId) blocks the new shape; drop if present.
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_cartId_productId_key";`,
    );

    const cols = await prisma.$queryRaw`
      SELECT 1 AS x
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CartItem'
        AND column_name = 'lineKey'
      LIMIT 1;
    `;
    const hasLineKey = Array.isArray(cols) && cols.length > 0;

    if (!hasLineKey) {
      // eslint-disable-next-line no-console
      console.log('[railway-cart-prepare] Adding CartItem.lineKey and backfilling…');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "CartItem" ADD COLUMN "lineKey" TEXT;`,
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "CartItem" SET "lineKey" = 'base:' || "productId" WHERE "lineKey" IS NULL;`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "CartItem" ALTER COLUMN "lineKey" SET NOT NULL;`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.log('[railway-cart-prepare] CartItem.lineKey present — backfilling gaps only…');
      await prisma.$executeRawUnsafe(
        `UPDATE "CartItem" SET "lineKey" = 'base:' || "productId" WHERE "lineKey" IS NULL OR TRIM("lineKey") = '';`,
      );
      const vcol = await prisma.$queryRaw`
        SELECT 1 AS x
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'CartItem'
          AND column_name = 'variantId'
        LIMIT 1;
      `;
      if (Array.isArray(vcol) && vcol.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "CartItem" SET "lineKey" = "variantId" WHERE "variantId" IS NOT NULL AND TRIM("variantId") <> '';`,
        );
      }
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "CartItem" ALTER COLUMN "lineKey" SET NOT NULL;`,
      );
    }

    // Same cart + lineKey must be unique before Prisma adds @@unique([cartId, lineKey]).
    const dupRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c
      FROM (
        SELECT 1
        FROM "CartItem"
        GROUP BY "cartId", "lineKey"
        HAVING COUNT(*) > 1
      ) t;
    `;
    if (Number(dupRows[0]?.c ?? 0) > 0) {
      // eslint-disable-next-line no-console
      console.log('[railway-cart-prepare] Merging duplicate cart lines (same cartId + lineKey)…');
      await prisma.$executeRawUnsafe(`
        WITH agg AS (
          SELECT "cartId", "lineKey",
                 (array_agg(id ORDER BY id))[1] AS keep_id,
                 SUM(quantity)::integer AS total_qty
          FROM "CartItem"
          GROUP BY "cartId", "lineKey"
          HAVING COUNT(*) > 1
        )
        UPDATE "CartItem" AS ci
        SET quantity = agg.total_qty
        FROM agg
        WHERE ci.id = agg.keep_id;
      `);
      await prisma.$executeRawUnsafe(`
        DELETE FROM "CartItem" AS a
        USING "CartItem" AS b
        WHERE a."cartId" = b."cartId"
          AND a."lineKey" = b."lineKey"
          AND a.id > b.id;
      `);
    }

    // eslint-disable-next-line no-console
    console.log('[railway-cart-prepare] OK');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[railway-cart-prepare] failed', e);
  process.exit(1);
});
