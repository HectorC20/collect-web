import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_ROUTE, DASHBOARD_ROUTE } from '../../shared/constants';
import { AuthService } from '../../services/auth.service';
import { AppPermission, hasAnyPermission } from './role.model';

export const permissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return router.createUrlTree([AUTH_ROUTE]);
  }

  const requiredPermissions = (route.data?.['permissions'] as readonly AppPermission[] | undefined) ?? [];
  const userRoleName = authService.getUser()?.role?.name ?? null;
  if (hasAnyPermission(userRoleName, requiredPermissions)) {
    return true;
  }

  return router.createUrlTree([DASHBOARD_ROUTE]);
};
