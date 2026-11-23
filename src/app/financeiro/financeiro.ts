import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FiltroPeriodoComponent } from '../../components/filtro-periodo/filtro-periodo';
import { PaginacaoComponent } from '../../components/paginacao/paginacao';
import { Pagina } from '../caixa/caixa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Periodo } from '../utils/periodoUtil';
import {
  FORMA_PAGAMENTO_LABEL,
  ResumoVendas,
  TIPO_VENDA_LABEL,
  VendaResumo,
  VendaService,
} from '../vendas/venda.service';

const TAMANHO_PAGINA = 10;

/** Faturamento por período: vendas finalizadas, pela data em que a conta foi fechada. */
@Component({
  selector: 'app-financeiro',
  standalone: true,
  templateUrl: './financeiro.html',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, CarregandoComponent, FiltroPeriodoComponent, PaginacaoComponent],
  styleUrls: ['./financeiro.scss'],
})
export class Financeiro {
  private vendaService = inject(VendaService);

  readonly formaLabel = FORMA_PAGAMENTO_LABEL;
  readonly tipoLabel = TIPO_VENDA_LABEL;

  carregando = signal(true);
  erro = signal<string | null>(null);
  periodo = signal<Periodo | null>(null);
  resumo = signal<ResumoVendas | null>(null);
  pagina = signal<Pagina<VendaResumo> | null>(null);
  /** Soma das contas ainda abertas (mesas e retiradas), independente do período. */
  emAberto = signal(0);

  /** O filtro de período emite o intervalo inicial ao montar, o que dispara a primeira carga. */
  aplicarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.carregar();
  }

  carregar(): void {
    const periodo = this.periodo();
    if (!periodo) {
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      resumo: this.vendaService.resumir(periodo.inicio, periodo.fim),
      pagina: this.listarFinalizadas(periodo, 0),
      abertas: this.vendaService.abertas(),
    }).subscribe({
      next: ({ resumo, pagina, abertas }) => {
        this.resumo.set(resumo);
        this.pagina.set(pagina);
        this.emAberto.set(abertas.reduce((soma, venda) => soma + venda.valorTotal, 0));
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o faturamento do período.'));
        this.carregando.set(false);
      },
    });
  }

  /** Troca de página: o resumo do período não muda, então só a lista é buscada de novo. */
  irParaPagina(numeroPagina: number): void {
    const periodo = this.periodo();
    if (!periodo) {
      return;
    }
    this.carregando.set(true);
    this.listarFinalizadas(periodo, numeroPagina).subscribe({
      next: (pagina) => {
        this.pagina.set(pagina);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar as vendas.'));
        this.carregando.set(false);
      },
    });
  }

  /** Percentual de cada forma de pagamento no total faturado (para a coluna de participação). */
  percentual(total: number): number {
    const faturado = this.resumo()?.totalFaturado ?? 0;
    return faturado > 0 ? (total / faturado) * 100 : 0;
  }

  dataDoDia(dia: string): Date {
    return new Date(`${dia}T00:00:00`);
  }

  identificacao(venda: VendaResumo): string {
    if (venda.tipo === 'MESA') {
      return `Mesa ${venda.numeroMesa ?? ''}`.trim();
    }
    return `${this.tipoLabel[venda.tipo]}${venda.nomeCliente ? ' · ' + venda.nomeCliente : ''}`;
  }

  private listarFinalizadas(periodo: Periodo, numeroPagina: number) {
    return this.vendaService.listar(
      { status: 'FINALIZADA', inicio: periodo.inicio, fim: periodo.fim },
      numeroPagina,
      TAMANHO_PAGINA,
    );
  }
}
