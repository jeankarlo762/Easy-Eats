import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FiltroPeriodoComponent } from '../../components/filtro-periodo/filtro-periodo';
import { PaginacaoComponent } from '../../components/paginacao/paginacao';
import { Caixa, CaixaService, Pagina, StatusCaixa } from '../caixa/caixa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Periodo } from '../utils/periodoUtil';

type FiltroStatus = 'TODOS' | StatusCaixa;

const TAMANHO_PAGINA = 15;

@Component({
  selector: 'app-caixa-historico',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, CarregandoComponent, FiltroPeriodoComponent, PaginacaoComponent],
  templateUrl: './caixa-historico.html',
  styleUrl: './caixa-historico.scss',
})
export class CaixaHistorico {
  private caixaService = inject(CaixaService);

  readonly filtrosStatus: { valor: FiltroStatus; label: string }[] = [
    { valor: 'TODOS', label: 'Todos' },
    { valor: 'ABERTO', label: 'Abertos' },
    { valor: 'FECHADO', label: 'Fechados' },
  ];

  periodo = signal<Periodo | null>(null);
  status = signal<FiltroStatus>('TODOS');
  usuario = signal('');
  pagina = signal<Pagina<Caixa> | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);

  /** O filtro de período emite o intervalo inicial ao montar, o que dispara a primeira carga. */
  aplicarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.carregar(0);
  }

  selecionarStatus(status: FiltroStatus): void {
    this.status.set(status);
    this.carregar(0);
  }

  carregar(numeroPagina = this.pagina()?.pagina ?? 0): void {
    const periodo = this.periodo();
    if (!periodo) {
      return;
    }
    const status = this.status();
    this.carregando.set(true);
    this.erro.set(null);
    this.caixaService
      .listar(
        {
          inicio: periodo.inicio,
          fim: periodo.fim,
          usuario: this.usuario(),
          status: status === 'TODOS' ? null : status,
        },
        numeroPagina,
        TAMANHO_PAGINA,
      )
      .subscribe({
        next: (pagina) => {
          this.pagina.set(pagina);
          this.carregando.set(false);
        },
        error: (erro) => {
          this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o histórico de caixas.'));
          this.carregando.set(false);
        },
      });
  }

  /** Verde sem diferença, amarelo com sobra, vermelho com falta. */
  classeDiferenca(diferenca: number | null): string {
    if (!diferenca) {
      return 'sucesso';
    }
    return diferenca > 0 ? 'aviso' : 'erro';
  }
}
