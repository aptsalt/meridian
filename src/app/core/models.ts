/**
 * Meridian domain models.
 *
 * Meridian is an Angular agentic banking-policy copilot — an enterprise-grade
 * mirror of BMO's "Lumi" assistant (generative-AI RAG over thousands of policy
 * documents) re-imagined as a modern, zoneless, signals-first Angular app.
 */

export type PolicyCategory =
  | 'Payments'
  | 'KYC / AML'
  | 'Lending'
  | 'API Security'
  | 'Data & Privacy'
  | 'AI Governance'
  | 'Sanctions';

export interface PolicyDoc {
  id: string;
  code: string; // e.g. "PAY-114"
  title: string;
  category: PolicyCategory;
  jurisdiction: string; // e.g. "Canada (OSFI)"
  updated: string; // ISO date
  owner: string;
  body: string;
  tags: string[];
}

export interface Citation {
  marker: number; // [1], [2] ...
  policyId: string;
  code: string;
  title: string;
  snippet: string;
}

export type ToolName =
  | 'policy_search'
  | 'compliance_check'
  | 'portfolio_scan'
  | 'rate_lookup';

export type ToolStatus = 'running' | 'done' | 'error';

export interface ToolCall {
  id: string;
  tool: ToolName;
  args: Record<string, unknown>;
  status: ToolStatus;
  result?: string;
  ms?: number;
}

export type TraceNode =
  | 'plan'
  | 'retrieve'
  | 'grade'
  | 'tool'
  | 'draft'
  | 'guardrail'
  | 'approval'
  | 'audit';

export type TraceStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

export interface TraceStep {
  id: string;
  node: TraceNode;
  label: string;
  detail?: string;
  status: TraceStatus;
  ms?: number;
}

export type RunPhase =
  | 'idle'
  | 'planning'
  | 'retrieving'
  | 'grading'
  | 'tooling'
  | 'drafting'
  | 'awaiting_approval'
  | 'finalized'
  | 'rejected';

export type Role = 'user' | 'assistant';

export interface EvalResult {
  overall: number; // 0-100
  faithfulness: number;
  citationCoverage: number;
  suitability: number;
  unsupported: number; // count of unsupported claims
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  citations: Citation[];
  streaming: boolean;
  phase?: RunPhase;
  rejectNote?: string;
  feedback?: 'up' | 'down';
  evalResult?: EvalResult;
}

export interface Feedback {
  id: string;
  messageId: string;
  rating: 'up' | 'down';
  note?: string;
  ts: string;
}

export interface RunCost {
  ms: number;
  tokens: number;
}

export interface AuditEntry {
  seq: number;
  ts: string;
  runId: string;
  action: string;
  prevHash: string;
  hash: string;
}

export interface AgentRun {
  id: string;
  query: string;
  phase: RunPhase;
  trace: TraceStep[];
  tools: ToolCall[];
  citations: Citation[];
  draft: string;
  retries: number;
  grounded: boolean;
}
