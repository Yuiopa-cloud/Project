import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtPayloadUser = {
  sub: string;
  role: string;
  phone?: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayloadUser }>();
    return request.user;
  },
);
