import { Routes } from '@angular/router';
import { authGuard, scopeGuard } from './core/security';

/**
 * Lazy, standalone routes. The copilot console is guarded by a functional
 * CanActivateFn (session + active token) and a scope guard (advice.draft).
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Meridian · Copilot',
    canActivate: [authGuard, scopeGuard('advice.draft')],
    loadComponent: () =>
      import('./features/console/console').then((m) => m.ConsoleComponent),
  },
  {
    path: 'policies',
    title: 'Meridian · Policy Library',
    loadComponent: () =>
      import('./features/policies/policies').then((m) => m.PoliciesComponent),
  },
  {
    path: 'security',
    title: 'Meridian · Security Architecture',
    loadComponent: () =>
      import('./features/security-page/security-page').then((m) => m.SecurityPageComponent),
  },
  {
    path: 'guardrails',
    title: 'Meridian · AI Guardrails',
    loadComponent: () =>
      import('./features/guardrails/guardrails').then((m) => m.GuardrailsComponent),
  },
  {
    path: 'architecture',
    title: 'Meridian · Angular Architecture',
    loadComponent: () =>
      import('./features/architecture/architecture').then((m) => m.ArchitectureComponent),
  },
  { path: '**', redirectTo: '' },
];
