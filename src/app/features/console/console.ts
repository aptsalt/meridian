import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CopilotEngine } from '../../core/copilot-engine';
import { AgentTraceComponent } from './agent-trace';
import { Citation, PolicyCategory } from '../../core/models';

interface OpenPolicy {
  code: string;
  title: string;
  jurisdiction: string;
  owner: string;
  updated: string;
  tags: string[];
  markText: string;
  restText: string;
  marker: number;
}

/**
 * ConsoleComponent — the agentic RAG copilot. Zoneless + OnPush; every dynamic
 * value is a signal read from the CopilotEngine. Demonstrates signals/computed,
 * new control flow (@if/@for/@switch), @defer, two-way binding, and a rich
 * governance surface: reject-with-reason, verifiable citations, span feedback,
 * inline evaluation, permission-gated retrieval scope, and cost transparency.
 */
@Component({
  selector: 'app-console',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AgentTraceComponent],
  templateUrl: './console.html',
  styleUrl: './console.scss',
})
export class ConsoleComponent {
  private readonly engine = inject(CopilotEngine);

  readonly messages = this.engine.messages;
  readonly run = this.engine.run;
  readonly busy = this.engine.busy;
  readonly phase = this.engine.phase;
  readonly awaitingApproval = this.engine.awaitingApproval;
  readonly groundedness = this.engine.groundedness;
  readonly audit = this.engine.audit;
  readonly suggestions = this.engine.suggestions;
  readonly cost = this.engine.cost;
  readonly allCategories = this.engine.allCategories;
  readonly allowedCount = this.engine.allowedCount;

  readonly draft = signal('');
  readonly rejecting = signal(false);
  readonly rejectNote = signal('');
  readonly openPolicy = signal<OpenPolicy | null>(null);

  readonly tools = computed(() => this.run()?.tools ?? []);
  readonly trace = computed(() => this.run()?.trace ?? []);

  readonly phaseLabel = computed(() => {
    const map: Record<string, string> = {
      idle: 'Idle',
      planning: 'Planning',
      retrieving: 'Retrieving',
      grading: 'Grading',
      tooling: 'Calling tools',
      drafting: 'Drafting',
      awaiting_approval: 'Awaiting approval',
      finalized: 'Finalized',
      rejected: 'Rejected',
    };
    return map[this.phase()] ?? 'Idle';
  });

  isAllowed(c: PolicyCategory): boolean {
    return this.engine.isAllowed(c);
  }
  toggleCategory(c: PolicyCategory): void {
    this.engine.toggleCategory(c);
  }

  send(): void {
    const q = this.draft().trim();
    if (!q || this.busy()) return;
    this.draft.set('');
    void this.engine.ask(q);
  }

  useSuggestion(s: string): void {
    if (this.busy()) return;
    this.draft.set(s);
    this.send();
  }

  approve(): void {
    this.engine.approve();
  }

  startReject(): void {
    this.rejecting.set(true);
    this.rejectNote.set('');
  }
  cancelReject(): void {
    this.rejecting.set(false);
  }
  confirmReject(): void {
    this.engine.reject(this.rejectNote());
    this.rejecting.set(false);
    this.rejectNote.set('');
  }

  feedbackUp(messageId: string): void {
    this.engine.recordFeedback(messageId, 'up');
  }
  feedbackDown(messageId: string): void {
    this.engine.recordFeedback(messageId, 'down');
  }
  evaluate(messageId: string): void {
    this.engine.evaluate(messageId);
  }

  /** Verifiable citation: open the full source doc with the cited span marked. */
  openCite(c: Citation): void {
    const doc = this.engine.getPolicy(c.policyId);
    if (!doc) return;
    const rawSnippet = c.snippet.replace(/…$/, '');
    const markLen = Math.min(rawSnippet.length, doc.body.length);
    this.openPolicy.set({
      code: doc.code,
      title: doc.title,
      jurisdiction: doc.jurisdiction,
      owner: doc.owner,
      updated: doc.updated,
      tags: doc.tags,
      marker: c.marker,
      markText: doc.body.slice(0, markLen),
      restText: doc.body.slice(markLen),
    });
  }
  closeCite(): void {
    this.openPolicy.set(null);
  }

  reset(): void {
    this.engine.reset();
    this.draft.set('');
    this.rejecting.set(false);
    this.openPolicy.set(null);
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
