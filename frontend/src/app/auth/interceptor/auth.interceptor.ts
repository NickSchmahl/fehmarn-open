import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';

const LOGIN_URL = '/api/auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Avoid redirect loop: don't intercept 401 from the login endpoint itself
      if (error.status === 401 && !req.url.includes(LOGIN_URL)) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
