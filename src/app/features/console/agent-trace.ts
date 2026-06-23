import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TraceStep } from '../../core/models';

/**
 * AgentTrace — a presentational child that visualises the agent's reasoning
 * trace. Demonstrates Angular's modern signal INPUTS (`input()`), an OnPush
 * component that re-renders purely from signal changes (zoneless).
 */
@Component({
  selector: 'app-agent-trace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="trace">
      @for (step of steps(); track step.id) {
        <li class="step" [attr.data-node]="step.node" [class]="'is-' + step.status">
          <span class="rail">
            <span class="node-dot"></span>
          </span>
          <span class="body">
            <span class="row">
              <span class="label">{{ step.label }}</span>
              @if (step.ms) { <span class="ms mono">{{ step.ms }}ms</span> }
              @switch (step.status) {
                @case ('running') { <span class="badge run">running</span> }
                @case ('done') { <span class="badge done">✓</span> }
                @case ('error') { <span class="badge err">rejected</span> }
                @case ('skipped') { <span class="badge skip">skipped</span> }
              }
            </span>
            @if (step.detail) { <span class="detail">{{ step.detail }}</span> }
          </span>
        </li>
      } @empty {
        <li class="empty">Ask a question to watch the agent reason step by step.</li>
      }
    </ol>
  `,
  styles: [`
    .trace { list-style: none; margin: 0; padding: 0; }
    .step { display: grid; grid-template-columns: 22px 1fr; gap: 0.5rem; padding: 0.15rem 0; }
    .rail { display: flex; justify-content: center; position: relative; }
    .rail::before {
      content: ''; position: absolute; top: 14px; bottom: -6px; width: 2px;
      background: var(--line-2);
    }
    .step:last-child .rail::before { display: none; }
    .node-dot {
      width: 11px; height: 11px; border-radius: 50%; margin-top: 5px;
      background: var(--faint); border: 2px solid var(--bg);
      box-shadow: 0 0 0 2px var(--line-2); z-index: 1;
    }
    .is-running .node-dot { background: var(--brand-2); box-shadow: 0 0 0 3px rgba(56,189,248,0.25); animation: pulse 1s infinite; }
    .is-done .node-dot { background: var(--ok); box-shadow: 0 0 0 2px rgba(52,211,153,0.3); }
    .is-error .node-dot { background: var(--bad); }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25); } }
    .body { padding-bottom: 0.35rem; }
    .row { display: flex; align-items: center; gap: 0.5rem; }
    .label { font-weight: 600; font-size: 0.86rem; }
    .ms { font-size: 0.68rem; color: var(--faint); }
    .badge { font-size: 0.62rem; padding: 0.05rem 0.4rem; border-radius: 999px; font-weight: 700; }
    .badge.run { background: rgba(56,189,248,0.16); color: var(--brand-2); }
    .badge.done { background: rgba(52,211,153,0.16); color: var(--ok); }
    .badge.err { background: rgba(248,113,113,0.16); color: var(--bad); }
    .badge.skip { background: var(--panel-2); color: var(--faint); }
    .detail { display: block; font-size: 0.74rem; color: var(--muted); }
    .empty { color: var(--faint); font-size: 0.82rem; padding: 0.5rem 0; }
  `],
})
export class AgentTraceComponent {
  readonly steps = input.required<TraceStep[]>();
}
