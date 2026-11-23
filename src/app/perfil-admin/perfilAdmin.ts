import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, PERFIL_LABEL } from '../auth/auth.service';

/**
 * Perfil do usuário logado. O backend não expõe endpoint para editar dados
 * ou trocar a senha, então a tela é somente leitura (dados vêm do token JWT).
 */
@Component({
  selector: 'app-perfil-admin',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './perfilAdmin.html',
  styleUrl: './perfilAdmin.scss',
})
export class PerfilAdmin {
  private router = inject(Router);
  private authService = inject(AuthService);

  usuario = this.authService.usuario;
  perfil = computed(() => {
    const role = this.usuario()?.role;
    return role ? PERFIL_LABEL[role] : '';
  });
  roles = computed(() => (this.usuario()?.roles ?? []).map((r) => r.replace(/^ROLE_/, '')).join(', '));
  iniciais = computed(() =>
    (this.usuario()?.nome ?? '')
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join(''),
  );

  sair() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
