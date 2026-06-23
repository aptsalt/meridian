import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from './core/session';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly session = inject(SessionService);

  readonly user = this.session.user;
  readonly tokenStatus = this.session.tokenStatus;
  readonly initials = computed(() => {
    const u = this.session.user();
    return u ? u.slice(0, 2).toUpperCase() : '–';
  });

  readonly nav = [
    { path: '/', label: 'Copilot', icon: '◈', exact: true },
    { path: '/policies', label: 'Policies', icon: '▤', exact: false },
    { path: '/security', label: 'Security', icon: '⛨', exact: false },
    { path: '/guardrails', label: 'Guardrails', icon: '⚖', exact: false },
    { path: '/architecture', label: 'Architecture', icon: '⬡', exact: false },
  ];

  rotate(): void {
    this.session.rotate();
  }
}
