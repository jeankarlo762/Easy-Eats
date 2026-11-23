import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type StatusFatura = 'Pago' | 'Pendente' | 'Atrasado';
type FiltroFatura = 'Todos' | 'Pagos' | 'Pendentes' | 'Atrasados';

interface Fatura {
  id: number;
  empresa: string;
  plano: string;
  valor: number;
  vencimento: string;
  status: StatusFatura;
}

@Component({
  selector: 'app-superadmin-pagamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-pagamentos.html',
  styleUrl: './superadmin-pagamentos.scss',
})
export class SuperadminPagamentos {
  filtroAtivo: FiltroFatura = 'Todos';

  readonly filtros: FiltroFatura[] = ['Todos', 'Pagos', 'Pendentes', 'Atrasados'];

  faturas: Fatura[] = [
    { id: 1, empresa: 'Rede Pizzaria Napoli', plano: 'Enterprise', valor: 899.0, vencimento: '05/07/2026', status: 'Pago' },
    { id: 2, empresa: 'Burger House Express', plano: 'Pro', valor: 349.0, vencimento: '10/07/2026', status: 'Pago' },
    { id: 3, empresa: 'Tacos & Cia Delivery', plano: 'Pro', valor: 349.0, vencimento: '15/07/2026', status: 'Pago' },
    { id: 4, empresa: 'Food Truck Sabor & Cia', plano: 'Básico', valor: 149.0, vencimento: '20/07/2026', status: 'Pendente' },
    { id: 5, empresa: 'Trailer do Zé', plano: 'Básico', valor: 149.0, vencimento: '22/07/2026', status: 'Pendente' },
    { id: 6, empresa: 'Doce Ponto Confeitaria', plano: 'Pro', valor: 349.0, vencimento: '30/06/2026', status: 'Atrasado' },
    { id: 7, empresa: 'Espetinho do Bairro', plano: 'Básico', valor: 149.0, vencimento: '25/06/2026', status: 'Atrasado' },
    { id: 8, empresa: 'Sorveteria Polar', plano: 'Enterprise', valor: 899.0, vencimento: '01/07/2026', status: 'Pago' },
  ];

  get receitaDoMes(): number {
    return this.faturas.filter((f) => f.status === 'Pago').reduce((soma, f) => soma + f.valor, 0);
  }

  get pagamentosPendentes(): number {
    return this.faturas.filter((f) => f.status === 'Pendente').length;
  }

  get taxaInadimplencia(): number {
    const atrasados = this.faturas.filter((f) => f.status === 'Atrasado').length;
    return Math.round((atrasados / this.faturas.length) * 1000) / 10;
  }

  get faturasFiltradas(): Fatura[] {
    switch (this.filtroAtivo) {
      case 'Pagos':
        return this.faturas.filter((f) => f.status === 'Pago');
      case 'Pendentes':
        return this.faturas.filter((f) => f.status === 'Pendente');
      case 'Atrasados':
        return this.faturas.filter((f) => f.status === 'Atrasado');
      default:
        return this.faturas;
    }
  }

  selecionarFiltro(filtro: FiltroFatura) {
    this.filtroAtivo = filtro;
  }

  statusBadgeClasse(status: StatusFatura): string {
    switch (status) {
      case 'Pago':
        return 'sucesso';
      case 'Pendente':
        return 'alerta';
      case 'Atrasado':
        return 'erro';
    }
  }
}
