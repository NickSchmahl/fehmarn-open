import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

/**
 * Schützt die Admin-Seiten. Ohne Login geht es auf `/admin/login`; die ursprünglich
 * aufgerufene URL wandert als `returnUrl` mit, damit der Login dorthin zurückführt.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.eingeloggt()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};
