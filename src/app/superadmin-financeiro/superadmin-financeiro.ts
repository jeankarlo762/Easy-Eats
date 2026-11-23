import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ReceitaMensal {
  mes: string;
  valor: number;
}

interface ReceitaPlano {
  plano: string;
  valor: number;
  empresas: number;
}

interface CobrancaEmpresa {
  empresa: string;
  plano: string;
  valorMensal: number;
  proximaCobranca: string;
  status: 'Em dia' | 'Atrasada';
}

@Component({
  selector: 'app-superadmin-financeiro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './superadmin-financeiro.html',
  styleUrl: './superadmin-financeiro.scss',
})
export class SuperadminFinanceiro {
  readonly mrr = 18420.0;
  readonly churnRate = 3.2;
  readonly ticketMedio = 397.4;
  readonly empresasAtivas = 46;

  readonly receitaMensal: ReceitaMensal[] = [
    { mes: 'Fevereiro', valor: 14200.0 },
    { mes: 'Março', valor: 15100.0 },
    { mes: 'Abril', valor: 16050.0 },
    { mes: 'Maio', valor: 16800.0 },
    { mes: 'Junho', valor: 17650.0 },
    { mes: 'Julho', valor: 18420.0 },
  ];

  readonly receitaPorPlano: ReceitaPlano[] = [
    { plano: 'Básico', valor: 4470.0, empresas: 30 },
    { plano: 'Pro', valor: 6980.0, empresas: 20 },
    { plano: 'Enterprise', valor: 6970.0, empresas: 8 },
  ];

  readonly cobrancasPorEmpresa: CobrancaEmpresa[] = [
    { empresa: 'Food Truck Sabor & Cia', plano: 'Pro', valorMensal: 349.0, proximaCobranca: '05/08/2026', status: 'Em dia' },
    { empresa: 'Burger House Ltda', plano: 'Enterprise', valorMensal: 871.25, proximaCobranca: '08/08/2026', status: 'Em dia' },
    { empresa: 'Pizzaria Bella Napoli', plano: 'Básico', valorMensal: 149.0, proximaCobranca: '02/08/2026', status: 'Atrasada' },
    { empresa: 'Doceria Doce Sonho', plano: 'Básico', valorMensal: 149.0, proximaCobranca: '12/08/2026', status: 'Em dia' },
    { empresa: 'Rede Sabor Express', plano: 'Enterprise', valorMensal: 871.25, proximaCobranca: '15/08/2026', status: 'Em dia' },
  ];

  get maiorReceitaMensal(): number {
    return Math.max(...this.receitaMensal.map((r) => r.valor));
  }

  badgeStatusCobranca(status: CobrancaEmpresa['status']): string {
    return status === 'Em dia' ? 'sucesso' : 'erro';
  }

  /** Monta um CSV a partir dos dados desta tela e dispara o download no navegador. */
  exportarRelatorio(): void {
    const linhas: string[] = [];

    linhas.push('Relatório Financeiro da Plataforma Easy Eats');
    linhas.push(`Gerado em;${new Date().toLocaleDateString('pt-BR')}`);
    linhas.push('');

    linhas.push('Indicadores Gerais');
    linhas.push('Indicador;Valor');
    linhas.push(`MRR (Receita Recorrente Mensal);R$ ${this.mrr.toFixed(2)}`);
    linhas.push(`Churn Rate;${this.churnRate}%`);
    linhas.push(`Ticket Médio por Empresa;R$ ${this.ticketMedio.toFixed(2)}`);
    linhas.push(`Empresas Ativas;${this.empresasAtivas}`);
    linhas.push('');

    linhas.push('Receita Mensal (MRR)');
    linhas.push('Mês;Valor (R$)');
    this.receitaMensal.forEach((r) => linhas.push(`${r.mes};${r.valor.toFixed(2)}`));
    linhas.push('');

    linhas.push('Receita por Plano');
    linhas.push('Plano;Valor (R$);Empresas');
    this.receitaPorPlano.forEach((r) => linhas.push(`${r.plano};${r.valor.toFixed(2)};${r.empresas}`));
    linhas.push('');

    linhas.push('Cobranças por Empresa');
    linhas.push('Empresa;Plano;Valor Mensal (R$);Próxima Cobrança;Status');
    this.cobrancasPorEmpresa.forEach((c) =>
      linhas.push(`${c.empresa};${c.plano};${c.valorMensal.toFixed(2)};${c.proximaCobranca};${c.status}`),
    );

    const conteudoCsv = linhas.join('\n');
    const blob = new Blob(['﻿' + conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeiro-easyeats-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }
}
