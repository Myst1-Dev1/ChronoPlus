import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Não intercepta chamadas de autenticação inicial para evitar loop de refresh
  if (
    req.url.includes('/auth/sign-in') ||
    req.url.includes('/auth/sign-up') ||
    req.url.includes('/auth/refresh-token')
  ) {
    return next(req);
  }

  const token = authService.getToken();
  const authReq = token && !req.headers.has('Authorization')
    ? req.clone({
        headers: req.headers.set('Authorization', 'Bearer ' + token)
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return authService.handle401Error(req, next);
      }
      return throwError(() => error);
    })
  );
};
