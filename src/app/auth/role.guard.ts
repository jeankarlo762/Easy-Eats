import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Perfil } from './auth.service';

/** Libera a rota apenas para os perfis informados; os demais voltam para a Home. */
export function perfilGuard(perfis: Perfil[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    return authService.temPerfil(perfis) ? true : router.createUrlTree(['/home']);
  };
}
