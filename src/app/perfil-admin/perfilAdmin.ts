import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-perfil-admin',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './perfilAdmin.html',
  styleUrl: './perfilAdmin.scss',
})
export class PerfilAdmin {
  currentYear: any;
  private router = inject(Router);

  protected acessarRota(rota: string) {
    this.router.navigate([rota]);
  }
}
