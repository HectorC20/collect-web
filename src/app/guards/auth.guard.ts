import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AUTH_ROUTE } from '../shared/constants';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([AUTH_ROUTE]);
};
