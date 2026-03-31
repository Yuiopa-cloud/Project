/**
 * Idempotent: guarantees one ADMIN user exists (panel login issues JWT for this user).
 * Runs with plain Node (no ts-node) — safe on Railway after `npm install --omit=dev`
 * as long as @prisma/client and argon2 are installed.
 */
const { PrismaClient, UserRole } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

const ADMIN_PHONE = '+212600000001';

async function main() {
  const passwordHash = await argon2.hash('Admin123!');
  await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { role: UserRole.ADMIN },
    create: {
      phone: ADMIN_PHONE,
      email: 'admin@atlas-auto.ma',
      firstName: 'Atlas',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      locale: 'fr',
      passwordHash,
      loyaltyAccount: { create: { balance: 0 } },
    },
  });
  // eslint-disable-next-line no-console
  console.log('[ensure-admin] ADMIN user OK (phone %s)', ADMIN_PHONE);
}

main()
  .catch((e) => {
    console.error('[ensure-admin] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
