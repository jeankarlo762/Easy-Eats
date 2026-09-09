import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { DashboardResumo, DashboardService, PontoVendaDia } from './dashboard.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

interface StatCard {
  icon: string;
  cor: string;
  valor: string;
  label: string;
  variacao: number | null;
}

interface StatusOperacional {
  icon: string;
  cor: string;
  valor: number;
  label: string;
}

const CORES_FORMA_PAGAMENTO: Record<string, string> = {
  PIX: '#22c55e',
  Cartão: '#f97316',
  Dinheiro: '#3b82f6',
  Vale: '#f59e0b',
};

const CORES_FALLBACK = ['#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  carregando = true;
  erro: string | null = null;
  resumo: DashboardResumo | null = null;

  ngOnInit() {
    this.carregando = true;

    this.dashboardService.resumo().subscribe({
      next: (resumo) => {
        this.resumo = resumo;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o dashboard.');
        this.carregando = false;
      },
    });
  }

  get statsPrincipais(): StatCard[] {
    if (!this.resumo) return [];
    const r = this.resumo;
    return [
      { icon: 'bi-cash-stack', cor: 'verde', valor: this.formatarMoeda(r.vendasHoje), label: 'Vendas do Dia', variacao: r.variacaoVendas },
      { icon: 'bi-cart-check', cor: 'azul', valor: String(r.pedidosHoje), label: 'Pedidos Realizados', variacao: r.variacaoPedidos },
      { icon: 'bi-graph-up-arrow', cor: 'roxo', valor: this.formatarMoeda(r.ticketMedioHoje), label: 'Ticket Médio', variacao: r.variacaoTicketMedio },
      { icon: 'bi-fire', cor: 'laranja', valor: this.formatarMoeda(r.lucroHoje), label: 'Lucro do Dia', variacao: r.variacaoLucro },
    ];
  }

  get statsOperacionais(): StatusOperacional[] {
    if (!this.resumo) return [];
    const r = this.resumo;
    return [
      { icon: 'bi-egg-fried', cor: 'laranja', valor: r.emPreparo, label: 'Em Preparo' },
      { icon: 'bi-check-circle', cor: 'verde', valor: r.prontos, label: 'Prontos' },
      { icon: 'bi-box-seam', cor: 'azul', valor: r.entreguesHoje, label: 'Entregues' },
      { icon: 'bi-exclamation-triangle', cor: 'vermelho', valor: r.estoqueCritico, label: 'Estoque Crítico' },
    ];
  }

  get vendasSemana(): PontoVendaDia[] {
    return this.resumo?.vendasSemana ?? [];
  }

  get formasPagamento(): { nome: string; cor: string; valor: number }[] {
    if (!this.resumo) return [];
    return this.resumo.formasPagamento.map((forma, i) => ({
      nome: forma.metodo,
      valor: forma.valor,
      cor: CORES_FORMA_PAGAMENTO[forma.metodo] ?? CORES_FALLBACK[i % CORES_FALLBACK.length],
    }));
  }

  get produtosMaisVendidos(): { nome: string; quantidade: number }[] {
    return (this.resumo?.produtosMaisVendidos ?? []).map((p) => ({
      nome: p.nomeProduto,
      quantidade: p.quantidadeVendida,
    }));
  }

  get horarioMovimento() {
    return this.resumo?.horarioMovimento ?? [];
  }

  get totalFormasPagamento(): number {
    return this.formasPagamento.reduce((soma, f) => soma + f.valor, 0) || 1;
  }

  get maiorValorSemana(): number {
    const valores = this.vendasSemana.map((p) => p.valor);
    return valores.length ? Math.max(...valores, 1) : 1;
  }

  get maiorPedidosHorario(): number {
    const valores = this.horarioMovimento.map((p) => p.pedidos);
    return valores.length ? Math.max(...valores, 1) : 1;
  }

  /** Gera o "d" de um path SVG de área suavizada para o gráfico semanal. */
  get areaPath(): string {
    const largura = 700;
    const altura = 180;
    const pontos_ = this.vendasSemana;
    if (pontos_.length < 2) return '';
    const passo = largura / (pontos_.length - 1);
    const max = this.maiorValorSemana * 1.15;

    const pontos = pontos_.map((p, i) => ({
      x: i * passo,
      y: altura - (p.valor / max) * altura,
    }));

    let d = `M ${pontos[0].x} ${pontos[0].y}`;
    for (let i = 0; i < pontos.length - 1; i++) {
      const atual = pontos[i];
      const proximo = pontos[i + 1];
      const meioX = (atual.x + proximo.x) / 2;
      d += ` C ${meioX} ${atual.y}, ${meioX} ${proximo.y}, ${proximo.x} ${proximo.y}`;
    }

    return d;
  }

  get areaFillPath(): string {
    return this.areaPath ? `${this.areaPath} L 700 180 L 0 180 Z` : '';
  }

  pontoX(i: number): number {
    const total = this.vendasSemana.length;
    return total > 1 ? i * (700 / (total - 1)) : 0;
  }

  pontoY(valor: number): number {
    const max = this.maiorValorSemana * 1.15;
    return 180 - (valor / max) * 180;
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
