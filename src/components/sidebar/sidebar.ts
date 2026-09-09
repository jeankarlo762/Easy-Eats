import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Perfil } from '../../app/auth/auth.service';
import { ItemMenu, ITENS_COZINHEIRO, ITENS_GARCOM, ITENS_SUPERADMIN, TODOS_ITENS } from './menu-itens';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  @Input() colapsado = false;
  @Input() abertoMobile = false;
  @Output() alternar = new EventEmitter<void>();

  abertos = new Set<string>(['Home']);

  constructor(protected authService: AuthService) {}

  get itens(): ItemMenu[] {
    const perfilAtual = this.authService.usuario()?.role;

    if (perfilAtual === 'SUPERADMIN') {
      return ITENS_SUPERADMIN;
    }

    if (perfilAtual === 'GARCOM') {
      return this.filtrarPorAcesso(ITENS_GARCOM, perfilAtual);
    }

    if (perfilAtual === 'COZINHEIRO') {
      return this.filtrarPorAcesso(ITENS_COZINHEIRO, perfilAtual);
    }

    return this.filtrarPorAcesso(TODOS_ITENS, perfilAtual);
  }

  private filtrarPorAcesso(itens: ItemMenu[], perfilAtual: Perfil | undefined): ItemMenu[] {
    return itens.filter((item) => {
      const perfilOk = !item.perfis || (perfilAtual && item.perfis.includes(perfilAtual));
      const funcionalidadeOk =
        !item.funcionalidades || item.funcionalidades.some((f) => this.authService.temFuncionalidade(f));
      return perfilOk && funcionalidadeOk;
    });
  }

  alternarGrupo(label: string) {
    if (this.abertos.has(label)) {
      this.abertos.delete(label);
    } else {
      this.abertos.add(label);
    }
  }

  grupoAberto(label: string): boolean {
    return this.abertos.has(label);
  }

  primeiroFilho(item: ItemMenu): string | null {
    return item.filhos?.find((f) => f.rota)?.rota ?? null;
  }
}
