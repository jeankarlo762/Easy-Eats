import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const isLogin = (url: string) => url.includes('/auth/login');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isLogin(req.url)) {
    return next(req);
  }

  const token = authService.getToken();
  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && sessaoInvalida(erro, authService)) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { sessao: 'expirada' } });
      }
      return throwError(() => erro);
    }),
  );
};

/**
 * O backend responde 403 tanto para token ausente/expirado quanto para
 * erros internos (o Spring redireciona exceções não tratadas para /error,
 * que exige autenticação). Por isso só encerramos a sessão quando o token
 * realmente não é mais válido — um 403 com token válido é tratado como erro
 * comum da requisição, sem derrubar o usuário.
 */
function sessaoInvalida(erro: HttpErrorResponse, authService: AuthService): boolean {
  if (erro.status === 401) return true;
  if (erro.status === 403) return authService.tokenExpirado();
  return false;
}
