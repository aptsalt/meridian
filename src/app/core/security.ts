import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session';

/**
 * dpopInterceptor — a functional HTTP interceptor (Angular's modern, tree-
 * shakeable interceptor style) that attaches Financial-grade API auth headers
 * to every outbound request, per policy API-330 (FAPI 2.0):
 *
 *   Authorization: DPoP <access-token>     (sender-constrained, NOT a bare Bearer)
 *   DPoP:          <proof-jwt>             (proof-of-possession, key-bound)
 *
 * In a real app the DPoP proof is a freshly-signed JWT per request (htu/htm/jti
 * claims) using a non-extractable WebCrypto key. Here we attach a representative
 * proof so the pattern is visible end-to-end.
 */
export const dpopInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  if (!session.isAuthenticated() || !session.accessToken()) {
    return next(req);
  }
  const proof = buildDpopProof(req.method, req.url, session.dpopThumbprint());
  const secured = req.clone({
    setHeaders: {
      Authorization: `DPoP ${session.accessToken()}`,
      DPoP: proof,
      'X-FAPI-Interaction-Id': cryptoId(),
    },
  });
  return next(secured);
};

/** authGuard — functional CanActivateFn protecting the copilot routes. */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.isAuthenticated() && session.tokenStatus() === 'active') {
    return true;
  }
  return router.createUrlTree(['/']);
};

/** scopeGuard factory — require a specific OAuth scope (defense-in-depth). */
export function scopeGuard(scope: string): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);
    return session.hasScope(scope) ? true : router.createUrlTree(['/']);
  };
}

function buildDpopProof(method: string, url: string, thumbprint: string): string {
  const header = btoa(JSON.stringify({ typ: 'dpop+jwt', alg: 'PS256', jkt: thumbprint }));
  const claims = btoa(
    JSON.stringify({ htm: method, htu: url, jti: cryptoId(), iat: 0 }),
  );
  return `${header}.${claims}.demo-signature`;
}

function cryptoId(): string {
  // Stable, dependency-free pseudo-id for demo headers.
  return 'id-' + Math.abs(hash(String(performance.now()))).toString(36);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
