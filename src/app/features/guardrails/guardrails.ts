import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';

interface DevGuard {
  id: string;
  icon: string;
  title: string;
  why: string;
  tag: string;
}

interface RunGuard {
  id: string;
  icon: string;
  title: string;
  detail: string;
  tag: string;
}

interface ScoreMetric {
  label: string;
  value: number;
  color: 'ok' | 'warn' | 'bad';
}

/**
 * GuardrailsComponent — AI Guardrails showcase page.
 * Two-layer safety model: dev-time (anti-drift, anti-hallucination in AI-assisted code)
 * and run-time (grounding, faithfulness, PII, HITL for the RAG copilot).
 * References real projects: git-sentry (local Ollama commit-review) and rag-eval-engine
 * (LLM-as-judge faithfulness scoring). Fully zoneless + OnPush, signals-only.
 */
@Component({
  selector: 'app-guardrails',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="page">

      <!-- ── Page header ───────────────────────────────────────────────── -->
      <div class="page-head">
        <span class="eyebrow">Trustworthy AI</span>
        <h1>AI Guardrails</h1>
        <p>
          Shipping generative AI inside a bank requires two distinct safety layers.
          At <strong>dev-time</strong> we govern the AI tools that write our code —
          preventing hallucinated APIs, architectural drift, and non-compliant patterns
          before a single line reaches production. At <strong>run-time</strong> we govern
          what the RAG copilot says to bankers — enforcing grounding, citation, faithfulness
          scoring, PII redaction, and human-in-the-loop approval for any material action.
          Together these layers let teams ship AI-augmented features at velocity without
          sacrificing the trust and auditability that regulated finance demands.
        </p>
      </div>

      <!-- ── Section 1: Dev-time guardrails ───────────────────────────── -->
      <section class="section">
        <div class="section-label">
          <span class="eyebrow">Layer 1</span>
          <h2 class="section-title">Dev-time · Governing AI-assisted code</h2>
          <p class="section-sub">
            Controls that prevent AI coding tools from introducing drift, hallucinated
            library calls, and pattern violations into the codebase.
          </p>
        </div>

        <div class="grid guard-grid">
          @for (g of devGuards; track g.id) {
            <div class="card guard-card">
              <div class="guard-top">
                <span class="guard-icon">{{ g.icon }}</span>
                <span class="tag dev-tag">{{ g.tag }}</span>
              </div>
              <h3 class="guard-title">{{ g.title }}</h3>
              <p class="guard-why">{{ g.why }}</p>
            </div>
          }
        </div>
      </section>

      <!-- ── Section 2: Run-time guardrails ───────────────────────────── -->
      <section class="section">
        <div class="section-label">
          <span class="eyebrow">Layer 2</span>
          <h2 class="section-title">Run-time · Governing RAG copilot answers</h2>
          <p class="section-sub">
            Controls applied to every response the agentic copilot produces — ensuring
            every claim is grounded, every figure is cited, and every sensitive action
            requires human approval.
          </p>
        </div>

        <div class="grid run-grid">
          @for (g of runGuards; track g.id) {
            <div class="card run-card">
              <div class="guard-top">
                <span class="guard-icon">{{ g.icon }}</span>
                <span class="tag run-tag">{{ g.tag }}</span>
              </div>
              <h3 class="guard-title">{{ g.title }}</h3>
              <p class="guard-why">{{ g.detail }}</p>
            </div>
          }
        </div>
      </section>

      <!-- ── Section 3: Interactive hallucination-guard demo ───────────── -->
      <section class="section">
        <div class="section-label">
          <span class="eyebrow">Live Demo</span>
          <h2 class="section-title">Hallucination guard in action</h2>
          <p class="section-sub">
            Toggle between an ungrounded AI answer (caught by the faithfulness scorer)
            and a policy-grounded answer (cleared by all guards).
          </p>
        </div>

        <div class="card demo-card">
          <div class="demo-toggle-row">
            <button
              class="btn"
              [class.btn-bad]="mode() === 'bad'"
              [class.active-bad]="mode() === 'bad'"
              (click)="mode.set('bad')"
            >
              ✕ Ungrounded answer
            </button>
            <button
              class="btn"
              [class.btn-ok]="mode() === 'good'"
              [class.active-ok]="mode() === 'good'"
              (click)="mode.set('good')"
            >
              ✓ Grounded answer
            </button>
          </div>

          <!-- Answer bubble -->
          <div class="answer-bubble" [class.answer-bad]="mode() === 'bad'" [class.answer-ok]="mode() === 'good'">
            <div class="answer-role">Meridian Copilot</div>
            <p class="answer-text">{{ answerText() }}</p>
            @if (mode() === 'good') {
              <div class="citation-row">
                <span class="chip cite-chip">&#128196; BMO Credit Policy §4.2 (2024)</span>
                <span class="chip cite-chip">&#128196; OSFI B-20 §3.1</span>
              </div>
            }
          </div>

          <!-- Guard status -->
          <div class="guard-status-grid">
            @for (gs of guardStatuses(); track gs.name) {
              <div class="guard-status-row" [class.fired]="gs.fired">
                <span class="status-dot" [class.dot-ok]="!gs.fired" [class.dot-bad]="gs.fired"></span>
                <span class="status-name">{{ gs.name }}</span>
                <span class="status-result" [class.result-ok]="!gs.fired" [class.result-bad]="gs.fired">
                  {{ gs.fired ? gs.firedMsg : 'PASS' }}
                </span>
              </div>
            }
          </div>

          @if (mode() === 'bad') {
            <div class="blocked-banner">
              <span class="blocked-icon">&#128683;</span>
              <strong>Response blocked.</strong> Faithfulness score 0.21 &mdash; below 0.80 threshold. Answer not delivered to user.
            </div>
          }
          @if (mode() === 'good') {
            <div class="cleared-banner">
              <span class="cleared-icon">&#10003;</span>
              <strong>All guards passed.</strong> Response delivered with citations and compliance disclaimer.
            </div>
          }
        </div>
      </section>

      <!-- ── Section 4: Eval scorecard ────────────────────────────────── -->
      <section class="section">
        <div class="section-label">
          <span class="eyebrow">Quality Gate</span>
          <h2 class="section-title">Eval scorecard — rag-eval-engine</h2>
          <p class="section-sub">
            LLM-as-judge pipeline scores every response across three dimensions.
            CI fails if any metric drops below its floor.
          </p>
        </div>

        <div class="card scorecard">
          <div class="score-header-row">
            <span class="score-run-label mono">Run #247 &nbsp;·&nbsp; 2026-06-23 09:41 UTC</span>
            <span class="tag ok-tag">&#9679; Gate: PASS</span>
          </div>
          <div class="score-metrics">
            @for (m of scoreMetrics; track m.label) {
              <div class="score-row">
                <span class="score-label">{{ m.label }}</span>
                <div class="score-bar-wrap">
                  <div
                    class="score-bar"
                    [class.bar-ok]="m.color === 'ok'"
                    [class.bar-warn]="m.color === 'warn'"
                    [class.bar-bad]="m.color === 'bad'"
                    [style.width.%]="m.value"
                  ></div>
                </div>
                <span
                  class="score-pct mono"
                  [class.score-ok]="m.color === 'ok'"
                  [class.score-warn]="m.color === 'warn'"
                  [class.score-bad]="m.color === 'bad'"
                >{{ m.value }}%</span>
                <span class="score-floor mono">&gt; {{ floorFor(m) }}%</span>
              </div>
            }
          </div>
          <div class="score-footnote">
            Scored by <span class="mono">rag-eval-engine</span> &mdash; multi-criteria LLM-as-judge with
            adversarial test set. Floors: Faithfulness &ge;85, Citation &ge;90, Suitability &ge;80.
          </div>
        </div>
      </section>

      <!-- ── Section 5: Velocity note ─────────────────────────────────── -->
      <section class="section velocity-section">
        <div class="card velocity-card">
          <div class="velocity-icon">&#9889;</div>
          <div class="velocity-body">
            <h3 class="velocity-title">Guardrails make teams faster, not slower</h3>
            <p class="velocity-text">
              When every AI-authored commit has passed a local Ollama reviewer (<span class="mono">git-sentry</span>),
              custom ESLint rules, and typed golden templates, human reviewers stop second-guessing
              AI output and start shipping with confidence. When the copilot's every answer carries
              a faithfulness score, citation set, and PII audit trail, compliance sign-off shrinks
              from days to hours. The guardrail overhead at the boundary pays for itself the moment
              a PR lands in production without a hallucinated API call or a naked PII leak.
            </p>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .section { margin-bottom: 3rem; }

    .section-label { margin-bottom: 1.25rem; }
    .section-title { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.35rem; color: var(--text); }
    .section-sub { color: var(--muted); margin: 0; max-width: 70ch; font-size: 0.92rem; }

    /* Dev guard grid — 3 cols on wide, 2 on medium, 1 on narrow */
    .guard-grid { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 780px) { .guard-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 520px) { .guard-grid { grid-template-columns: 1fr; } }

    /* Run-time guard grid — 2 cols */
    .run-grid { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 600px) { .run-grid { grid-template-columns: 1fr; } }

    .guard-card, .run-card {
      display: flex; flex-direction: column; gap: 0.55rem;
      transition: border-color 0.15s ease;
    }
    .guard-card:hover, .run-card:hover { border-color: var(--line-2); }

    .guard-top { display: flex; align-items: center; justify-content: space-between; }
    .guard-icon { font-size: 1.4rem; line-height: 1; }
    .guard-title { font-size: 0.95rem; font-weight: 700; color: var(--text); margin: 0; }
    .guard-why { font-size: 0.83rem; color: var(--muted); margin: 0; line-height: 1.5; }

    .dev-tag { color: var(--brand-2); border-color: rgba(56,189,248,0.3); background: rgba(56,189,248,0.08); }
    .run-tag { color: var(--accent); border-color: rgba(200,162,74,0.3); background: rgba(200,162,74,0.08); }
    .ok-tag  { color: var(--ok);   border-color: rgba(52,211,153,0.35); background: rgba(52,211,153,0.08); }

    /* ── Demo card ───────────────────────────────────────────────────── */
    .demo-card { display: flex; flex-direction: column; gap: 1.25rem; }

    .demo-toggle-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }

    .active-bad { background: rgba(248,113,113,0.12) !important; border-color: var(--bad) !important; color: var(--bad) !important; }
    .active-ok  { background: rgba(52,211,153,0.12) !important; border-color: var(--ok)  !important; color: var(--ok)  !important; }

    .answer-bubble {
      border-radius: var(--radius-sm); padding: 1rem 1.15rem;
      border: 1px solid var(--line); background: var(--panel-2);
      transition: border-color 0.25s ease, background 0.25s ease;
    }
    .answer-bad { border-color: var(--bad); background: rgba(248,113,113,0.07); }
    .answer-ok  { border-color: var(--ok);  background: rgba(52,211,153,0.06); }

    .answer-role { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--muted); margin-bottom: 0.45rem; }
    .answer-text { margin: 0; color: var(--text); font-size: 0.92rem; line-height: 1.6; }

    .citation-row { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .cite-chip { color: var(--brand-2); border-color: rgba(56,189,248,0.3); font-size: 0.75rem; }

    /* Guard status rows */
    .guard-status-grid { display: flex; flex-direction: column; gap: 0.45rem; }
    .guard-status-row {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);
      background: var(--panel-2); border: 1px solid var(--line);
      font-size: 0.83rem;
    }
    .guard-status-row.fired { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.06); }

    .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-ok  { background: var(--ok);  box-shadow: 0 0 6px var(--ok); }
    .dot-bad { background: var(--bad); box-shadow: 0 0 6px var(--bad); }

    .status-name { flex: 1; color: var(--text); }
    .result-ok  { color: var(--ok);  font-weight: 700; margin-left: auto; }
    .result-bad { color: var(--bad); font-weight: 700; margin-left: auto; font-size: 0.78rem; }

    .blocked-banner, .cleared-banner {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.88rem;
    }
    .blocked-banner { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.4); color: var(--bad); }
    .cleared-banner { background: rgba(52,211,153,0.1);  border: 1px solid rgba(52,211,153,0.4);  color: var(--ok); }
    .blocked-icon, .cleared-icon { font-size: 1.1rem; }

    /* ── Scorecard ───────────────────────────────────────────────────── */
    .scorecard { display: flex; flex-direction: column; gap: 1rem; }

    .score-header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
    .score-run-label { font-size: 0.8rem; color: var(--muted); }

    .score-metrics { display: flex; flex-direction: column; gap: 0.85rem; }
    .score-row { display: grid; grid-template-columns: 160px 1fr 52px 60px; align-items: center; gap: 0.75rem; }
    @media (max-width: 560px) { .score-row { grid-template-columns: 1fr 1fr; } }

    .score-label { font-size: 0.88rem; color: var(--text); font-weight: 600; }
    .score-bar-wrap { background: var(--panel-2); border-radius: 999px; height: 8px; overflow: hidden; border: 1px solid var(--line); }
    .score-bar { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
    .bar-ok   { background: linear-gradient(90deg, var(--ok), #6ee7b7); }
    .bar-warn { background: linear-gradient(90deg, var(--warn), #fde68a); }
    .bar-bad  { background: linear-gradient(90deg, var(--bad), #fca5a5); }

    .score-pct  { font-size: 0.88rem; font-weight: 700; text-align: right; }
    .score-ok   { color: var(--ok); }
    .score-warn { color: var(--warn); }
    .score-bad  { color: var(--bad); }
    .score-floor { font-size: 0.75rem; color: var(--faint); }

    .score-footnote { font-size: 0.8rem; color: var(--muted); border-top: 1px solid var(--line); padding-top: 0.75rem; }

    /* ── Velocity ────────────────────────────────────────────────────── */
    .velocity-card {
      display: flex; gap: 1.25rem; align-items: flex-start;
      border-color: rgba(10,132,255,0.3); background: rgba(10,132,255,0.05);
    }
    .velocity-icon { font-size: 2rem; line-height: 1; flex-shrink: 0; margin-top: 0.1rem; }
    .velocity-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.45rem; color: var(--text); }
    .velocity-text  { margin: 0; color: var(--muted); font-size: 0.88rem; line-height: 1.65; }
  `],
})
export class GuardrailsComponent {

  // ── Interactive demo ──────────────────────────────────────────────────────
  readonly mode = signal<'bad' | 'good'>('good');

  readonly answerText = computed(() =>
    this.mode() === 'bad'
      ? 'Based on current market data, the maximum allowable LTV for a residential mortgage in Ontario is 92.5%, with a stress-test floor of 4.1% as of Q1 2026.'
      : 'According to BMO Credit Policy §4.2 (2024) and OSFI Guideline B-20 §3.1, the maximum insured LTV for a residential mortgage is 95%, subject to a qualifying rate stress-test at the greater of the contracted rate plus 2% or 5.25%. Uninsured mortgages are capped at 80% LTV.'
  );

  readonly guardStatuses = computed(() => {
    const bad = this.mode() === 'bad';
    return [
      {
        name: 'Groundedness check (RAG retrieval overlap)',
        fired: bad,
        firedMsg: 'FAIL — answer not found in retrieved chunks',
      },
      {
        name: 'Faithfulness score (LLM-as-judge)',
        fired: bad,
        firedMsg: 'FAIL — score 0.21, threshold 0.80',
      },
      {
        name: 'Citation presence',
        fired: bad,
        firedMsg: 'FAIL — 0 citations attached',
      },
      {
        name: 'PII redaction scan',
        fired: false,
        firedMsg: '',
      },
      {
        name: 'Suitability gate (regulated advice)',
        fired: bad,
        firedMsg: 'FAIL — unverified figure, no policy ref',
      },
    ];
  });

  // ── Static data ───────────────────────────────────────────────────────────
  readonly devGuards: DevGuard[] = [
    {
      id: 'prompt-boundary',
      icon: '📌',
      title: 'Prompt boundaries & shared system-prompt file',
      why: 'A repo-pinned AGENTS.md / .cursorrules defines project conventions, forbidden patterns, and approved libraries — the AI reads it before every generation, bounding the solution space.',
      tag: 'Prompt Engineering',
    },
    {
      id: 'golden-templates',
      icon: '🏗️',
      title: 'Base code patterns / golden templates',
      why: 'Canonical Angular standalone component, service, and signal-store templates in /patterns/. AI fills the skeleton, not a blank page — structural drift is impossible.',
      tag: 'Architecture',
    },
    {
      id: 'lint-ci',
      icon: '🔍',
      title: 'Automated linters + custom ESLint rules',
      why: 'Custom ESLint plugin enforces: no deprecated Angular APIs, no zone.js imports, no raw HttpClient (must use ApiService), no untyped any. CI blocks merge on violation.',
      tag: 'CI / Lint',
    },
    {
      id: 'git-sentry',
      icon: '🛡️',
      title: 'Local AI reviewer on every commit (git-sentry)',
      why: 'git-sentry runs 4 Ollama agents (security, hallucination, style, complexity) on every git commit/push via a pre-push hook. Hallucinated RxJS operators, removed APIs, and out-of-policy imports are blocked locally before CI even starts.',
      tag: 'git-sentry',
    },
    {
      id: 'type-safety',
      icon: '🔒',
      title: 'TypeScript strict + Zod schemas',
      why: 'Strict mode + noUncheckedIndexedAccess + exactOptionalPropertyTypes. AI-generated code that invents optional fields or silently widens types fails the compiler — no hallucination survives tsc.',
      tag: 'Type Safety',
    },
    {
      id: 'human-review',
      icon: '👁️',
      title: 'Human review gate for all AI-authored changes',
      why: 'All AI-generated PRs are tagged ai-assisted. Reviewers use a checklist: no magic strings, no new dependencies, no bypassed guards. Pattern labelling creates a feedback loop that improves the system-prompt over time.',
      tag: 'Process',
    },
  ];

  readonly runGuards: RunGuard[] = [
    {
      id: 'rag-only',
      icon: '📚',
      title: 'RAG-only grounding',
      detail: 'The copilot NEVER draws on parametric memory. Every claim must be supported by a retrieved policy chunk. If retrieval is empty the system replies "I cannot find a policy that covers this question."',
      tag: 'Grounding',
    },
    {
      id: 'citations',
      icon: '🔗',
      title: 'Mandatory citations',
      detail: 'Every response includes structured citations (document title, section, effective date). Responses with zero citations are rejected before delivery regardless of content quality.',
      tag: 'Citation',
    },
    {
      id: 'faithfulness',
      icon: '⚖️',
      title: 'Faithfulness scoring (rag-eval-engine)',
      detail: 'An LLM-as-judge pipeline scores each response on faithfulness (claim ↔ source overlap), citation coverage, and answer suitability. Responses below threshold are blocked. Scores are logged for drift detection.',
      tag: 'rag-eval-engine',
    },
    {
      id: 'pii',
      icon: '🕵️',
      title: 'PII redaction',
      detail: 'A pre-delivery regex + NER scan strips or masks SINs, account numbers, DOBs, and names before any response reaches the client. Detected PII is flagged in the audit log.',
      tag: 'Privacy',
    },
    {
      id: 'refusal',
      icon: '🚫',
      title: 'Ungrounded-answer refusal',
      detail: 'When groundedness falls below 0.60 the engine returns a structured refusal rather than a low-confidence answer. The refusal itself is logged with the failed query for corpus gap analysis.',
      tag: 'Safety',
    },
    {
      id: 'hitl',
      icon: '✋',
      title: 'Human-in-the-loop for material actions',
      detail: 'Any tool call that mutates state (draft memo, submit escalation, flag account) enters an approval queue. A banker must explicitly confirm before the action executes. The approval is hash-chained into the audit trail.',
      tag: 'HITL',
    },
  ];

  readonly scoreMetrics: ScoreMetric[] = [
    { label: 'Faithfulness',      value: 94, color: 'ok' },
    { label: 'Citation coverage', value: 100, color: 'ok' },
    { label: 'Suitability',       value: 88, color: 'ok' },
  ];

  readonly floorFor = (m: ScoreMetric): number => {
    const floors: Record<string, number> = {
      'Faithfulness': 85,
      'Citation coverage': 90,
      'Suitability': 80,
    };
    return floors[m.label] ?? 80;
  };
}
