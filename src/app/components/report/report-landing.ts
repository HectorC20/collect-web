import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { hasAnyPermission } from '../../guards/permissions/role.model';

@Component({
  selector: 'app-report-landing',
  standalone: true,
  template: '',
})
export class ReportLandingComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    const roleName = this.authService.getUser()?.role?.name ?? null;
    const target = this.resolveTargetRoute(roleName);

    void this.router.navigateByUrl(target, { replaceUrl: true });
  }

  private resolveTargetRoute(roleName: string | null): string {
    if (hasAnyPermission(roleName, ['manage_general_imports'])) {
      return '/reports/general';
    }

    if (hasAnyPermission(roleName, ['view_general_portfolio'])) {
      return '/reports/portfolio';
    }

    if (hasAnyPermission(roleName, ['view_collector_portfolio'])) {
      return '/reports/activity';
    }

    return '/dashboard';
  }
}
