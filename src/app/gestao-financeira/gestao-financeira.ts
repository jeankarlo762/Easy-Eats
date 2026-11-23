import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FiltroPeriodoComponent } from '../../components/filtro-periodo/filtro-periodo';
import { PaginacaoComponent } from '../../components/paginacao/paginacao';
import {
  CaixaService,
  FiltroLancamentos,
  MovimentacaoCaixa,
  Pagina,
  ResumoLancamentos,
  TIPO_MOVIMENTACAO_LABEL,
  TipoMovimentacao,
  ehSaida,
} from '../caixa/caixa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Periodo } from '../utils/periodoUtil';

type FiltroTipo = 'TODOS' | TipoMovimentacao;

const TAMANHO_PAGINA = 20;

/** Lançamentos financeiros vindos do caixa (fundo inicial, suprimentos e sangrias), com filtros. */
@Component({
  selector: 'app-gestao-financeira',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, CarregandoComponent, FiltroPeriodoComponent, PaginacaoComponent],
  templateUrl: './gestao-financeira.html',
  styleUrl: './gestao-financeira.scss',
})
export class GestaoFinanceira {
  private caixaService = inject(CaixaService);

  readonly tipoLabel = TIPO_MOVIMENTACAO_LABEL;
  readonly ehSaida = ehSaida;
  readonly filtrosTipo: { valor: FiltroTipo; label: string }[] = [
    { valor: 'TODOS', label: 'Todos' },
    { valor: 'FUNDO_INICIAL', label: TIPO_MOVIMENTACAO_LABEL.FUNDO_INICIAL },
    { valor: 'SUPRIMENTO', label: TIPO_MOVIMENTACAO_LABEL.SUPRIMENTO },
    { valor: 'SANGRIA', label: TIPO_MOVIMENTACAO_LABEL.SANGRIA },
    { valor: 'VENDA', label: TIPO_MOVIMENTACAO_LABEL.VENDA },
  ];

  periodo = signal<Periodo | null>(null);
  tipo = signal<FiltroTipo>('TODOS');
  usuario = signal('');
  caixaId = signal<number | null>(null);

  pagina = signal<Pagina<MovimentacaoCaixa> | null>(null);
  resumo = signal<ResumoLancamentos | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);

  /** O filtro de período emite o intervalo inicial ao montar, o que dispara a primeira carga. */
  aplicarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.carregar();
  }

  selecionarTipo(tipo: FiltroTipo): void {
    this.tipo.set(tipo);
    this.carregar();
  }

  /** Busca a página 0 e os totais com os filtros atuais. */
  carregar(): void {
    const filtro = this.filtroAtual();
    if (!filtro) {
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      pagina: this.caixaService.listarMovimentacoes(filtro, 0, TAMANHO_PAGINA),
      resumo: this.caixaService.resumirMovimentacoes(filtro),
    }).subscribe({
      next: ({ pagina, resumo }) => {
        this.pagina.set(pagina);
        this.resumo.set(resumo);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os lançamentos.'));
        this.carregando.set(false);
      },
    });
  }

  /** Troca de página: os totais não mudam, então só a lista é buscada de novo. */
  irParaPagina(numeroPagina: number): void {
    const filtro = this.filtroAtual();
    if (!filtro) {
      return;
    }
    this.carregando.set(true);
    this.caixaService.listarMovimentacoes(filtro, numeroPagina, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.pagina.set(pagina);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os lançamentos.'));
        this.carregando.set(false);
      },
    });
  }

  private filtroAtual(): FiltroLancamentos | null {
    const periodo = this.periodo();
    if (!periodo) {
      return null;
    }
    const tipo = this.tipo();
    return {
      inicio: periodo.inicio,
      fim: periodo.fim,
      tipo: tipo === 'TODOS' ? null : tipo,
      usuario: this.usuario(),
      caixaId: this.caixaId(),
    };
  }
}
