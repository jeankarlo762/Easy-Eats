import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Rotas do link público (cardápio do cliente final, checkout) não usam
// sessão de funcionário — não faz sentido anexar um token (possivelmente
// inválido/expirado) nem redirecionar para /login em caso de erro, já que
// quem está ali é o cliente, não um usuário do sistema.
const isRotaPublica = (url: string) => url.includes('/public/');

// O próprio POST /auth/login responde 401 em credenciais erradas. Redirecionar
// para /login a partir dali (já estando lá) só atrapalhava a tela de login, que
// trata esse erro exibindo a mensagem.
const ehRequisicaoDeLogin = (url: string) => url.includes('/auth/login');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isRotaPublica(req.url)) {
    return next(req);
  }

  const token = authService.getToken();

  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro) => {
      // Só 401 (não autenticado: sem token, token inválido ou expirado) encerra
      // a sessão. 403 significa "autenticado, mas sem permissão para ESTE
      // recurso" — deslogar nesse caso expulsava o usuário do sistema ao clicar
      // numa ação que o perfil dele não pode executar. O erro segue adiante
      // para a tela exibir a mensagem que o backend enviou.
      if (erro.status === 401 && !ehRequisicaoDeLogin(req.url)) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    }),
  );
};
