import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FiltroPeriodoComponent } from '../../components/filtro-periodo/filtro-periodo';
import { Comanda, ComandaService, filtrarPorPeriodo } from '../comandas/comanda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Periodo, PeriodoUtil } from '../utils/periodoUtil';

/** Pedidos em andamento há mais tempo que isso contam como atrasados. */
const MINUTOS_ATRASO = 20;

@Component({
  selector: 'app-relatorio-cozinha',
  standalone: true,
  imports: [DecimalPipe, CarregandoComponent, FiltroPeriodoComponent],
  templateUrl: './relatorio-cozinha.html',
  styleUrl: './relatorio-cozinha.scss',
})
export class RelatorioCozinha implements OnInit {
  private comandaService = inject(ComandaService);

  readonly minutosAtraso = MINUTOS_ATRASO;

  carregando = signal(true);
  erro = signal<string | null>(null);
  private todos = signal<Comanda[]>([]);
  periodo = signal<Periodo>(PeriodoUtil.resolver('hoje'));

  private pedidos = computed(() => filtrarPorPeriodo(this.todos(), this.periodo().inicio, this.periodo().fim));
  private finalizados = computed(() => this.pedidos().filter((p) => p.status === 'FINALIZADO'));

  preparados = computed(() => this.finalizados().length);

  /**
   * O backend não registra o horário de cada etapa: usamos a diferença entre
   * a criação do pedido e a última alteração (quando foi finalizado).
   */
  tempoMedio = computed(() => this.media(this.finalizados().map((p) => this.minutosAtendimento(p))));

  atrasados = computed(() => {
    const agora = Date.now();
    return this.todos().filter(
      (p) =>
        (p.status === 'ABERTO' || p.status === 'EM_PREPARO') &&
        !!p.dataCriacao &&
        (agora - new Date(p.dataCriacao).getTime()) / 60000 >= MINUTOS_ATRASO,
    ).length;
  });

  tempoPorHorario = computed(() => {
    const grupos = new Map<number, number[]>();
    for (const pedido of this.finalizados()) {
      const minutos = this.minutosAtendimento(pedido);
      if (minutos === null || !pedido.dataCriacao) continue;
      const hora = new Date(pedido.dataCriacao).getHours();
      grupos.set(hora, [...(grupos.get(hora) ?? []), minutos]);
    }
    const linhas = [...grupos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hora, tempos]) => ({ hora: `${hora}h`, minutos: this.media(tempos) ?? 0 }));
    const maior = Math.max(1, ...linhas.map((l) => l.minutos));
    return linhas.map((l) => ({ ...l, altura: (l.minutos / maior) * 100 }));
  });

  itensMaisPreparados = computed(() => {
    const contagem = new Map<string, number>();
    for (const pedido of this.finalizados()) {
      for (const item of pedido.itens) {
        contagem.set(item.produto.nome, (contagem.get(item.produto.nome) ?? 0) + item.quantidade);
      }
    }
    return [...contagem.entries()]
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8);
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

  private minutosAtendimento(pedido: Comanda): number | null {
    if (!pedido.dataCriacao || !pedido.dataAlteracao) return null;
    const minutos = (new Date(pedido.dataAlteracao).getTime() - new Date(pedido.dataCriacao).getTime()) / 60000;
    return minutos >= 0 ? minutos : null;
  }

  private media(valores: (number | null)[]): number | null {
    const validos = valores.filter((v): v is number => v !== null);
    return validos.length ? validos.reduce((s, v) => s + v, 0) / validos.length : null;
  }
}
