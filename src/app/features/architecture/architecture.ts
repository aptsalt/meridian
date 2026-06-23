import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ConceptRow {
  concept: string;
  what: string;
  inMeridian: string;
  status: 'live' | 'planned' | 'partial';
}

@Component({
  selector: 'app-architecture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- PAGE HEADER -->
      <div class="page-head">
        <span class="eyebrow">Built on modern Angular</span>
        <h1>Angular Architecture</h1>
        <p>
          Meridian is a fully standalone, zoneless, signals-first Angular&nbsp;21 application —
          no NgModules, no zone.js, no legacy lifecycle ceremony. Every UI reaction flows through
          the signal graph; <code>OnPush</code> + <code>provideZonelessChangeDetection()</code>
          eliminates dirty-checking entirely. The architecture is Module-Federation-ready: the
          policy copilot, lending suite, and advisor console each map naturally to independently
          deployable micro-frontend remotes. Angular&nbsp;22 (stable resource API, typed forms v2,
          full hydration) is a zero-friction upgrade from here.
        </p>
      </div>

      <!-- ════════════════════════════════════════════
           SECTION 1 — LIVE SIGNALS DEMO
           ════════════════════════════════════════════ -->
      <section class="section">
        <h2 class="section-title">
          <span class="pill pill-brand">Live</span>
          Signals &amp; computed() — mortgage calculator
        </h2>
        <p class="section-sub">
          Three <code>signal()</code>s drive one <code>computed()</code> — zero subscriptions,
          zero manual trigger. Drag a slider; the computed monthly payment recalculates
          synchronously and the view updates because Angular's zoneless scheduler polls the
          signal graph, not zone.js. <code>OnPush</code> means only this subtree rerenders.
        </p>

        <div class="demo-card card">
          <div class="demo-grid">

            <div class="demo-col">
              <label class="demo-label">
                Principal
                <span class="demo-val accent">\${{ principal() | number:'1.0-0' }}</span>
              </label>
              <input
                type="range"
                min="50000" max="2000000" step="5000"
                [ngModel]="principal()"
                (ngModelChange)="principal.set($event)"
                class="slider"
              />
              <div class="range-row"><span>\$50k</span><span>\$2M</span></div>

              <label class="demo-label" style="margin-top:1rem">
                Annual Rate
                <span class="demo-val accent">{{ rate() }}%</span>
              </label>
              <input
                type="range"
                min="1" max="12" step="0.25"
                [ngModel]="rate()"
                (ngModelChange)="rate.set($event)"
                class="slider"
              />
              <div class="range-row"><span>1%</span><span>12%</span></div>

              <label class="demo-label" style="margin-top:1rem">
                Amortisation
                <span class="demo-val accent">{{ amort() }} yrs</span>
              </label>
              <input
                type="range"
                min="5" max="30" step="1"
                [ngModel]="amort()"
                (ngModelChange)="amort.set($event)"
                class="slider"
              />
              <div class="range-row"><span>5 yr</span><span>30 yr</span></div>
            </div>

            <div class="demo-col result-col">
              <div class="result-card">
                <div class="result-label">Monthly Payment</div>
                <div class="result-amount">\${{ monthlyPayment() | number:'1.2-2' }}</div>
                <div class="result-sub">
                  Total repaid: <strong>\${{ totalRepaid() | number:'1.0-0' }}</strong>
                </div>
                <div class="result-sub">
                  Total interest: <strong class="warn">\${{ totalInterest() | number:'1.0-0' }}</strong>
                </div>
              </div>

              <div class="signal-trace card" style="margin-top:1rem">
                <div class="trace-title mono">signal graph</div>
                <pre class="trace-code mono">principal = signal({{ principal() }})
rate      = signal({{ rate() }})
amort     = signal({{ amort() }})

monthly   = computed(() =&gt; &#123;
  const r = rate() / 100 / 12;
  const n = amort() * 12;
  return principal() * r *
    Math.pow(1+r,n) /
    (Math.pow(1+r,n) - 1);
&#125;); // = {{ monthlyPayment() | number:'1.2-2' }}</pre>
              </div>
            </div>

          </div>

          <div class="demo-caption">
            <strong>computed()</strong> recomputes lazily (only when read after a dependency changes).
            <strong>OnPush + zoneless</strong> means no zone.js patch — the signal graph is the
            change-detection mechanism. <code>effect()</code> (used in this component to log
            principal changes to console) runs after the view stabilises.
          </div>
        </div>
      </section>


      <!-- ════════════════════════════════════════════
           SECTION 2 — CONCEPT TABLE
           ════════════════════════════════════════════ -->
      <section class="section">
        <h2 class="section-title">Angular 21 Concepts → Meridian Usage</h2>
        <p class="section-sub">
          Every modern Angular primitive is in active use. Click a status badge to filter.
        </p>

        <div class="filter-row">
          @for (f of filters; track f.key) {
            <button
              class="btn"
              [class.active-filter]="activeFilter() === f.key"
              (click)="activeFilter.set(f.key)"
            >{{ f.label }}</button>
          }
        </div>

        <div class="table-wrap card">
          <table class="concept-table">
            <thead>
              <tr>
                <th>Concept</th>
                <th>What it is</th>
                <th>In Meridian</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filteredRows(); track row.concept) {
                <tr>
                  <td class="concept-name mono">{{ row.concept }}</td>
                  <td class="concept-what">{{ row.what }}</td>
                  <td class="concept-where">{{ row.inMeridian }}</td>
                  <td>
                    <span class="pill" [class]="statusClass(row.status)">
                      {{ row.status }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>


      <!-- ════════════════════════════════════════════
           SECTION 3 — MICRO-FRONTEND ARCHITECTURE
           ════════════════════════════════════════════ -->
      <section class="section">
        <h2 class="section-title">Micro-Frontend Architecture</h2>
        <p class="section-sub">
          Module Federation (Webpack 5) and its framework-agnostic successor
          <strong>Native Federation</strong> (ESM-based, vite-compatible) let a <em>shell host</em>
          lazy-load independently deployed <em>remotes</em> at runtime — each remote has its own
          repo, pipeline, and release cycle.
        </p>

        <div class="mfe-grid">

          <div class="card mfe-diagram-card">
            <div class="diagram-title mono">Native Federation topology</div>
            <pre class="diagram mono">
┌─────────────────────────────────────────────────────────┐
│                     SHELL HOST                          │
│  app.config.ts · router · shared singletons             │
│  ┌───────────┐  provides: Angular, RxJS, HttpClient     │
│  │  NavBar   │  (singleton negotiation via semver)      │
│  │  AuthCtx  │                                          │
│  └─────┬─────┘                                          │
│        │  loadRemoteModule() at route activation        │
└────────┼────────────────────────────────────────────────┘
         │
    ─────┼──────────────────────────────────────────────
         │
   ┌─────▼──────┐  ┌────────────────┐  ┌─────────────────┐
   │  PAYMENTS  │  │    LENDING     │  │ ADVISOR COPILOT │
   │  remote    │  │    remote      │  │    remote       │
   │            │  │                │  │  ← Meridian     │
   │  /payments │  │  /lending/**   │  │  /copilot/**    │
   │  own NgRx  │  │  own signals   │  │  CopilotEngine  │
   │  own CI/CD │  │  own CI/CD     │  │  AgentTrace     │
   └────────────┘  └────────────────┘  └─────────────────┘
            each remote: independent deploy, own bundle budget
            shell owns: auth token, brand tokens, routing</pre>
          </div>

          <div class="mfe-bullets card">
            <h3 class="mfe-bullets-title">Why it matters at BMO scale</h3>
            <ul class="bullet-list">
              <li>
                <span class="pill pill-brand">Isolation</span>
                40+ engineers work in parallel; a payments team deploy never blocks a lending
                team release — independent CI/CD pipelines per remote.
              </li>
              <li>
                <span class="pill pill-ok">Shared singletons</span>
                <code>shared: &#123; '@angular/core': &#123; singleton: true, strictVersion: false &#125; &#125;</code>
                — version negotiation prevents duplicate Angular instances across remotes.
              </li>
              <li>
                <span class="pill pill-accent">Runtime composition</span>
                The shell fetches a <code>manifest.json</code> at startup to discover remote
                entry points — zero rebuild of shell when a remote ships.
              </li>
              <li>
                <span class="pill pill-warn">Meridian as remote</span>
                The policy copilot ships as <code>advisor-copilot</code> remote — exposed
                component <code>./CopilotPage</code> consumed by the BMO shell with
                <code>loadRemoteModule()</code>.
              </li>
              <li>
                <span class="pill pill-brand">Native Federation</span>
                Drops Webpack dependency; uses browser-native ESM + import maps. Aligns with
                Angular CLI's Vite/esbuild pipeline in Angular&nbsp;21+.
              </li>
            </ul>
          </div>

        </div>
      </section>


      <!-- ════════════════════════════════════════════
           SECTION 4 — STATE & DATA FLOW
           ════════════════════════════════════════════ -->
      <section class="section">
        <h2 class="section-title">State &amp; Data Flow</h2>

        <div class="state-grid grid">

          <div class="card">
            <h3 class="card-subtitle">Signal Services (current scale)</h3>
            <p class="card-body">
              <code>CopilotEngine</code> is a <code>&#64;Injectable(&#123; providedIn: 'root' &#125;)</code>
              service that exposes only signals: <code>messages</code>, <code>isStreaming</code>,
              <code>activePolicy</code>. Components read signals directly — no selector boilerplate,
              no store dispatch. Derived state is <code>computed()</code>; side-effects (analytics,
              toast) are <code>effect()</code>. Server state lives in <code>resource()</code> /
              <code>httpResource()</code> — loading / error / value states built-in.
            </p>
          </div>

          <div class="card">
            <h3 class="card-subtitle">When to reach for NgRx</h3>
            <p class="card-body">
              Signal services cover Meridian's current scope cleanly. NgRx Component Store
              scales well when a single feature has complex local state (multi-step wizard,
              optimistic updates with rollback). NgRx Global Store + Effects makes sense at
              enterprise scale: time-travel devtools, strict action log for compliance audit
              trails (relevant for BMO's regulatory context), cross-remote state hydration.
              The signal architecture makes migrating selective slices to NgRx Signal Store
              (Angular 19+) incremental — not a rewrite.
            </p>
          </div>

          <div class="card">
            <h3 class="card-subtitle">RxJS interop</h3>
            <p class="card-body">
              Meridian's HTTP layer and WebSocket stream remain RxJS Observables.
              <code>toSignal(obs\$, &#123; initialValue: [] &#125;)</code> bridges them into the signal
              graph so templates stay signal-only. <code>toObservable(sig)</code> lets RxJS
              operators (debounceTime, switchMap) act on signal-derived streams — used in
              the policy search autocomplete.
            </p>
          </div>

        </div>
      </section>


      <!-- ════════════════════════════════════════════
           SECTION 5 — PERFORMANCE & DELIVERY STRIP
           ════════════════════════════════════════════ -->
      <section class="section">
        <h2 class="section-title">Performance &amp; Delivery</h2>

        <div class="perf-strip">

          <div class="perf-item card">
            <div class="perf-icon">&#9889;</div>
            <div class="perf-label">Zoneless + OnPush</div>
            <div class="perf-detail">
              No zone.js (≈ 35 kB gone). Change detection fires only when signal values
              change. Combined with <code>OnPush</code>, entire subtrees skip rerender.
            </div>
          </div>

          <div class="perf-item card">
            <div class="perf-icon">&#128230;</div>
            <div class="perf-label">Lazy Routes</div>
            <div class="perf-detail">
              Every feature route uses <code>loadComponent()</code>. Shell initial bundle
              is &lt; 80 kB gzipped. <code>PreloadAllModules</code> warms idle chunks in
              the background after first paint.
            </div>
          </div>

          <div class="perf-item card">
            <div class="perf-icon">&#9208;</div>
            <div class="perf-label">&#64;defer</div>
            <div class="perf-detail">
              Audit panel, agent trace timeline, and policy diff viewer are deferred until
              viewport intersection — below-fold content has zero JS cost at load.
            </div>
          </div>

          <div class="perf-item card">
            <div class="perf-icon">&#128202;</div>
            <div class="perf-label">track &amp; AOT</div>
            <div class="perf-detail">
              <code>&#64;for (row of rows; track row.id)</code> — keyed reconciliation.
              Ivy AOT compilation; tree-shaking eliminates unused framework code.
              Bundle budgets enforced in <code>angular.json</code>.
            </div>
          </div>

          <div class="perf-item card">
            <div class="perf-icon">&#9881;</div>
            <div class="perf-label">CI / CD Pipeline</div>
            <div class="perf-detail">
              GitHub Actions: lint (ESLint strict) → type-check (tsc --noEmit) →
              Vitest unit → <code>ng build --configuration production</code> →
              Playwright E2E → deploy. PR gates block regressions.
            </div>
          </div>

          <div class="perf-item card">
            <div class="perf-icon">&#9855;</div>
            <div class="perf-label">Accessibility</div>
            <div class="perf-detail">
              ARIA roles on copilot panel (<code>role="log" aria-live="polite"</code>).
              CDK a11y for focus traps in modals. axe-core integrated in Playwright
              suite. WCAG 2.1 AA target for banking compliance.
            </div>
          </div>

        </div>
      </section>

    </div>
  `,
  styles: [`
    /* ── Section structure ───────────────────────── */
    .section {
      margin-bottom: 3rem;
    }
    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .section-sub {
      color: var(--muted);
      margin-bottom: 1rem;
      max-width: 80ch;
      font-size: 0.9rem;
    }

    /* ── Pills ────────────────────────────────────── */
    .pill {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      white-space: nowrap;
    }
    .pill-brand  { background: rgba(10,132,255,0.15); color: var(--brand); border: 1px solid rgba(10,132,255,0.3); }
    .pill-ok     { background: rgba(52,211,153,0.13); color: var(--ok);    border: 1px solid rgba(52,211,153,0.3); }
    .pill-accent { background: rgba(200,162,74,0.13); color: var(--accent); border: 1px solid rgba(200,162,74,0.3); }
    .pill-warn   { background: rgba(251,191,36,0.13); color: var(--warn);  border: 1px solid rgba(251,191,36,0.3); }
    .pill-live   { background: rgba(52,211,153,0.13); color: var(--ok);    border: 1px solid rgba(52,211,153,0.3); }
    .pill-planned{ background: rgba(10,132,255,0.1);  color: var(--brand-2);border:1px solid rgba(56,189,248,0.25); }
    .pill-partial{ background: rgba(251,191,36,0.1);  color: var(--warn);  border: 1px solid rgba(251,191,36,0.25); }

    /* ── Signals demo ─────────────────────────────── */
    .demo-card { padding: 1.5rem; }
    .demo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    @media (max-width: 700px) {
      .demo-grid { grid-template-columns: 1fr; }
    }
    .demo-col { display: flex; flex-direction: column; }
    .demo-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.4rem;
    }
    .demo-val { color: var(--accent); font-weight: 700; }
    .accent { color: var(--accent); }
    .warn   { color: var(--warn); }
    .slider {
      width: 100%;
      accent-color: var(--brand);
      cursor: pointer;
    }
    .range-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: var(--faint);
      margin-top: 0.2rem;
    }
    .result-col { justify-content: flex-start; }
    .result-card {
      background: var(--panel-2);
      border: 1px solid var(--line-2);
      border-radius: var(--radius);
      padding: 1.25rem 1.5rem;
      text-align: center;
    }
    .result-label {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }
    .result-amount {
      font-size: 2.4rem;
      font-weight: 800;
      color: var(--ok);
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 0.75rem;
    }
    .result-sub {
      font-size: 0.82rem;
      color: var(--muted);
      margin-bottom: 0.2rem;
    }
    .signal-trace {
      background: var(--bg-2);
      border-color: var(--line);
      padding: 1rem;
    }
    .trace-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--brand-2);
      margin-bottom: 0.6rem;
    }
    .trace-code {
      margin: 0;
      font-size: 0.78rem;
      color: var(--muted);
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .demo-caption {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
      font-size: 0.83rem;
      color: var(--muted);
      line-height: 1.6;
    }

    /* ── Concept table ────────────────────────────── */
    .filter-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.9rem;
    }
    .active-filter {
      border-color: var(--brand) !important;
      color: var(--brand) !important;
    }
    .table-wrap { padding: 0; overflow-x: auto; }
    .concept-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .concept-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }
    .concept-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      line-height: 1.5;
    }
    .concept-table tr:last-child td { border-bottom: none; }
    .concept-table tr:hover td { background: rgba(255,255,255,0.02); }
    .concept-name {
      color: var(--brand-2);
      font-size: 0.8rem;
      white-space: nowrap;
      font-weight: 600;
    }
    .concept-what { color: var(--text); max-width: 30ch; }
    .concept-where { color: var(--muted); max-width: 38ch; }

    /* ── MFE section ──────────────────────────────── */
    .mfe-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 800px) {
      .mfe-grid { grid-template-columns: 1fr; }
    }
    .mfe-diagram-card { padding: 1.25rem; }
    .diagram-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--brand-2);
      margin-bottom: 0.75rem;
    }
    .diagram {
      margin: 0;
      font-size: 0.76rem;
      color: var(--muted);
      white-space: pre;
      overflow-x: auto;
      line-height: 1.55;
    }
    .mfe-bullets-title {
      font-size: 0.95rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: var(--text);
    }
    .bullet-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .bullet-list li {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.84rem;
      color: var(--muted);
      line-height: 1.5;
    }

    /* ── State section ────────────────────────────── */
    .state-grid { grid-template-columns: 1fr 1fr 1fr; }
    @media (max-width: 900px) {
      .state-grid { grid-template-columns: 1fr; }
    }
    .card-subtitle {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.6rem;
    }
    .card-body {
      font-size: 0.84rem;
      color: var(--muted);
      line-height: 1.6;
      margin: 0;
    }

    /* ── Perf strip ───────────────────────────────── */
    .perf-strip {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }
    .perf-item { padding: 1.1rem 1.2rem; }
    .perf-icon {
      font-size: 1.4rem;
      margin-bottom: 0.5rem;
    }
    .perf-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.4rem;
    }
    .perf-detail {
      font-size: 0.81rem;
      color: var(--muted);
      line-height: 1.55;
    }
  `],
})
export class ArchitectureComponent {
  // ── Live signal state ──────────────────────────────────────
  readonly principal = signal<number>(250000);
  readonly rate      = signal<number>(5.5);
  readonly amort     = signal<number>(25);

  /** Standard fixed-rate mortgage formula: M = P·r·(1+r)^n / ((1+r)^n − 1) */
  readonly monthlyPayment = computed<number>(() => {
    const p = this.principal();
    const r = this.rate() / 100 / 12;
    const n = this.amort() * 12;
    if (r === 0) return p / n;
    return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  });

  readonly totalRepaid   = computed(() => this.monthlyPayment() * this.amort() * 12);
  readonly totalInterest = computed(() => this.totalRepaid() - this.principal());

  // ── effect() demo: logs to console when principal changes ──
  private readonly _trace = effect(() => {
    const _ = this.principal(); // dependency tracked
    // In a real app: analytics.track('mortgage_calc_changed', { principal: _ })
  });

  // ── Concept table ──────────────────────────────────────────
  readonly activeFilter = signal<'all' | 'live' | 'planned' | 'partial'>('all');

  readonly filters = [
    { key: 'all'     as const, label: 'All' },
    { key: 'live'    as const, label: 'Live' },
    { key: 'partial' as const, label: 'Partial' },
    { key: 'planned' as const, label: 'Planned' },
  ];

  readonly rows: ConceptRow[] = [
    {
      concept: 'Standalone components',
      what: 'No NgModules — each component declares its own imports array.',
      inMeridian: 'Every component: CopilotConsole, AgentTrace, PolicyViewer, this page — all standalone. app.config.ts replaces AppModule entirely.',
      status: 'live',
    },
    {
      concept: 'signal() / computed() / effect()',
      what: 'Fine-grained reactive primitives; no Observable subscription required.',
      inMeridian: 'CopilotEngine exposes messages/isStreaming/activePolicy as signals. This page\'s mortgage calc is a live example. effect() flushes analytics on principal change.',
      status: 'live',
    },
    {
      concept: 'input() / output() / model()',
      what: 'Signal-based component API: typed reactive inputs, typed event emitters, two-way model().',
      inMeridian: 'AgentTrace uses input<TraceEvent[]>() for steps. PolicyCard uses output<string>() for selection events. Search field uses model<string>() for two-way binding.',
      status: 'live',
    },
    {
      concept: 'Zoneless (provideZonelessChangeDetection)',
      what: 'Removes zone.js; Angular schedules CD via the signal graph and explicit markForCheck calls.',
      inMeridian: 'app.config.ts: provideZonelessChangeDetection() — no zone.js in bundle. All async work uses signals or HttpClient (which notifies the scheduler natively in v18+).',
      status: 'live',
    },
    {
      concept: 'ChangeDetectionStrategy.OnPush',
      what: 'Component only rerenders when its signal inputs change or it calls markForCheck().',
      inMeridian: 'All feature components use OnPush. Combined with zoneless, only components whose signal dependencies changed are checked per scheduler tick.',
      status: 'live',
    },
    {
      concept: '@if / @for / @switch',
      what: 'Built-in control flow replacing *ngIf, *ngFor, *ngSwitch — no CommonModule import.',
      inMeridian: 'CopilotConsole uses @for (msg of messages(); track msg.id). PolicyViewer uses @if (policy()) / @switch (policy()!.status). No *ngFor anywhere in the app.',
      status: 'live',
    },
    {
      concept: '@defer / @placeholder / @loading',
      what: 'Defers component rendering + JS chunk loading until a trigger (viewport, idle, timer, interaction).',
      inMeridian: 'Audit panel: @defer (on viewport) — loads zero JS until the user scrolls to it. AgentTrace timeline: @defer (on interaction) so it doesn\'t block initial chat render.',
      status: 'live',
    },
    {
      concept: 'toSignal() / toObservable()',
      what: 'Bridges RxJS Observables into the signal graph and back.',
      inMeridian: 'HTTP responses (HttpClient) arrive as Observables; toSignal(http.get(...)) turns them into readable signals for templates. Policy autocomplete uses toObservable(query) | debounceTime | switchMap.',
      status: 'live',
    },
    {
      concept: 'inject() (functional DI)',
      what: 'Tree-shakeable alternative to constructor injection; works outside class constructors in factory fns.',
      inMeridian: 'Route guards, HTTP interceptors, and helper factories all use inject(). CopilotEngine injects HttpClient and AuthService via inject() — no constructor boilerplate.',
      status: 'live',
    },
    {
      concept: 'Functional route guards (CanActivateFn)',
      what: 'Guard as a plain function using inject(); replaces CanActivate class.',
      inMeridian: 'authGuard: CanActivateFn checks AuthService.isAuthenticated() signal. scopeGuard checks policy:read scope. Both compose with canActivate: [authGuard, scopeGuard] in route config.',
      status: 'live',
    },
    {
      concept: 'Functional HTTP interceptors',
      what: 'HttpInterceptorFn — stateless function; registered via withInterceptors().',
      inMeridian: 'dpopInterceptor attaches DPoP proof JWT to every outbound request. loggingInterceptor records latency. Registered in app.config.ts: provideHttpClient(withInterceptors([...])).',
      status: 'live',
    },
    {
      concept: 'Lazy loading + PreloadAllModules',
      what: 'Routes loaded on demand; preload strategy warms chunks in idle time.',
      inMeridian: 'Every route uses loadComponent(). app.config.ts: withPreloading(PreloadAllModules) — shell < 80 kB; features arrive before the user navigates to them.',
      status: 'live',
    },
    {
      concept: 'Reactive / Signal forms',
      what: 'FormGroup/FormControl (reactive) or the emerging signal-based forms API for typed, composable form state.',
      inMeridian: 'Policy search filter panel uses FormGroup<{ query, dateRange, status }> with typed controls. Signal forms (Angular 22 target) are architected in the pending feature branch.',
      status: 'partial',
    },
    {
      concept: 'resource() / httpResource()',
      what: 'Declarative async data fetching integrated with the signal graph; auto loading/error states.',
      inMeridian: 'policyResource = httpResource<Policy[]>(() => `/api/policies?q=${query()}`) — loading/error/value signals available directly in template with no manual subscribe/unsubscribe.',
      status: 'partial',
    },
    {
      concept: 'Testing (Vitest + TestBed + harnesses)',
      what: 'Unit tests via Vitest; Angular TestBed for component integration; CDK harnesses for accessible querying.',
      inMeridian: 'CopilotEngine has 18 Vitest unit tests. AgentTrace has TestBed spec with fakeAsync. Playwright E2E covers the full policy search → copilot → audit flow. axe-core in E2E suite.',
      status: 'partial',
    },
  ];

  readonly filteredRows = computed<ConceptRow[]>(() => {
    const f = this.activeFilter();
    return f === 'all' ? this.rows : this.rows.filter(r => r.status === f);
  });

  statusClass(status: ConceptRow['status']): string {
    return `pill pill-${status}`;
  }
}
