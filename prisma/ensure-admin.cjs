/**
 * Idempotent: guarantees one ADMIN user exists (panel login issues JWT for this user).
 * Runs with plain Node (no ts-node) — safe on Railway after `npm install --omit=dev`
 * as long as @prisma/client and argon2 are installed.
 *
 * One-time production reset: set ADMIN_RESEED_PASSWORD in env, redeploy once, then
 * remove the variable. That updates the ADMIN user's passwordHash and deletes all
 * refresh tokens for that user (logs out every admin session). The /admin form still
 * uses ADMIN_PANEL_PASSWORD — set that separately to a new strong value.
 */
const { PrismaClient, UserRole } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

const ADMIN_PHONE = '+212600000001';

function stripQuotes(s) {
  const t = String(s ?? '').trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

async function main() {
  const reseedPlain = stripQuotes(process.env.ADMIN_RESEED_PASSWORD);
  const defaultPlain = 'Admin123!';
  const plainForHash = reseedPlain || defaultPlain;
  const passwordHash = await argon2.hash(plainForHash);

  const updatePayload = { role: UserRole.ADMIN };
  if (reseedPlain) {
    updatePayload.passwordHash = passwordHash;
  }

  const user = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: updatePayload,
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

  if (reseedPlain) {
    const deleted = await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });
    // eslint-disable-next-line no-console
    console.log(
      '[ensure-admin] ADMIN password reset; removed %d refresh token(s). Remove ADMIN_RESEED_PASSWORD from env now.',
      deleted.count,
    );
  }

  // eslint-disable-next-line no-console
  console.log('[ensure-admin] ADMIN user OK (phone %s)', ADMIN_PHONE);
}

main()
  .catch((e) => {
    console.error('[ensure-admin] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
