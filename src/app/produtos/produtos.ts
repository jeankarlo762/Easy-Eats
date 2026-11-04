import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, Funcionalidade } from '../auth/auth.service';

export interface AbaProduto {
  label: string;
  icon: string;
  rota: string;
  funcionalidades: Funcionalidade[];
}

/**
 * Abas do módulo Produto. O antigo módulo Estoque foi incorporado aqui:
 * "Estoque" e "Relatório" também liberam quem só tem a funcionalidade
 * ESTOQUE no segmento, para ninguém perder acesso com a unificação.
 */
export const ABAS_PRODUTO: AbaProduto[] = [
  { label: 'Cadastros', icon: 'bi-grid', rota: 'cadastros', funcionalidades: ['PRODUTOS'] },
  { label: 'Ficha Técnica', icon: 'bi-clipboard2-data', rota: 'ficha-tecnica', funcionalidades: ['PRODUTOS'] },
  { label: 'Estoque', icon: 'bi-boxes', rota: 'estoque', funcionalidades: ['PRODUTOS', 'ESTOQUE'] },
  { label: 'Cardápio', icon: 'bi-phone', rota: 'cardapio', funcionalidades: ['PRODUTOS'] },
  { label: 'Relatório', icon: 'bi-bar-chart-line', rota: 'relatorio', funcionalidades: ['PRODUTOS', 'ESTOQUE'] },
];

/** Primeira aba que o usuário pode abrir, usada no redirect de /produtos. */
export function primeiraAbaPermitida(temFuncionalidade: (f: Funcionalidade) => boolean): string {
  const aba = ABAS_PRODUTO.find((a) => a.funcionalidades.some((f) => temFuncionalidade(f)));
  return aba ? aba.rota : 'cadastros';
}

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './produtos.html',
  styleUrl: './produtos.scss',
})
export class ProdutosModulo {
  private authService = inject(AuthService);
  private router = inject(Router);

  private url = signal(this.router.url);

  abas = ABAS_PRODUTO.filter((aba) => aba.funcionalidades.some((f) => this.authService.temFuncionalidade(f)));

  noCadastros = computed(() => this.url().startsWith('/produtos/cadastros'));

  constructor() {
    this.router.events
      .pipe(filter((evento) => evento instanceof NavigationEnd))
      .subscribe((evento) => this.url.set((evento as NavigationEnd).urlAfterRedirects));
  }
}
