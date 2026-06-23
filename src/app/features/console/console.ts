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

/**
 * ConsoleComponent — the agentic RAG copilot. Zoneless + OnPush; every dynamic
 * value is a signal read from the CopilotEngine. Demonstrates: signals/computed,
 * new control flow (@if/@for/@switch), @defer for the audit panel, two-way
 * binding via ngModel + signal, and a human-in-the-loop approval gate.
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

  readonly draft = signal('');
  readonly tools = computed(() => this.run()?.tools ?? []);
  readonly trace = computed(() => this.run()?.trace ?? []);
  readonly citations = computed(() => {
    // citations of the latest assistant message
    const msgs = this.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant' && msgs[i].citations.length) {
        return msgs[i].citations;
      }
    }
    return [];
  });

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

  reject(): void {
    this.engine.reject('Needs a second-line compliance review');
  }

  reset(): void {
    this.engine.reset();
    this.draft.set('');
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
