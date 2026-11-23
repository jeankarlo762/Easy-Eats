import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Estoque, EstoqueService } from '../controle-estoque/estoque.service';
import {
  STATUS_PEDIDO_LABEL,
  StatusPedido,
  TODOS_STATUS_PEDIDO,
  Comanda,
  ComandaService,
  filtrarPorPeriodo,
} from '../comandas/comanda.service';
import { ResumoVendas, VendaService } from '../vendas/venda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { PeriodoUtil } from '../utils/periodoUtil';

interface PontoDia {
  dia: string;
  valor: number;
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const LARGURA_GRAFICO = 700;
const ALTURA_GRAFICO = 180;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, CarregandoComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  private comandaService = inject(ComandaService);
  private vendaService = inject(VendaService);
  private estoqueService = inject(EstoqueService);

  readonly statusLabel = STATUS_PEDIDO_LABEL;

  carregando = signal(true);
  erro = signal<string | null>(null);
  private pedidos = signal<Comanda[]>([]);
  alertas = signal<Estoque[]>([]);

  private hoje = PeriodoUtil.paraIso(new Date());
  private inicioSemana = PeriodoUtil.resolver('semana').inicio;

  pedidosHoje = computed(() => filtrarPorPeriodo(this.pedidos(), this.hoje, this.hoje));
  pedidosSemana = computed(() => filtrarPorPeriodo(this.pedidos(), this.inicioSemana, this.hoje));
  /** Faturamento vem das vendas finalizadas; as comandas só alimentam os indicadores de operação. */
  private resumoVendasHoje = signal<ResumoVendas | null>(null);
  private resumoVendasSemana = signal<ResumoVendas | null>(null);
  resumoHoje = computed(
    () => this.resumoVendasHoje() ?? { totalFaturado: 0, ticketMedio: 0, quantidadeCanceladas: 0 },
  );

  aguardando = computed(() => this.pedidos().filter((p) => p.status === 'ABERTO').length);
  emPreparo = computed(() => this.pedidos().filter((p) => p.status === 'EM_PREPARO').length);

  /** Faturamento (vendas finalizadas) de cada um dos últimos 7 dias. */
  vendasSemana = computed<PontoDia[]>(() => {
    const porDia = new Map((this.resumoVendasSemana()?.porDia ?? []).map((linha) => [linha.dia, linha.total]));
    const pontos: PontoDia[] = [];
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      pontos.push({ dia: DIAS_SEMANA[data.getDay()], valor: porDia.get(PeriodoUtil.paraIso(data)) ?? 0 });
    }
    return pontos;
  });

  porStatus = computed(() => {
    const pedidos = this.pedidosSemana();
    const total = Math.max(1, pedidos.length);
    return TODOS_STATUS_PEDIDO.map((status: StatusPedido) => {
      const quantidade = pedidos.filter((p) => p.status === status).length;
      return { status, quantidade, percentual: (quantidade / total) * 100 };
    });
  });

  produtosMaisVendidos = computed(() => {
    const contagem = new Map<string, number>();
    for (const pedido of this.pedidosSemana()) {
      if (pedido.status === 'CANCELADO') continue;
      for (const item of pedido.itens) {
        contagem.set(item.produto.nome, (contagem.get(item.produto.nome) ?? 0) + item.quantidade);
      }
    }
    return [...contagem.entries()]
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  });

  horarioMovimento = computed(() => {
    const porHora = new Map<number, number>();
    for (const pedido of this.pedidosSemana()) {
      if (!pedido.dataCriacao) continue;
      const hora = new Date(pedido.dataCriacao).getHours();
      porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
    }
    const lista = [...porHora.entries()].sort((a, b) => a[0] - b[0]).map(([hora, pedidos]) => ({ hora: `${hora}h`, pedidos }));
    const maior = Math.max(1, ...lista.map((p) => p.pedidos));
    return lista.map((p) => ({ ...p, altura: (p.pedidos / maior) * 100 }));
  });

  private maiorValorSemana = computed(() => Math.max(1, ...this.vendasSemana().map((p) => p.valor)) * 1.15);

  areaPath = computed(() => {
    const pontos = this.vendasSemana().map((p, i) => ({ x: this.pontoX(i), y: this.pontoY(p.valor) }));
    let d = `M ${pontos[0].x} ${pontos[0].y}`;
    for (let i = 0; i < pontos.length - 1; i++) {
      const atual = pontos[i];
      const proximo = pontos[i + 1];
      const meioX = (atual.x + proximo.x) / 2;
      d += ` C ${meioX} ${atual.y}, ${meioX} ${proximo.y}, ${proximo.x} ${proximo.y}`;
    }
    return d;
  });

  areaFillPath = computed(() => `${this.areaPath()} L ${LARGURA_GRAFICO} ${ALTURA_GRAFICO} L 0 ${ALTURA_GRAFICO} Z`);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    forkJoin({
      pedidos: this.comandaService.listar(),
      hoje: this.vendaService.resumir(this.hoje, this.hoje).pipe(catchError(() => of(null))),
      semana: this.vendaService.resumir(this.inicioSemana, this.hoje).pipe(catchError(() => of(null))),
      alertas: this.estoqueService.listarAlertas().pipe(catchError(() => of([] as Estoque[]))),
    }).subscribe({
      next: ({ pedidos, hoje, semana, alertas }) => {
        this.pedidos.set(pedidos);
        this.resumoVendasHoje.set(hoje);
        this.resumoVendasSemana.set(semana);
        this.alertas.set(alertas);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os indicadores.'));
        this.carregando.set(false);
      },
    });
  }

  pontoX(i: number): number {
    return i * (LARGURA_GRAFICO / 6);
  }

  pontoY(valor: number): number {
    return ALTURA_GRAFICO - (valor / this.maiorValorSemana()) * ALTURA_GRAFICO;
  }
}
