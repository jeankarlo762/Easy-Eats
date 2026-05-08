import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Navbar } from '../../components/navbar';
import { FormsModule } from '@angular/forms';
import { email } from '@angular/forms/signals';

@Component({
  selector: 'app-perfil-admin',
  imports: [RouterLink, RouterLinkActive, Navbar, FormsModule],
  templateUrl: './perfilAdmin.html',
  styleUrl: './perfilAdmin.scss',
})
export class PerfilAdmin {
  currentYear: any;
  private router = inject(Router);

  usuario = {
    nome: 'João Silva',
    email: 'JoãoSilva@gmail.com',
    telefone: '(00) 00000-0000',
    cpf: '000.000.000-00',
  }

  modoEdicao = false;

  toggleEdicao() {
    this.modoEdicao = !this.modoEdicao;
  
  }

  salvarAlteracoes() {
    this.modoEdicao = false;
    console.log('Alterações salvas:', this.usuario);
  }

  protected acessarRota(rota: string) {
    this.router.navigate([rota]);
  }
 



}
