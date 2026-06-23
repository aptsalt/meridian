import { Injectable, computed, signal } from '@angular/core';

/**
 * SessionService — a mock of a Backend-for-Frontend (BFF) auth session.
 *
 * In production (per policy API-332) the SPA never holds the refresh token:
 * tokens live in an http-only, secure, same-site cookie managed by a BFF, and
 * access tokens are sender-constrained with DPoP (FAPI 2.0 / API-330). Here we
 * SIMULATE the SPA-visible half of that: a short-lived access token, its expiry,
 * and a DPoP key thumbprint — enough to demonstrate the interceptor and guard.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _user = signal<string | null>('demo.advisor@meridian.bank');
  private readonly _accessToken = signal<string>(this.mintToken());
  private readonly _expiresAt = signal<number>(Date.now() + 10 * 60 * 1000);
  private readonly _dpopThumbprint = signal<string>('dpop_' + this.rand(12));
  private readonly _scopes = signal<string[]>([
    'policy.read',
    'compliance.read',
    'advice.draft',
  ]);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly dpopThumbprint = this._dpopThumbprint.asReadonly();
  readonly scopes = this._scopes.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly tokenStatus = computed(() =>
    this._expiresAt() > Date.now() ? 'active' : 'expired',
  );

  hasScope(scope: string): boolean {
    return this._scopes().includes(scope);
  }

  /** Silent rotation — short-lived access token refreshed without UI (API-332). */
  rotate(): void {
    this._accessToken.set(this.mintToken());
    this._expiresAt.set(Date.now() + 10 * 60 * 1000);
  }

  signOut(): void {
    this._user.set(null);
    this._accessToken.set('');
  }

  signIn(): void {
    this._user.set('demo.advisor@meridian.bank');
    this.rotate();
  }

  private mintToken(): string {
    // Looks like a JWT but is a harmless demo string — never a real token.
    const header = btoa(JSON.stringify({ alg: 'PS256', typ: 'dpop+jwt' }));
    const body = btoa(JSON.stringify({ sub: 'demo-advisor', iat: 0 }));
    return `${header}.${body}.${this.rand(24)}`;
  }

  private rand(n: number): string {
    const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
}
