import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith('/api/');
  const withToken = (r: typeof req) => (auth.token() ? r.clone({ setHeaders: { Authorization: `Bearer ${auth.token()}` } }) : r);

  return next(isApi ? withToken(req) : req).pipe(
    catchError((err) => {
      // Expired access token: refresh once, then replay the request.
      if (err.status === 401 && isApi && !req.url.startsWith('/api/auth/') && auth.hasSession()) {
        return from(auth.refresh()).pipe(
          switchMap((ok) => (ok ? next(withToken(req)) : throwError(() => err))),
        );
      }
      return throwError(() => err);
    }),
  );
};
