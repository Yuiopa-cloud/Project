import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from './jwt.strategy';

function normalizeMaPhone(raw: string): string {
  let p = raw.replace(/\s/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0') && p.length === 10) {
    p = '+212' + p.slice(1);
  }
  if (!p.startsWith('+')) {
    if (p.startsWith('212')) p = '+' + p;
    else if (/^[567]/.test(p) && p.length === 9) p = '+212' + p;
  }
  return p;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const phone = normalizeMaPhone(dto.phone);
    const exists = await this.prisma.user.findUnique({ where: { phone } });
    if (exists) throw new ConflictException('Phone already registered');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        phone,
        email: dto.email?.toLowerCase(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        locale: dto.locale ?? 'fr',
        role: UserRole.CUSTOMER,
        loyaltyAccount: { create: { balance: 0 } },
      },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.phone);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const phone = normalizeMaPhone(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.issueTokens(user.id, user.role, user.phone);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  /** Password-only gate for the admin console; issues JWT for the seeded ADMIN user. */
  async adminPanelLogin(rawPassword: string) {
    const password = String(rawPassword ?? '')
      .trim()
      .replace(/^['"]+|['"]+$/g, '');
    /** Railway injects `process.env` before ConfigService; prefer it for panel password. */
    const fromProcess = process.env.ADMIN_PANEL_PASSWORD;
    const fromConfig = this.config.get<string | undefined>(
      'ADMIN_PANEL_PASSWORD',
    );
    let expected = String(
      (fromProcess != null && fromProcess !== '' ? fromProcess : fromConfig) ??
        '16061606',
    )
      .trim()
      .replace(/^['"]+|['"]+$/g, '');
    if (!expected) expected = '16061606';

    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.log.warn('Admin panel login: password mismatch (check ADMIN_PANEL_PASSWORD on Railway)');
      throw new UnauthorizedException(
        'Mot de passe incorrect — utilisez la valeur de ADMIN_PANEL_PASSWORD (Railway), pas le mot de passe utilisateur seed.',
      );
    }
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });
    if (!admin) {
      this.log.warn(
        'Admin panel login: no ADMIN user in database (run: npx prisma db seed)',
      );
      throw new UnauthorizedException(
        'Aucun compte ADMIN — sur Railway exécutez une fois : npx prisma db seed',
      );
    }
    const tokens = await this.issueTokens(
      admin.id,
      admin.role,
      admin.phone,
    );
    return { user: this.sanitizeUser(admin), ...tokens };
  }

  async refresh(rawRefresh: string) {
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!row) throw new UnauthorizedException('Invalid refresh token');
    const tokens = await this.issueTokens(
      row.user.id,
      row.user.role,
      row.user.phone,
    );
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return tokens;
  }

  private async issueTokens(userId: string, role: UserRole, phone: string) {
    const payload: JwtPayload = { sub: userId, role, phone };
    const accessToken = await this.jwt.signAsync(payload);
    const rawRefresh = nanoid(48);
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const days = parseInt(
      this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS', '7'),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return { accessToken, refreshToken: rawRefresh };
  }

  private sanitizeUser(user: {
    id: string;
    phone: string;
    email: string | null;
    firstName: string;
    lastName: string;
    role: UserRole;
    locale: string;
  }) {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locale: user.locale,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { loyaltyAccount: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      ...this.sanitizeUser(user),
      loyaltyPoints: user.loyaltyAccount?.balance ?? 0,
    };
  }
}
