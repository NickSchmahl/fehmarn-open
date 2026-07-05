import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErrorNotificationService } from '../services/error-notification.service';

const HANDLED_STATUSES = new Set([0, 500, 503]);

export const globalHttpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorNotification = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (HANDLED_STATUSES.has(error.status)) {
        errorNotification.handle(error);
      }
      return throwError(() => error);
    }),
  );
};
