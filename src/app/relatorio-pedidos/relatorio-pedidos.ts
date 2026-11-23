import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FiltroPeriodoComponent } from '../../components/filtro-periodo/filtro-periodo';
import {
  STATUS_PEDIDO_LABEL,
  TODOS_STATUS_PEDIDO,
  Comanda,
  ComandaService,
  filtrarPorPeriodo,
} from '../comandas/comanda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Periodo, PeriodoUtil } from '../utils/periodoUtil';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

@Component({
  selector: 'app-relatorio-pedidos',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, CarregandoComponent, FiltroPeriodoComponent],
  templateUrl: './relatorio-pedidos.html',
  styleUrl: './relatorio-pedidos.scss',
})
export class RelatorioPedidos implements OnInit {
  private comandaService = inject(ComandaService);

  readonly statusLabel = STATUS_PEDIDO_LABEL;

  carregando = signal(true);
  erro = signal<string | null>(null);
  private todos = signal<Comanda[]>([]);
  periodo = signal<Periodo>(PeriodoUtil.resolver('hoje'));

  pedidos = computed(() => filtrarPorPeriodo(this.todos(), this.periodo().inicio, this.periodo().fim));
  resumo = computed(() => ComandaService.resumir(this.pedidos()));

  taxaCancelamento = computed(() =>
    this.pedidos().length ? (this.resumo().canceladas / this.pedidos().length) * 100 : 0,
  );

  porStatus = computed(() =>
    TODOS_STATUS_PEDIDO.map((status) => {
      const lista = this.pedidos().filter((p) => p.status === status);
      return { status, quantidade: lista.length, valor: lista.reduce((s, p) => s + p.valorTotal, 0) };
    }),
  );

  porDia = computed(() => {
    const linhas = DIAS_SEMANA.map((dia) => ({ dia, pedidos: 0, valor: 0, altura: 0 }));
    for (const pedido of this.pedidos()) {
      if (!pedido.dataCriacao || pedido.status === 'CANCELADO') continue;
      const linha = linhas[new Date(pedido.dataCriacao).getDay()];
      linha.pedidos++;
      linha.valor += pedido.valorTotal;
    }
    const maior = Math.max(1, ...linhas.map((l) => l.valor));
    return linhas.map((l) => ({ ...l, altura: (l.valor / maior) * 100 }));
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.comandaService.listar().subscribe({
      next: (pedidos) => {
        this.todos.set(pedidos);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os pedidos.'));
        this.carregando.set(false);
      },
    });
  }
}
