import { Component, inject, PLATFORM_ID, signal, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { UserModel } from '../../../models/user.model';
import { getRoleDictionaryEntry } from '../../dictionary/main';
import { AppPermission, hasAnyPermission } from '../../../guards/permissions/role.model';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  badge?: number;
  children?: SubMenuItem[];
  permissions?: AppPermission[];
}

interface SubMenuItem {
  label: string;
  icon: string;
  route: string;
  permissions?: AppPermission[];
}

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  isCollapsed = false;
  isMobile = false;
  isMobileMenuOpen = false;
  expandedMenus = signal<Set<string>>(new Set());
  currentUser: UserModel | null = null;

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      permissions: ['view_dashboard'],
    },
    {
      label: 'Cartera',
      icon: 'people',
      children: [
        { label: 'General', icon: 'grid_view', route: '/portfolio', permissions: ['view_general_portfolio'] },
        { label: 'Mi cartera', icon: 'assignment_ind', route: '/collector', permissions: ['view_collector_portfolio'] },
      ]
    },
    {
      label: 'Reportes',
      icon: 'article',
      permissions: ['manage_general_imports', 'view_general_portfolio', 'view_collector_portfolio'],
      children: [
        { label: 'Datos General', icon: 'description', route: '/reports/general', permissions: ['manage_general_imports'] },
        { label: 'Carteras', icon: 'group', route: '/reports/portfolio', permissions: ['view_general_portfolio'] },
        { label: 'Actividad', icon: 'history', route: '/reports/activity', permissions: ['view_collector_portfolio'] },
      ]
    },
    {
      label: 'Importaciones',
      icon: 'upload_file',
      permissions: ['manage_general_imports', 'manage_portfolio_imports'],
      children: [
        { label: 'Data', icon: 'table_view', route: '/imports/data', permissions: ['manage_general_imports'] },
        { label: 'Portfolio', icon: 'assignment_ind', route: '/imports/portfolio', permissions: ['manage_portfolio_imports'] },
      ]
    },
    {
      label: 'Mensajería',
      icon: 'chat',
      route: '/messaging',
      // badge: 3,
      permissions: ['view_messaging'],
    },
    {
      label: 'Sistema',
      icon: 'settings',
      permissions: ['manage_system', 'manage_agentllm', 'manage_brackets', 'manage_actions', 'manage_users'],
      children: [
        { label: 'Parámetros', icon: 'tune', route: '/system', permissions: ['manage_system'] },
        { label: 'Sesiones WS', icon: 'qr_code_2', route: '/system/whatsapp-sessions', permissions: ['manage_system'] },
        { label: 'AgentLLM', icon: 'smart_toy', route: '/agentllm', permissions: ['manage_agentllm'] },
        { label: 'Tramos', icon: 'payments', route: '/brackets', permissions: ['manage_brackets'] },
        { label: 'Acciones', icon: 'task_alt', route: '/actions', permissions: ['manage_actions'] },
        { label: 'Usuarios', icon: 'manage_accounts', route: '/users', permissions: ['manage_users'] },
      ]
    },
  ];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('sidebarCollapsed');
      this.isCollapsed = saved === 'true';
      this.checkScreenSize();
    }

    this.currentUser = this.authService.getUser();
  }

  @HostListener('window:resize')
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
    }
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    if (this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  }

  get userDisplayName(): string {
    return this.currentUser?.full_name?.trim() || 'Usuario';
  }

  get userRoleName(): string {
    return getRoleDictionaryEntry(this.currentUser?.role?.name).label;
  }

  get visibleMenuItems(): MenuItem[] {
    return this.menuItems
      .map((item) => {
        if (item.children) {
          const children = item.children
            .filter((child) => this.hasAccess(child.permissions))
            .map((child) =>
              child.route === '/collector'
                ? {
                    ...child,
                    label: this.collectorMenuLabel,
                  }
                : child
            );

          if (children.length === 0) {
            return null;
          }

          if (!this.hasAccess(item.permissions) && item.permissions && item.permissions.length > 0) {
            return null;
          }

          return {
            ...item,
            children,
          };
        }

        return this.hasAccess(item.permissions) ? item : null;
      })
      .filter((item): item is MenuItem => item !== null);
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('sidebarCollapsed', String(this.isCollapsed));
    }
  }

  toggleMenu(label: string): void {
    const current = this.expandedMenus();
    if (current.has(label)) {
      this.expandedMenus.set(new Set()); // Si ya está abierto, lo cierra
    } else {
      this.expandedMenus.set(new Set([label])); // Si está cerrado, cierra los demás y abre solo este
    }
  }

  isExpanded(label: string): boolean {
    return this.expandedMenus().has(label);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }

  private hasAccess(permissions?: readonly AppPermission[]): boolean {
    return hasAnyPermission(this.currentUser?.role?.name, permissions);
  }

  private get collectorMenuLabel(): string {
    const roleName = this.currentUser?.role?.name?.trim().toLowerCase() ?? '';
    return roleName === 'admin' ? 'Gestionar carteras' : 'Mi cartera';
  }
}
