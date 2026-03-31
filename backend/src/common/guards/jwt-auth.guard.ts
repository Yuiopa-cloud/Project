import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayloadUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<{
      user?: JwtPayloadUser;
      headers: { authorization?: string };
    }>();
    if (isPublic) {
      await this.tryAttachUser(req);
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }

  private async tryAttachUser(req: {
    user?: JwtPayloadUser;
    headers: { authorization?: string };
  }) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ') || req.user) return;
    const token = auth.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        role: 'CUSTOMER' | 'ADMIN';
        phone?: string;
      }>(token, {
        secret: this.config.get<string>('JWT_SECRET', 'dev-insecure-secret'),
      });
      req.user = {
        sub: payload.sub,
        role: payload.role,
        phone: payload.phone,
      };
    } catch {
      /* invalid token on public route — remain guest */
    }
  }

  handleRequest<TUser>(
    err: Error | undefined,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException();
    }
    return user;
  }
}
