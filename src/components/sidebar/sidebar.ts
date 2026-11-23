import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, PERFIS_GESTAO, Perfil } from '../../app/auth/auth.service';

interface ItemMenu {
  label: string;
  icon: string;
  rota: string | null;
  cor: string;
  perfis?: Perfil[];
  filhos?: ItemMenu[];
}

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

  abertos = new Set<string>(['Home', 'Pedidos', 'Cozinha']);

  constructor(protected authService: AuthService) {}

  private readonly todosItens: ItemMenu[] = [
    {
      label: 'Home',
      icon: 'bi-house',
      rota: null,
      cor: '#2563eb',
      filhos: [
        { label: 'Início', icon: 'bi-house-door', rota: '/home', cor: '#2563eb' },
        { label: 'Dashboard', icon: 'bi-speedometer2', rota: '/dashboard', cor: '#2563eb', perfis: PERFIS_GESTAO },
      ],
    },
    {
      label: 'Pedidos',
      icon: 'bi-cart3',
      rota: null,
      cor: '#ea580c',
      filhos: [
        { label: 'Novo Pedido', icon: 'bi-plus-circle', rota: '/novo-pedido', cor: '#ea580c' },
        { label: 'Mesas', icon: 'bi-grid-3x3-gap', rota: '/mesas', cor: '#ea580c' },
        { label: 'Histórico de Pedidos', icon: 'bi-clock-history', rota: '/historico-vendas', cor: '#ea580c' },
        { label: 'Relatório de Pedidos', icon: 'bi-bar-chart-line', rota: '/relatorio-pedidos', cor: '#ea580c', perfis: PERFIS_GESTAO },
      ],
    },
    {
      label: 'Cozinha',
      icon: 'bi-egg-fried',
      rota: null,
      cor: '#d97706',
      filhos: [
        { label: 'Fila da Cozinha', icon: 'bi-list-task', rota: '/fila', cor: '#d97706' },
        { label: 'Tela Cozinha', icon: 'bi-display', rota: '/tela-cozinha', cor: '#d97706' },
        { label: 'Relatório da Cozinha', icon: 'bi-bar-chart-line', rota: '/relatorio-cozinha', cor: '#d97706', perfis: PERFIS_GESTAO },
      ],
    },
    {
      label: 'Estoque',
      icon: 'bi-box-seam',
      rota: null,
      cor: '#16a34a',
      perfis: PERFIS_GESTAO,
      filhos: [
        { label: 'Ingredientes e Estoque', icon: 'bi-boxes', rota: '/controle-estoque', cor: '#16a34a' },
        { label: 'Relatório de Estoque', icon: 'bi-bar-chart-line', rota: '/relatorio-estoque', cor: '#16a34a' },
      ],
    },
    {
      label: 'Produtos',
      icon: 'bi-basket3',
      rota: null,
      cor: '#4f46e5',
      perfis: PERFIS_GESTAO,
      filhos: [
        { label: 'Catálogo', icon: 'bi-grid', rota: '/cadastro-produto', cor: '#4f46e5' },
        { label: 'Categorias', icon: 'bi-tags', rota: '/categorias', cor: '#4f46e5' },
        { label: 'Ficha Técnica', icon: 'bi-clipboard2-data', rota: '/ficha-tecnica', cor: '#4f46e5' },
      ],
    },
    {
      label: 'Financeiro',
      icon: 'bi-cash-coin',
      rota: null,
      cor: '#db2777',
      filhos: [
        { label: 'Visão Geral', icon: 'bi-graph-up', rota: '/financeiro', cor: '#db2777', perfis: PERFIS_GESTAO },
        { label: 'Caixa', icon: 'bi-wallet2', rota: '/caixa', cor: '#db2777' },
        { label: 'Histórico de Caixas', icon: 'bi-clock-history', rota: '/caixa-historico', cor: '#db2777', perfis: PERFIS_GESTAO },
        { label: 'Lançamentos', icon: 'bi-list-ul', rota: '/gestao-financeira', cor: '#db2777', perfis: PERFIS_GESTAO },
      ],
    },
    {
      label: 'Usuários',
      icon: 'bi-person-badge',
      rota: '/usuarios',
      cor: '#dc2626',
      perfis: ['ADMINISTRADOR'],
    },
  ];

  /** Itens visíveis para o perfil logado (grupos sem filhos visíveis somem). */
  get itens(): ItemMenu[] {
    return this.todosItens
      .filter((item) => this.permitido(item))
      .map((item) =>
        item.filhos ? { ...item, filhos: item.filhos.filter((filho) => this.permitido(filho)) } : item,
      )
      .filter((item) => !item.filhos || item.filhos.length > 0);
  }

  private permitido(item: ItemMenu): boolean {
    return !item.perfis || this.authService.temPerfil(item.perfis);
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
