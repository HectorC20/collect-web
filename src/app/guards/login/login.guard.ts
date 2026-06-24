import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DASHBOARD_ROUTE } from '../../shared/constants';
import { AuthService } from '../../services/auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }
  // Si ya está logueado, redirigir a la página principal (dashboard por ejemplo)
  return router.createUrlTree([DASHBOARD_ROUTE]);
};
