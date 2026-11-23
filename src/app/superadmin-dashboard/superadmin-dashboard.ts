import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NovosClientesMes {
  mes: string;
  quantidade: number;
}

interface ClienteRecente {
  empresa: string;
  plano: 'Básico' | 'Pro' | 'Enterprise';
  dataCadastro: string;
}

interface DistribuicaoPlano {
  plano: string;
  empresas: number;
  percentual: number;
  cor: string;
}

interface AlertaPlataforma {
  icone: string;
  cor: string;
  titulo: string;
  descricao: string;
}

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './superadmin-dashboard.html',
  styleUrl: './superadmin-dashboard.scss',
})
export class SuperadminDashboard {
  readonly totalClientes = 128;
  readonly variacaoClientes = '+9%';
  readonly usuariosTotais = 742;
  readonly variacaoUsuarios = '+14%';
  readonly mrr = 58640.9;
  readonly variacaoMrr = '+6%';
  readonly taxaInadimplencia = 6.2;
  readonly variacaoInadimplencia = '-1.2%';

  readonly novosClientesPorMes: NovosClientesMes[] = [
    { mes: 'Fevereiro', quantidade: 9 },
    { mes: 'Março', quantidade: 12 },
    { mes: 'Abril', quantidade: 15 },
    { mes: 'Maio', quantidade: 11 },
    { mes: 'Junho', quantidade: 18 },
    { mes: 'Julho', quantidade: 21 },
  ];

  readonly ultimosClientes: ClienteRecente[] = [
    { empresa: 'Food Truck Sabor & Cia', plano: 'Pro', dataCadastro: '25/07/2026' },
    { empresa: 'Burger House Ltda', plano: 'Enterprise', dataCadastro: '22/07/2026' },
    { empresa: 'Pizzaria Bella Napoli', plano: 'Básico', dataCadastro: '19/07/2026' },
    { empresa: 'Doceria Doce Sonho', plano: 'Básico', dataCadastro: '15/07/2026' },
    { empresa: 'Rede Sabor Express', plano: 'Enterprise', dataCadastro: '10/07/2026' },
  ];

  readonly distribuicaoPlanos: DistribuicaoPlano[] = [
    { plano: 'Básico', empresas: 76, percentual: 59, cor: '#9ca3af' },
    { plano: 'Pro', empresas: 38, percentual: 30, cor: '#2563eb' },
    { plano: 'Enterprise', empresas: 14, percentual: 11, cor: '#7c3aed' },
  ];

  readonly alertas: AlertaPlataforma[] = [
    {
      icone: 'bi-exclamation-triangle',
      cor: 'vermelho',
      titulo: '3 empresas com pagamento atrasado',
      descricao: 'Verifique a aba Financeiro para cobrar ou suspender o acesso.',
    },
    {
      icone: 'bi-person-plus',
      cor: 'azul',
      titulo: '5 novas empresas aguardando ativação',
      descricao: 'Cadastro concluído, mas ainda sem o primeiro login.',
    },
    {
      icone: 'bi-life-preserver',
      cor: 'laranja',
      titulo: '2 tickets de suporte em aberto',
      descricao: 'Aguardando retorno há mais de 24 horas.',
    },
  ];

  get maiorQuantidadeMes(): number {
    return Math.max(...this.novosClientesPorMes.map((m) => m.quantidade));
  }

  get badgePlano(): Record<ClienteRecente['plano'], string> {
    return { Básico: 'neutro', Pro: 'azul', Enterprise: 'roxo' };
  }
}
