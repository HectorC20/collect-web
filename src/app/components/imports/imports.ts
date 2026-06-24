import { Component, inject } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../services/auth.service';
import { AppPermission, hasAnyPermission } from '../../guards/permissions/role.model';

interface ImportSection {
  title: string;
  description: string;
  route: string;
  badge: string;
  permissions: AppPermission[];
}

@Component({
  selector: 'app-imports',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './imports.html',
  styleUrl: './imports.scss',
})
export class ImportsComponent {
  private readonly authService = inject(AuthService);

  private readonly sections: ImportSection[] = [
    {
      title: 'Data General',
      description: 'Importa archivos base de clientes, contratos y cuotas. La exportacion con plantilla se hace desde Reportes.',
      route: '/imports/data',
      badge: 'General',
      permissions: ['manage_general_imports'],
    },
    {
      title: 'Cartera',
      description: 'Importa cartera de seguimiento y exporta reportes operativos con tramos y acciones.',
      route: '/imports/portfolio',
      badge: 'Cartera',
      permissions: ['manage_portfolio_imports'],
    },
  ];

  get visibleSections(): ImportSection[] {
    const roleName = this.authService.getUser()?.role?.name ?? null;

    return this.sections.filter((section) => hasAnyPermission(roleName, section.permissions));
  }
}
