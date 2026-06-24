import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ReportStateService } from './report-state.service';
import { AuthService } from '../../services/auth.service';
import { AppPermission, hasAnyPermission } from '../../guards/permissions/role.model';

interface ReportTab {
  label: string;
  route: string;
  permissions: AppPermission[];
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './report.html',
  styleUrl: './report.scss',
  providers: [ReportStateService],
})
export class ReportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly reportState = inject(ReportStateService);

  private readonly reportTabs: ReportTab[] = [
    {
      label: 'Datos General',
      route: '/reports/general',
      permissions: ['manage_general_imports'],
    },
    {
      label: 'Carteras',
      route: '/reports/portfolio',
      permissions: ['view_general_portfolio'],
    },
    {
      label: 'Actividad Reciente',
      route: '/reports/activity',
      permissions: ['view_collector_portfolio'],
    },
  ];

  readonly filtersForm = this.fb.group({
    search: [''],
    name: [''],
    dni: [''],
    block: [''],
    lot: [''],
    clientStatus: [''],
    lotStatus: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  constructor() {
    this.ensureAccessibleReportRoute();
    this.reportState.setPermissions(this.visibleTabs.map((tab) => tab.route));
    this.reportState.loadPreviews();
  }

  get visibleTabs(): ReportTab[] {
    const roleName = this.authService.getUser()?.role?.name ?? null;

    return this.reportTabs.filter((tab) => hasAnyPermission(roleName, tab.permissions));
  }

  applyFilters(): void {
    this.reportState.applyFilters(this.filtersForm.getRawValue());
  }

  resetFilters(): void {
    this.filtersForm.reset({
      search: '',
      name: '',
      dni: '',
      block: '',
      lot: '',
      clientStatus: '',
      lotStatus: '',
      dateFrom: '',
      dateTo: '',
    });

    this.reportState.resetFilters();
  }

  private ensureAccessibleReportRoute(): void {
    const currentUrl = this.router.url;
    const hasCurrentAccess = this.visibleTabs.some((tab) => currentUrl.startsWith(tab.route));

    if (hasCurrentAccess || currentUrl !== '/reports') {
      return;
    }

    const fallbackRoute = this.visibleTabs[0]?.route ?? '/dashboard';
    void this.router.navigateByUrl(fallbackRoute, { replaceUrl: true });
  }
}
