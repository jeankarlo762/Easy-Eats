import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface AcaoRapida {
  label: string;
  descricao: string;
  icon: string;
  cor: string;
  rota: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly acoes: AcaoRapida[] = [
    {
      label: 'Novo Pedido',
      descricao: 'Monte um pedido para o cliente',
      icon: 'bi-plus-circle',
      cor: 'laranja',
      rota: '/novo-pedido',
    },
    {
      label: 'Fila da Cozinha',
      descricao: 'Acompanhe o preparo dos pedidos',
      icon: 'bi-egg-fried',
      cor: 'verde',
      rota: '/fila',
    },
    {
      label: 'Financeiro',
      descricao: 'Vendas, despesas e resultado',
      icon: 'bi-cash-coin',
      cor: 'roxo',
      rota: '/financeiro',
    },
    {
      label: 'Estoque',
      descricao: 'Estoque de insumos e movimentações',
      icon: 'bi-box-seam',
      cor: 'azul',
      rota: '/produtos/estoque',
    },
  ];

  constructor(private router: Router) {}

  acessarRota(rota: string) {
    this.router.navigate([rota]);
  }
}
