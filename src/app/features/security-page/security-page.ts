import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface AuthStep {
  index: number;
  label: string;
  actor: string;
  detail: string;
  code?: string;
}

interface DefenseLayer {
  name: string;
  color: string;
  items: string[];
}

interface TokenRow {
  action: string;
  do: boolean;
  why: string;
}

/**
 * SecurityPageComponent — showcase of OAuth 2.0 Authorization Code + PKCE +
 * PAR + DPoP, FAPI 2.0, BFF pattern, and defense-in-depth. Pure signal-driven
 * (zoneless, OnPush). No external libs — all from @angular/core + @angular/common.
 */
@Component({
  selector: 'app-security-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    /* ── section spacing ── */
    .section { margin-bottom: 2.5rem; }
    .section-title {
      font-size: 1rem; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase; color: var(--brand-2);
      margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;
    }
    .section-title::after {
      content: ''; flex: 1; height: 1px; background: var(--line);
    }

    /* ── auth flow ── */
    .flow-layout { display: grid; grid-template-columns: 220px 1fr; gap: 1rem; }
    @media (max-width: 640px) { .flow-layout { grid-template-columns: 1fr; } }
    .step-list { display: flex; flex-direction: column; gap: 0.35rem; }
    .step-btn {
      display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.55rem 0.75rem;
      border-radius: var(--radius-sm); border: 1px solid transparent;
      background: transparent; color: var(--muted); cursor: pointer; text-align: left;
      font-size: 0.82rem; font-weight: 500; transition: all 0.15s ease; width: 100%;
    }
    .step-btn:hover { background: var(--panel-2); color: var(--text); }
    .step-btn.active {
      background: var(--panel-2); border-color: var(--brand);
      color: var(--text);
    }
    .step-num {
      min-width: 20px; height: 20px; border-radius: 50%; display: inline-flex;
      align-items: center; justify-content: center; font-size: 0.7rem;
      font-weight: 700; background: var(--line-2); color: var(--muted);
      flex-shrink: 0; margin-top: 1px;
    }
    .step-btn.active .step-num { background: var(--brand); color: #fff; }

    .step-detail {
      background: var(--panel-2); border: 1px solid var(--line-2);
      border-radius: var(--radius); padding: 1.5rem; min-height: 200px;
    }
    .step-actor {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--accent); margin-bottom: 0.5rem;
    }
    .step-label { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; }
    .step-body { color: var(--muted); font-size: 0.88rem; line-height: 1.65; }
    .step-code {
      margin-top: 1rem; background: var(--panel); border: 1px solid var(--line);
      border-radius: var(--radius-sm); padding: 0.75rem 1rem;
      font-family: var(--mono); font-size: 0.78rem; color: var(--brand-2);
      overflow-x: auto; white-space: pre;
    }

    .flow-controls {
      display: flex; align-items: center; gap: 0.75rem; margin-top: 1rem;
    }
    .flow-progress {
      flex: 1; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden;
    }
    .flow-progress-fill {
      height: 100%; background: linear-gradient(90deg, var(--brand), var(--brand-2));
      border-radius: 2px; transition: width 0.3s ease;
    }

    /* ── bearer vs DPoP ── */
    .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 580px) { .compare-grid { grid-template-columns: 1fr; } }
    .compare-card { border-radius: var(--radius); padding: 1.25rem; }
    .compare-card.bad-card {
      background: rgba(248, 113, 113, 0.07); border: 1px solid rgba(248,113,113,0.25);
    }
    .compare-card.good-card {
      background: rgba(52, 211, 153, 0.07); border: 1px solid rgba(52,211,153,0.25);
    }
    .compare-head {
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; margin-bottom: 0.75rem;
    }
    .bad-card .compare-head { color: var(--bad); }
    .good-card .compare-head { color: var(--ok); }
    .compare-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; }
    .compare-body { font-size: 0.85rem; color: var(--muted); line-height: 1.65; }
    .claims-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
    .claim-tag {
      font-family: var(--mono); font-size: 0.72rem; padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm); background: var(--panel);
      border: 1px solid var(--line-2); color: var(--brand-2);
    }

    /* ── token table ── */
    .token-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .token-table th {
      padding: 0.55rem 1rem; text-align: left; background: var(--panel-2);
      color: var(--muted); font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid var(--line-2);
    }
    .token-table th:first-child { border-radius: var(--radius-sm) 0 0 0; }
    .token-table th:last-child { border-radius: 0 var(--radius-sm) 0 0; }
    .token-table td {
      padding: 0.6rem 1rem; border-bottom: 1px solid var(--line);
      vertical-align: top; color: var(--muted);
    }
    .token-table tr:last-child td { border-bottom: none; }
    .token-table tr:hover td { background: var(--panel-2); }
    .verdict-do { color: var(--ok); font-weight: 700; }
    .verdict-dont { color: var(--bad); font-weight: 700; }

    /* ── defense layers ── */
    .layers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
    .layer-card {
      background: var(--panel); border-radius: var(--radius); padding: 1rem;
      border-left: 3px solid transparent; border-top: 1px solid var(--line);
      border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);
    }
    .layer-name { font-size: 0.8rem; font-weight: 700; margin-bottom: 0.5rem; }
    .layer-items { list-style: none; margin: 0; padding: 0; }
    .layer-items li {
      font-size: 0.76rem; color: var(--muted); padding: 0.15rem 0;
      display: flex; align-items: flex-start; gap: 0.35rem;
    }
    .layer-items li::before { content: '·'; color: var(--faint); flex-shrink: 0; }

    /* ── interceptor snippet ── */
    .snippet-wrap {
      background: var(--panel); border: 1px solid var(--line-2);
      border-radius: var(--radius); overflow: hidden;
    }
    .snippet-bar {
      background: var(--panel-2); border-bottom: 1px solid var(--line);
      padding: 0.5rem 1rem; font-size: 0.72rem; color: var(--muted);
      font-family: var(--mono); display: flex; align-items: center; gap: 0.5rem;
    }
    .snippet-dot {
      width: 8px; height: 8px; border-radius: 50%;
    }
    pre {
      margin: 0; padding: 1.25rem; overflow-x: auto;
      font-family: var(--mono); font-size: 0.79rem; line-height: 1.65;
    }
    code { color: var(--brand-2); }
    .kw { color: var(--brand); }
    .fn { color: var(--accent); }
    .cm { color: var(--faint); font-style: italic; }
    .str { color: var(--ok); }

    /* ── badges ── */
    .badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
    .badge {
      font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.65rem;
      border-radius: 999px; letter-spacing: 0.06em;
    }
    .badge-blue { background: rgba(10,132,255,0.15); color: var(--brand); border: 1px solid rgba(10,132,255,0.3); }
    .badge-teal { background: rgba(56,189,248,0.12); color: var(--brand-2); border: 1px solid rgba(56,189,248,0.25); }
    .badge-gold { background: rgba(200,162,74,0.13); color: var(--accent); border: 1px solid rgba(200,162,74,0.3); }
    .badge-green { background: rgba(52,211,153,0.1); color: var(--ok); border: 1px solid rgba(52,211,153,0.25); }
  `],
  template: `
<div class="page">
  <!-- page header -->
  <div class="page-head">
    <span class="eyebrow">Defense in depth</span>
    <h1>Security Architecture</h1>
    <p>
      Meridian is built to FAPI 2.0 baseline profile: every user action flows through
      <strong>OAuth 2.0 Authorization Code + PKCE + PAR</strong>, tokens are
      sender-constrained via <strong>DPoP</strong>, the BFF holds all secrets in
      http-only cookies, and every API call carries a tamper-evident interaction ID.
      This page walks each layer — from the wire to the audit trail.
    </p>
  </div>

  <!-- protocol badges -->
  <div class="badge-row">
    <span class="badge badge-blue">OAuth 2.0 RFC 6749</span>
    <span class="badge badge-blue">PKCE RFC 7636</span>
    <span class="badge badge-teal">PAR RFC 9126</span>
    <span class="badge badge-teal">DPoP RFC 9449</span>
    <span class="badge badge-gold">FAPI 2.0</span>
    <span class="badge badge-gold">OIDC Core</span>
    <span class="badge badge-green">BFF Pattern</span>
    <span class="badge badge-green">mTLS / WAF</span>
  </div>

  <!-- ① AUTH FLOW WALKTHROUGH -->
  <div class="section">
    <div class="section-title">① Auth flow — PKCE + PAR + DPoP</div>
    <div class="flow-layout">
      <!-- step list sidebar -->
      <div class="step-list">
        @for (s of steps; track s.index) {
          <button
            class="step-btn"
            [class.active]="step() === s.index"
            (click)="step.set(s.index)"
            type="button"
          >
            <span class="step-num">{{ s.index + 1 }}</span>
            <span>{{ s.label }}</span>
          </button>
        }
      </div>

      <!-- detail panel -->
      <div>
        <div class="step-detail">
          <div class="step-actor">{{ currentStep().actor }}</div>
          <div class="step-label">{{ currentStep().label }}</div>
          <div class="step-body">{{ currentStep().detail }}</div>
          @if (currentStep().code) {
            <div class="step-code">{{ currentStep().code }}</div>
          }
        </div>

        <div class="flow-controls">
          <button class="btn" (click)="prevStep()" [disabled]="step() === 0" type="button">
            &#8592; Prev
          </button>
          <div class="flow-progress">
            <div class="flow-progress-fill" [style.width]="progressPct()"></div>
          </div>
          <button class="btn btn-primary" (click)="nextStep()" [disabled]="step() === steps.length - 1" type="button">
            Next &#8594;
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ② BEARER vs DPoP -->
  <div class="section">
    <div class="section-title">② Bearer token vs DPoP sender-constrained token</div>
    <div class="compare-grid">
      <div class="compare-card bad-card">
        <div class="compare-head">&#10005; Bearer token (RFC 6750)</div>
        <div class="compare-title">Possession = proof</div>
        <div class="compare-body">
          A stolen Bearer token is immediately reusable by any party, from any host,
          with any HTTP client. A single leaked token in a log file, SSRF response, or
          compromised CDN node grants full access until expiry. There is no binding
          between the token and the legitimate client's key material.
        </div>
        <div class="claims-row">
          <span class="claim-tag">Authorization: Bearer &lt;token&gt;</span>
          <span class="claim-tag">works anywhere</span>
          <span class="claim-tag">no client binding</span>
        </div>
      </div>

      <div class="compare-card good-card">
        <div class="compare-head">&#10003; DPoP token (RFC 9449)</div>
        <div class="compare-title">Proof-of-possession</div>
        <div class="compare-body">
          A DPoP access token embeds the client's public key thumbprint (<strong>jkt</strong>)
          in the token itself. Every request attaches a signed <em>DPoP proof</em> JWT
          containing the target method (<strong>htm</strong>), URI (<strong>htu</strong>),
          timestamp (<strong>iat</strong>), and a unique nonce (<strong>jti</strong>).
          A stolen token is worthless — the attacker lacks the private key to sign proofs.
        </div>
        <div class="claims-row">
          <span class="claim-tag">jkt (key thumbprint)</span>
          <span class="claim-tag">htm</span>
          <span class="claim-tag">htu</span>
          <span class="claim-tag">jti</span>
          <span class="claim-tag">iat</span>
          <span class="claim-tag">nonce</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ③ TOKEN HANDLING DO / DON'T -->
  <div class="section">
    <div class="section-title">③ Token handling — do's and don'ts</div>
    <div class="card" style="padding: 0; overflow: hidden;">
      <table class="token-table">
        <thead>
          <tr>
            <th>Verdict</th>
            <th>Practice</th>
            <th>Why it matters</th>
          </tr>
        </thead>
        <tbody>
          @for (row of tokenRows; track row.action) {
            <tr>
              <td>
                @if (row.do) {
                  <span class="verdict-do">&#10003; DO</span>
                } @else {
                  <span class="verdict-dont">&#10005; DON'T</span>
                }
              </td>
              <td>{{ row.action }}</td>
              <td>{{ row.why }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- ④ DEFENSE-IN-DEPTH LAYERS -->
  <div class="section">
    <div class="section-title">④ Defense-in-depth layers</div>
    <div class="layers-grid">
      @for (layer of defenseLayers; track layer.name) {
        <div class="layer-card" [style.border-left-color]="layer.color">
          <div class="layer-name" [style.color]="layer.color">{{ layer.name }}</div>
          <ul class="layer-items">
            @for (item of layer.items; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </div>
      }
    </div>
  </div>

  <!-- ⑤ HOW MERIDIAN IMPLEMENTS IT -->
  <div class="section">
    <div class="section-title">⑤ Meridian implementation</div>
    <p style="color: var(--muted); font-size: 0.88rem; margin-bottom: 1rem;">
      A functional Angular <span class="tag">HttpInterceptor</span> injects the DPoP proof +
      sender-constrained access token on every outbound API call. Functional route guards
      (<span class="tag">authGuard</span>, <span class="tag">scopeGuard</span>) gate copilot
      routes by OIDC scope. The entire stack is zoneless — no <code>NgZone</code>, no
      <code>zone.js</code>, change detection runs on signal invalidation only.
    </p>

    <div class="snippet-wrap">
      <div class="snippet-bar">
        <span class="snippet-dot" style="background:#f87171"></span>
        <span class="snippet-dot" style="background:#fbbf24"></span>
        <span class="snippet-dot" style="background:#34d399"></span>
        <span style="margin-left:0.5rem">dpop.interceptor.ts — concept</span>
      </div>
      <pre><code><span class="cm">// Angular 21 functional HTTP interceptor (zoneless, no decorators needed)</span>
<span class="kw">import</span> &#123; HttpInterceptorFn, HttpRequest, HttpHandlerFn &#125; <span class="kw">from</span> <span class="str">'&#64;angular/common/http'</span>;
<span class="kw">import</span> &#123; inject &#125; <span class="kw">from</span> <span class="str">'&#64;angular/core'</span>;
<span class="kw">import</span> &#123; TokenStore &#125; <span class="kw">from</span> <span class="str">'./token-store.service'</span>;
<span class="kw">import</span> &#123; DpopProofService &#125; <span class="kw">from</span> <span class="str">'./dpop-proof.service'</span>;

<span class="kw">export const</span> <span class="fn">dpopInterceptor</span>: HttpInterceptorFn = (
  req: HttpRequest&lt;unknown&gt;,
  next: HttpHandlerFn,
) =&gt; &#123;
  <span class="kw">const</span> store  = inject(TokenStore);
  <span class="kw">const</span> dpopSvc = inject(DpopProofService);

  <span class="kw">const</span> token = store.accessToken();          <span class="cm">// signal read — tracked by Angular</span>
  <span class="kw">if</span> (!token) <span class="kw">return</span> next(req);

  <span class="cm">// Build a fresh DPoP proof JWT for this exact request (htm + htu + jti + iat)</span>
  <span class="kw">const</span> proof = dpopSvc.<span class="fn">sign</span>(&#123; htm: req.method, htu: req.urlWithParams &#125;);

  <span class="kw">const</span> secured = req.clone(&#123;
    setHeaders: &#123;
      <span class="str">'Authorization'</span>:          <span class="str">'DPoP ' + token</span>,
      <span class="str">'DPoP'</span>:                   proof,
      <span class="str">'X-FAPI-Interaction-Id'</span>:  crypto.randomUUID(),
    &#125;,
  &#125;);

  <span class="kw">return</span> next(secured);
&#125;;

<span class="cm">// ── Functional route guard (OIDC scope check) ──</span>
<span class="kw">export const</span> <span class="fn">scopeGuard</span> = (required: <span class="kw">string</span>) =&gt; () =&gt; &#123;
  <span class="kw">const</span> store = inject(TokenStore);
  <span class="kw">return</span> store.scopes().includes(required);   <span class="cm">// false ⇒ Angular redirects to /unauthorized</span>
&#125;;

<span class="cm">// provideRouter usage:</span>
<span class="cm">// &#123; path: 'advice', component: CopilotPage,</span>
<span class="cm">//   canActivate: [authGuard, scopeGuard('advice.draft')] &#125;</span>
</code></pre>
    </div>
  </div>
</div>
  `,
})
export class SecurityPageComponent {
  // ── auth flow state ──
  readonly step = signal(0);

  readonly steps: AuthStep[] = [
    {
      index: 0,
      label: 'PKCE — generate code_verifier & code_challenge',
      actor: 'Client (SPA / BFF)',
      detail:
        'The client generates a cryptographically random code_verifier (43–128 chars, ' +
        'URL-safe base64) and derives code_challenge = BASE64URL(SHA-256(code_verifier)). ' +
        'This ties the eventual token exchange to this exact browser session — a stolen ' +
        'authorization code cannot be exchanged without the verifier.',
      code:
        'const verifier  = crypto.randomUUID().replace(/-/g,"") + crypto.randomUUID().replace(/-/g,"");\n' +
        'const hash      = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));\n' +
        'const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))\n' +
        '                    .replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=/g,"");',
    },
    {
      index: 1,
      label: 'PAR — Pushed Authorization Request',
      actor: 'Client → Authorization Server',
      detail:
        'Before redirecting the user, the client POSTs the full authorization request ' +
        '(client_id, scope, redirect_uri, code_challenge, acr_values, nonce) directly to ' +
        'the AS /par endpoint over mTLS. The AS returns a short-lived request_uri (urn:ietf:params:oauth:request_uri:…). ' +
        'This keeps sensitive parameters off the browser URL bar and prevents request tampering — a FAPI 2.0 mandatory control.',
      code:
        'POST /oauth2/par  HTTP/1.1\n' +
        'Content-Type: application/x-www-form-urlencoded\n\n' +
        'response_type=code\n' +
        '&client_id=meridian-bff\n' +
        '&scope=openid%20profile%20advice.draft\n' +
        '&code_challenge=<S256_value>\n' +
        '&code_challenge_method=S256\n' +
        '&redirect_uri=https://meridian.example/callback\n' +
        '&nonce=<random>',
    },
    {
      index: 2,
      label: 'User authenticates — OIDC + MFA consent',
      actor: 'User → Authorization Server',
      detail:
        'The AS redirects the user to its login UI using only the opaque request_uri returned ' +
        'from PAR — the full parameters are server-side. The user authenticates (password + TOTP / ' +
        'hardware key), the AS enforces acr_values (LoA 2+), and presents the consent screen for ' +
        'the requested scopes (openid, profile, advice.draft). An id_token will be issued at token ' +
        'endpoint carrying sub, iss, aud, nonce, auth_time, and acr claims.',
    },
    {
      index: 3,
      label: 'Authorization code redirect',
      actor: 'Authorization Server → Client',
      detail:
        'After consent the AS redirects to redirect_uri with a single-use, short-lived ' +
        'authorization code (default: 60 s) and the original state parameter. The code is ' +
        'bound to the client_id and code_challenge — it cannot be used by a different client. ' +
        'PKCE replay protection: the AS stores the code_challenge hash and will reject a second exchange.',
      code: 'GET /callback?code=SplxlOBeZQQYbYS6WxSbIA&state=<csrf_token>  HTTP/1.1',
    },
    {
      index: 4,
      label: 'BFF exchanges code for tokens (server-side only)',
      actor: 'BFF (Node/Go) → Authorization Server',
      detail:
        'The Backend-for-Frontend — a thin server layer — intercepts the callback, verifies ' +
        'the state/nonce, then POSTs the token request with code + code_verifier + client_secret ' +
        '(held server-side, never shipped to the browser). The AS validates the PKCE verifier ' +
        'against the stored challenge. Tokens are stored in server-side session, never sent to ' +
        'the browser in response body. A session cookie (http-only, secure, same-site=strict) ' +
        'is the only browser artifact.',
      code:
        'POST /oauth2/token  HTTP/1.1\n' +
        'DPoP: <proof_jwt>   // BFF includes a DPoP proof for token binding\n\n' +
        'grant_type=authorization_code\n' +
        '&code=SplxlOBeZQQYbYS6WxSbIA\n' +
        '&code_verifier=<original_verifier>\n' +
        '&client_id=meridian-bff\n' +
        '&client_secret=<secret>',
    },
    {
      index: 5,
      label: 'DPoP-bound API calls + silent refresh rotation',
      actor: 'BFF → Resource Server',
      detail:
        'Every downstream API call from the BFF carries Authorization: DPoP <access_token> plus a ' +
        'fresh DPoP proof JWT signed with the BFF\'s EC P-256 key (htm, htu, jti, iat, nonce if ' +
        'challenged). The Resource Server verifies the token\'s jkt claim matches the proof\'s public ' +
        'key — a stolen token is useless without the private key. Access tokens live ≤10 min; ' +
        'the refresh token is stored encrypted server-side and rotates on every use (sender-constrained ' +
        'via DPoP). Old refresh tokens are revoked and any reuse triggers immediate session termination.',
      code:
        'Authorization: DPoP eyJhb...\n' +
        'DPoP: eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6Ii4uLiIsInkiOiIuLi4ifX0.\n' +
        '       eyJodG0iOiJQT1NUIiwiaHR1IjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS9hZHZpY2UiLCJqdGkiOiI8dXVpZD4iLCJpYXQiOjE3MDAwMDB9.\n' +
        '       <EC-P256-signature>\n' +
        'X-FAPI-Interaction-Id: 550e8400-e29b-41d4-a716-446655440000',
    },
  ];

  readonly currentStep = computed(() => this.steps[this.step()]);
  readonly progressPct = computed(() => `${((this.step() + 1) / this.steps.length) * 100}%`);

  prevStep(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }
  nextStep(): void {
    this.step.update((s) => Math.min(this.steps.length - 1, s + 1));
  }

  // ── defense layers ──
  readonly defenseLayers: DefenseLayer[] = [
    {
      name: 'Network',
      color: '#38bdf8',
      items: ['mTLS client certs', 'WAF / rate-limit', 'API Gateway', 'TLS 1.3 only'],
    },
    {
      name: 'Identity',
      color: '#0a84ff',
      items: ['OIDC + PAR', 'MFA / LoA 2+', 'acr_values enforcement', 'Short sessions'],
    },
    {
      name: 'Token',
      color: '#c8a24a',
      items: ['DPoP sender-bind', 'PAR anti-tamper', 'Rotation + revoke', '≤10 min AT TTL'],
    },
    {
      name: 'Application',
      color: '#fbbf24',
      items: ['Strict CSP + SRI', 'Angular output encoding', 'CSRF same-site', 'authGuard / scopeGuard'],
    },
    {
      name: 'Data',
      color: '#34d399',
      items: ['AES-256 at rest', 'PII redaction logs', 'Field-level encrypt', 'Least privilege'],
    },
    {
      name: 'Audit',
      color: '#f87171',
      items: ['X-FAPI-Interaction-Id', 'Tamper-evident log', 'Hash-chained events', 'SIEM / alerts'],
    },
  ];

  // ── token do/don't rows ──
  readonly tokenRows: TokenRow[] = [
    {
      do: false,
      action: 'Store access or refresh tokens in localStorage / sessionStorage',
      why: 'Any XSS script can read it; entire session is stolen instantly.',
    },
    {
      do: true,
      action: 'Use a BFF with http-only, secure, same-site=strict session cookie',
      why: 'JS cannot access the cookie; same-site blocks CSRF; secure mandates HTTPS.',
    },
    {
      do: false,
      action: 'Issue long-lived access tokens (hours / days)',
      why: 'Wide blast radius; a leaked token stays valid long after detection.',
    },
    {
      do: true,
      action: 'Short-lived access tokens (≤10 min) with silent rotation via BFF',
      why: 'Minimises exposure window; the BFF refreshes transparently using DPoP-bound RT.',
    },
    {
      do: false,
      action: 'Send tokens in URL query parameters',
      why: 'Tokens appear in server logs, browser history, Referer headers, and CDN caches.',
    },
    {
      do: true,
      action: 'Bind tokens with DPoP (sender-constrained, jkt thumbprint in AT)',
      why: 'Stolen token unusable — attacker lacks private key to sign valid DPoP proofs.',
    },
    {
      do: false,
      action: 'Skip Content Security Policy or allow unsafe-inline scripts',
      why: 'Opens XSS vector; attacker can exfiltrate cookies or forge API calls.',
    },
    {
      do: true,
      action: 'Enforce strict CSP + Subresource Integrity on all scripts and styles',
      why: 'CSP eliminates injected script execution; SRI blocks tampered CDN assets.',
    },
  ];
}
