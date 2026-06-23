import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { POLICY_CORPUS } from '../../core/policy-corpus';
import { PolicyCategory } from '../../core/models';

/**
 * PoliciesComponent — the RAG corpus browser. Pure signal-driven filtering:
 * `query` and `category` are signals, the filtered list is a `computed`. No
 * RxJS, no manual change detection — the whole list recomputes lazily when a
 * dependency changes (zoneless + OnPush).
 */
@Component({
  selector: 'app-policies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './policies.html',
  styleUrl: './policies.scss',
})
export class PoliciesComponent {
  readonly all = POLICY_CORPUS;
  readonly query = signal('');
  readonly category = signal<PolicyCategory | 'All'>('All');
  readonly expanded = signal<string | null>(null);

  readonly categories: (PolicyCategory | 'All')[] = [
    'All',
    'Payments',
    'KYC / AML',
    'Lending',
    'API Security',
    'Data & Privacy',
    'AI Governance',
    'Sanctions',
  ];

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const cat = this.category();
    return this.all.filter((d) => {
      const catOk = cat === 'All' || d.category === cat;
      if (!catOk) return false;
      if (!q) return true;
      const hay = (d.title + ' ' + d.body + ' ' + d.code + ' ' + d.tags.join(' ')).toLowerCase();
      return hay.includes(q);
    });
  });

  readonly count = computed(() => this.filtered().length);

  toggle(id: string): void {
    this.expanded.update((cur) => (cur === id ? null : id));
  }

  clear(): void {
    this.query.set('');
    this.category.set('All');
  }
}
