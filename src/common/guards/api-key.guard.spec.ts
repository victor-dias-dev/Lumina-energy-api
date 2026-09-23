import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

function contextWithKey(key?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-api-key': key } }),
    }),
  } as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  it('allows requests when API_KEY is unset', () => {
    const guard = new ApiKeyGuard({
      get: () => undefined,
    } as unknown as ConfigService);
    expect(guard.canActivate(contextWithKey())).toBe(true);
  });

  it('rejects a missing or wrong key when API_KEY is set', () => {
    const guard = new ApiKeyGuard({
      get: () => 'secret',
    } as unknown as ConfigService);
    expect(() => guard.canActivate(contextWithKey())).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contextWithKey('nope'))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows the configured key', () => {
    const guard = new ApiKeyGuard({
      get: () => 'secret',
    } as unknown as ConfigService);
    expect(guard.canActivate(contextWithKey('secret'))).toBe(true);
  });
});
