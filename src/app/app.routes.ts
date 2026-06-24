import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login/login.guard';
import { permissionGuard } from './guards/permissions/permission.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./components/auth/auth').then(m => m.Auth),
    canActivate: [loginGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['view_dashboard'],
    }
  },
  {
    path: 'actions',
    loadComponent: () => import('./components/actions/actions').then(m => m.Actions),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_actions'],
    }
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./components/portfolio/walletclient/walletclient').then(m => m.Walletclient),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['view_general_portfolio'],
    }
  },
  {
    path: 'collector',
    loadComponent: () => import('./components/portfolio/portfoliocollerctor/portfoliocollerctor').then(m => m.Portfoliocollerctor),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['view_collector_portfolio'],
    }
  },
  {
    path: 'imports',
    loadComponent: () => import('./components/imports/imports').then(m => m.ImportsComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_general_imports', 'manage_portfolio_imports'],
    },
    children: [
      {
        path: '',
        redirectTo: 'portfolio',
        pathMatch: 'full'
      },
      {
        path: 'data',
        loadComponent: () => import('./components/imports/data/data').then(m => m.DataImportsComponent),
        canActivate: [permissionGuard],
        data: {
          permissions: ['manage_general_imports'],
        }
      },
      {
        path: 'portfolio',
        loadComponent: () => import('./components/imports/portfolio/portfolio').then(m => m.PortfolioImportsComponent),
        canActivate: [permissionGuard],
        data: {
          permissions: ['manage_portfolio_imports'],
        }
      }
    ]
  },
  {
    path: 'messaging',
    loadComponent: () => import('./components/whatsappclient/whatsappclient').then(m => m.Whatsappclient),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['view_messaging'],
    }
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/report/report').then(m => m.ReportComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_general_imports', 'view_general_portfolio', 'view_collector_portfolio'],
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./components/report/report-landing').then(m => m.ReportLandingComponent),
      },
      {
        path: 'general',
        loadComponent: () => import('./components/report/general-report/general-report').then(m => m.GeneralReportComponent),
        canActivate: [permissionGuard],
        data: {
          permissions: ['manage_general_imports'],
        }
      },
      {
        path: 'portfolio',
        loadComponent: () => import('./components/report/portfolio-report/portfolio-report').then(m => m.PortfolioReportComponent),
        canActivate: [permissionGuard],
        data: {
          permissions: ['view_general_portfolio'],
        }
      },
      {
        path: 'activity',
        loadComponent: () => import('./components/report/activity-report/activity-report').then(m => m.ActivityReportComponent),
        canActivate: [permissionGuard],
        data: {
          permissions: ['view_collector_portfolio'],
        }
      }
    ]
  },
  {
    path: 'system',
    loadComponent: () => import('./components/system/system').then(m => m.SystemComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_system'],
    },
    children: [
      {
        path: '',
        redirectTo: 'parameters',
        pathMatch: 'full'
      },
      {
        path: 'parameters',
        loadComponent: () => import('./components/system/system-parameters').then(m => m.SystemParametersComponent),
      },
      {
        path: 'whatsapp-sessions',
        loadComponent: () => import('./components/whatsappclient/whatsapp-session-admin/whatsapp-session-admin').then(m => m.WhatsappSessionAdminComponent),
      }
    ]
  },
  {
    path: 'agentllm',
    loadComponent: () => import('./components/agentllm/agentllm').then(m => m.AgentLLMComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_agentllm'],
    }
  },
   {
    // path: 'system/brackets',
    path: 'brackets',
    loadComponent: () => import('./components/bracket/bracket').then(m => m.BracketComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_brackets'],
    }
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/users').then(m => m.UsersComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['manage_users'],
    },
  },
  {
    path: 'client/:id',
    loadComponent: () => import('./components/client-detail/client-detail').then(m => m.ClientDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
