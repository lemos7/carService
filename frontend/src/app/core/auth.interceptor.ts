import { HttpInterceptorFn } from '@angular/common/http';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  return next(
    req.url.startsWith('/api/') && mutating
      ? req.clone({ setHeaders: { 'X-CarCare-Request': '1' } })
      : req,
  );
};
