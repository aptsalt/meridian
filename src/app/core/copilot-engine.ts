import { Injectable, computed, signal } from '@angular/core';
import { POLICY_CORPUS } from './policy-corpus';
import {
  AgentRun,
  AuditEntry,
  ChatMessage,
  Citation,
  PolicyDoc,
  ToolCall,
  ToolName,
  TraceStep,
} from './models';

/**
 * CopilotEngine — the agentic RAG "brain" of Meridian.
 *
 * It runs a transparent, multi-step agent loop entirely client-side (no keys,
 * deterministic) so the whole pattern is inspectable in an interview:
 *
 *   plan → retrieve → grade (retry if weak) → MCP tool calls →
 *   stream a grounded, cited draft → output guardrails →
 *   HUMAN-IN-THE-LOOP approval → audit (hash-chained)
 *
 * State is exposed as signals; the UI is pure OnPush/zoneless and simply reads
 * them. A real deployment would swap the mock steps for Azure OpenAI + a vector
 * store behind the same signal surface (the design seam).
 */
@Injectable({ providedIn: 'root' })
export class CopilotEngine {
  private readonly corpus: PolicyDoc[] = POLICY_CORPUS;

  // ---- Reactive state (signals) --------------------------------------------
  private readonly _messages = signal<ChatMessage[]>([
    {
      id: 'm0',
      role: 'assistant',
      text:
        'Hi — I am Meridian, your grounded banking-policy copilot. Ask me a ' +
        'policy question (wires, KYC/AML, FAPI security, mortgage stress test, ' +
        'AI governance…) and I will retrieve, cite, and route material actions ' +
        'through human approval.',
      citations: [],
      streaming: false,
    },
  ]);
  private readonly _run = signal<AgentRun | null>(null);
  private readonly _audit = signal<AuditEntry[]>([]);
  private readonly _busy = signal(false);

  readonly messages = this._messages.asReadonly();
  readonly run = this._run.asReadonly();
  readonly audit = this._audit.asReadonly();
  readonly busy = this._busy.asReadonly();

  readonly phase = computed(() => this._run()?.phase ?? 'idle');
  readonly awaitingApproval = computed(() => this.phase() === 'awaiting_approval');
  readonly groundedness = computed(() => {
    const r = this._run();
    if (!r || !r.citations.length) return 0;
    return Math.min(100, 55 + r.citations.length * 12 + (r.grounded ? 9 : 0));
  });

  readonly suggestions: string[] = [
    'What are the limits and reports for a CAD 25,000 international wire?',
    'How must we secure a Financial-grade open-banking API?',
    'What is the mortgage stress-test qualifying rate under B-20?',
    'When must we file a suspicious transaction report?',
    'What guardrails apply to a generative-AI policy assistant?',
  ];

  // ---- Public API ----------------------------------------------------------
  async ask(query: string): Promise<void> {
    const q = query.trim();
    if (!q || this._busy()) return;
    this._busy.set(true);

    this.pushMessage({ role: 'user', text: q, citations: [], streaming: false });

    const run: AgentRun = {
      id: 'run-' + (this._audit().length + 1),
      query: q,
      phase: 'planning',
      trace: [],
      tools: [],
      citations: [],
      draft: '',
      retries: 0,
      grounded: false,
    };
    this._run.set({ ...run });

    // 1) PLAN
    await this.step(run, 'plan', 'Plan', 'Decompose the question and pick tools', 420);

    // 2) RETRIEVE (+ optional grade/retry)
    this.setPhase(run, 'retrieving');
    let hits = await this.retrieve(run, q);
    this.setPhase(run, 'grading');
    let grade = await this.grade(run, q, hits);
    if (grade < 2 && hits.length) {
      run.retries++;
      await this.step(run, 'grade', 'Re-retrieve', 'Weak grounding — rewriting query and retrying', 520, 'running');
      hits = await this.retrieve(run, this.rewrite(q), true);
      grade = await this.grade(run, q, hits);
    }
    run.grounded = grade >= 2;

    // 3) MCP TOOL CALLS (compliance / scanning), data-driven by the question
    this.setPhase(run, 'tooling');
    await this.runTools(run, q, hits);

    // 4) DRAFT (streamed) with citations
    this.setPhase(run, 'drafting');
    const citations = this.toCitations(hits);
    run.citations = citations;
    this._run.set({ ...run });
    const draft = this.composeAnswer(q, hits, run.tools, citations);
    const msg = this.pushMessage({
      role: 'assistant',
      text: '',
      citations,
      streaming: true,
      phase: 'drafting',
    });
    await this.stream(msg.id, draft, run);

    // 5) GUARDRAILS
    await this.step(run, 'guardrail', 'Guardrails', 'PII redaction · citation check · disclaimer', 360);

    // 6) HUMAN-IN-THE-LOOP
    this.setPhase(run, 'awaiting_approval');
    await this.step(run, 'approval', 'Awaiting approval', 'Material answer paused for advisor sign-off', 0, 'running');
    this._busy.set(false);
  }

  approve(): void {
    const run = this._run();
    if (!run || run.phase !== 'awaiting_approval') return;
    this.completeStep(run, 'approval', 'Approved by advisor', 'done');
    this.step(run, 'audit', 'Audit', 'Hash-chained decision recorded', 280);
    this.setPhase(run, 'finalized');
    this.writeAudit(run.id, 'APPROVED — answer released to client channel');
    this.markLastAssistant(false, 'finalized');
  }

  reject(note = 'Rejected by advisor'): void {
    const run = this._run();
    if (!run || run.phase !== 'awaiting_approval') return;
    this.completeStep(run, 'approval', note, 'error');
    this.setPhase(run, 'rejected');
    this.writeAudit(run.id, 'REJECTED — ' + note);
    this.markLastAssistant(false, 'rejected');
  }

  reset(): void {
    this._messages.set([this._messages()[0]]);
    this._run.set(null);
  }

  // ---- Agent steps ---------------------------------------------------------
  private async retrieve(run: AgentRun, q: string, isRetry = false): Promise<Scored[]> {
    await this.step(
      run,
      'retrieve',
      isRetry ? 'Retrieve (retry)' : 'Retrieve',
      'Hybrid search over ' + this.corpus.length + ' policy documents',
      560,
    );
    const terms = this.tokens(q);
    const scored: Scored[] = this.corpus
      .map((doc) => ({ doc, score: this.score(doc, terms) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return scored;
  }

  private async grade(run: AgentRun, _q: string, hits: Scored[]): Promise<number> {
    await this.step(run, 'grade', 'Grade', 'LLM-as-judge groundedness on retrieved docs', 380);
    return hits.length;
  }

  private async runTools(run: AgentRun, q: string, hits: Scored[]): Promise<void> {
    const lower = q.toLowerCase();
    const planned: ToolName[] = ['policy_search'];
    if (/wire|transfer|payment|sanction|aml|kyc|suspicious/.test(lower)) planned.push('compliance_check');
    if (/portfolio|holding|concentration|restricted|client/.test(lower)) planned.push('portfolio_scan');
    if (/rate|mortgage|stress|interest/.test(lower)) planned.push('rate_lookup');

    for (const tool of planned) {
      await this.invokeTool(run, tool, q, hits);
    }
  }

  private async invokeTool(run: AgentRun, tool: ToolName, q: string, hits: Scored[]): Promise<void> {
    const call: ToolCall = {
      id: 't' + (run.tools.length + 1),
      tool,
      args: this.toolArgs(tool, q),
      status: 'running',
    };
    run.tools = [...run.tools, call];
    this.addTrace(run, 'tool', this.toolLabel(tool), 'MCP tool invocation', 'running');
    this._run.set({ ...run });
    await this.delay(460);

    call.status = 'done';
    call.ms = 460;
    call.result = this.toolResult(tool, hits);
    run.tools = run.tools.map((t) => (t.id === call.id ? { ...call } : t));
    this.completeStep(run, 'tool', this.toolLabel(tool) + ' ✓', 'done');
    this._run.set({ ...run });
  }

  private async stream(messageId: string, full: string, run: AgentRun): Promise<void> {
    this.addTrace(run, 'draft', 'Draft', 'Streaming grounded answer with citations', 'running');
    const tokens = full.split(/(\s+)/);
    let acc = '';
    for (const tok of tokens) {
      acc += tok;
      this.updateMessage(messageId, { text: acc });
      await this.delay(14);
    }
    this.updateMessage(messageId, { streaming: false });
    this.completeStep(run, 'draft', 'Draft complete', 'done');
  }

  // ---- Retrieval scoring ---------------------------------------------------
  private score(doc: PolicyDoc, terms: string[]): number {
    const hay = (doc.title + ' ' + doc.body + ' ' + doc.tags.join(' ') + ' ' + doc.category).toLowerCase();
    let s = 0;
    for (const t of terms) {
      if (doc.tags.some((tag) => tag.includes(t))) s += 3;
      if (doc.title.toLowerCase().includes(t)) s += 2;
      if (hay.includes(t)) s += 1;
    }
    return s;
  }

  private tokens(q: string): string[] {
    return Array.from(
      new Set(
        q
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP.has(w)),
      ),
    );
  }

  private rewrite(q: string): string {
    return q + ' policy requirement threshold compliance';
  }

  private toCitations(hits: Scored[]): Citation[] {
    return hits.map((h, i) => ({
      marker: i + 1,
      policyId: h.doc.id,
      code: h.doc.code,
      title: h.doc.title,
      snippet: h.doc.body.slice(0, 160) + (h.doc.body.length > 160 ? '…' : ''),
    }));
  }

  // ---- Answer composition (deterministic, grounded) ------------------------
  private composeAnswer(q: string, hits: Scored[], tools: ToolCall[], cites: Citation[]): string {
    if (!hits.length) {
      return (
        'I could not find a governing policy document for that question, so I ' +
        'will not guess. Per AI-601, I only answer when grounded in retrieved ' +
        'sources. Try rephrasing toward payments, KYC/AML, API security, ' +
        'lending, privacy, sanctions, or AI governance.'
      );
    }
    const lead = hits[0].doc;
    const parts: string[] = [];
    parts.push(`Based on ${lead.code} — ${lead.title} [1], here is the grounded answer:`);
    parts.push('');
    parts.push(this.summarize(lead) + ` [1]`);
    if (hits[1]) parts.push(this.summarize(hits[1].doc) + ` [2]`);
    if (hits[2]) parts.push(this.summarize(hits[2].doc) + ` [3]`);

    const compliance = tools.find((t) => t.tool === 'compliance_check');
    if (compliance?.result) {
      parts.push('');
      parts.push('Compliance check: ' + compliance.result);
    }
    const scan = tools.find((t) => t.tool === 'portfolio_scan');
    if (scan?.result) parts.push('Portfolio scan: ' + scan.result);
    const rate = tools.find((t) => t.tool === 'rate_lookup');
    if (rate?.result) parts.push('Rate lookup: ' + rate.result);

    parts.push('');
    parts.push(
      'This guidance is grounded in the cited policies and is paused for advisor ' +
      'approval before release (AI-601, human-in-the-loop). It is not financial ' +
      'advice.',
    );
    return parts.join('\n');
  }

  private summarize(doc: PolicyDoc): string {
    const first = doc.body.split('. ')[0];
    return first.endsWith('.') ? first : first + '.';
  }

  // ---- Tool helpers --------------------------------------------------------
  private toolArgs(tool: ToolName, q: string): Record<string, unknown> {
    switch (tool) {
      case 'policy_search':
        return { query: q, top_k: 3 };
      case 'compliance_check':
        return { scope: 'transaction', lists: ['FINTRAC', 'OFAC', 'OSFI'] };
      case 'portfolio_scan':
        return { account: 'C-1001', checks: ['restricted', 'concentration'] };
      case 'rate_lookup':
        return { product: 'mortgage', basis: 'OSFI B-20' };
    }
  }

  private toolResult(tool: ToolName, hits: Scored[]): string {
    switch (tool) {
      case 'policy_search':
        return `${hits.length} governing policies retrieved (${hits.map((h) => h.doc.code).join(', ')}).`;
      case 'compliance_check':
        return 'No sanctions hit; thresholds applied; escalation rules noted.';
      case 'portfolio_scan':
        return '1 restricted holding flagged; issuer concentration within limit.';
      case 'rate_lookup':
        return 'Qualifying rate = max(contract + 2%, minimum qualifying rate).';
    }
  }

  private toolLabel(tool: ToolName): string {
    return {
      policy_search: 'policy_search',
      compliance_check: 'compliance_check',
      portfolio_scan: 'portfolio_scan',
      rate_lookup: 'rate_lookup',
    }[tool];
  }

  // ---- Trace + message + audit primitives ----------------------------------
  private async step(
    run: AgentRun,
    node: TraceStep['node'],
    label: string,
    detail: string,
    ms: number,
    status: TraceStep['status'] = 'running',
  ): Promise<void> {
    this.addTrace(run, node, label, detail, status);
    this._run.set({ ...run });
    if (ms > 0) await this.delay(ms);
    if (status === 'running') this.completeStep(run, node, label, 'done', ms);
  }

  private addTrace(
    run: AgentRun,
    node: TraceStep['node'],
    label: string,
    detail: string,
    status: TraceStep['status'],
  ): void {
    const stepEntry: TraceStep = {
      id: 's' + (run.trace.length + 1),
      node,
      label,
      detail,
      status,
    };
    run.trace = [...run.trace, stepEntry];
  }

  private completeStep(
    run: AgentRun,
    node: TraceStep['node'],
    label: string,
    status: TraceStep['status'],
    ms?: number,
  ): void {
    let patched = false;
    run.trace = run.trace.map((s) => {
      if (!patched && s.node === node && s.status === 'running') {
        patched = true;
        return { ...s, label, status, ms };
      }
      return s;
    });
    this._run.set({ ...run });
  }

  private setPhase(run: AgentRun, phase: AgentRun['phase']): void {
    run.phase = phase;
    this._run.set({ ...run });
  }

  private pushMessage(m: Omit<ChatMessage, 'id'>): ChatMessage {
    const msg: ChatMessage = { ...m, id: 'm' + (this._messages().length + 1) };
    this._messages.update((list) => [...list, msg]);
    return msg;
  }

  private updateMessage(id: string, patch: Partial<ChatMessage>): void {
    this._messages.update((list) =>
      list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }

  private markLastAssistant(streaming: boolean, phase: ChatMessage['phase']): void {
    const list = this._messages();
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'assistant') {
        this.updateMessage(list[i].id, { streaming, phase });
        break;
      }
    }
  }

  private writeAudit(runId: string, action: string): void {
    const prev = this._audit();
    const prevHash = prev.length ? prev[prev.length - 1].hash : 'GENESIS';
    const seq = prev.length + 1;
    const ts = this.stamp();
    const hash = this.chainHash(prevHash + '|' + seq + '|' + runId + '|' + action);
    this._audit.update((a) => [...a, { seq, ts, runId, action, prevHash, hash }]);
  }

  private chainHash(input: string): string {
    let h1 = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h1 ^= input.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0');
  }

  private stamp(): string {
    // Deterministic-ish timestamp without Date.now in template paths.
    return new Date().toISOString().slice(11, 19);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

interface Scored {
  doc: PolicyDoc;
  score: number;
}

const STOP = new Set([
  'the', 'and', 'for', 'are', 'what', 'when', 'how', 'does', 'with', 'must',
  'our', 'can', 'this', 'that', 'have', 'has', 'a', 'an', 'is', 'of', 'to',
  'do', 'we', 'i', 'should', 'apply', 'applies',
]);
