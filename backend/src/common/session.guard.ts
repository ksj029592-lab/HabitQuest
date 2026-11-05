import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';

export const Public = () => SetMetadata('public', true);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const token = request.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token) throw new UnauthorizedException('세션이 필요합니다. 페르소나를 다시 선택해 주세요.');
    const session = await this.prisma.userSession.findUnique({ where: { sessionId: token } });
    if (!session?.userId || session.startedAt.getTime() + 7 * 86400000 <= Date.now()) {
      throw new UnauthorizedException('세션이 만료되었어요. 페르소나를 다시 선택해 주세요.');
    }
    if (request.headers['x-user-id'] && request.headers['x-user-id'] !== session.userId) {
      throw new ForbiddenException('다른 사용자의 상태에 접근할 수 없습니다.');
    }
    request.headers['x-user-id'] = session.userId;
    return true;
  }
}