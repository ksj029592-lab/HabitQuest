import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  const prisma = { userSession: { findUnique: jest.fn() } };
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: SessionGuard;
  const context = (headers: Record<string, string>) => ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new SessionGuard(prisma as unknown as PrismaService, reflector as unknown as Reflector);
  });

  it('does not accept a user ID without a server-issued token', async () => {
    await expect(guard.canActivate(context({ 'x-user-id': 'someone-else' }))).rejects.toThrow();
  });

  it('resolves the user from the session token and rejects spoofed IDs', async () => {
    prisma.userSession.findUnique.mockResolvedValue({ userId: 'owner', startedAt: new Date() });
    await expect(guard.canActivate(context({ authorization: 'Bearer issued-token', 'x-user-id': 'other' }))).rejects.toThrow();
    const headers = { authorization: 'Bearer issued-token' };
    await expect(guard.canActivate(context(headers))).resolves.toBe(true);
    expect(headers).toHaveProperty('x-user-id', 'owner');
  });

  it('rejects expired, revoked and unmapped legacy sessions', async () => {
    for (const session of [null, { userId: null, startedAt: new Date() }, { userId: 'owner', startedAt: new Date('2000-01-01') }]) {
      prisma.userSession.findUnique.mockResolvedValue(session);
      await expect(guard.canActivate(context({ authorization: 'Bearer issued-token' }))).rejects.toThrow();
    }
  });

  it('allows only explicitly public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
  });
});