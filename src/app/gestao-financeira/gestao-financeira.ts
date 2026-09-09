import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Despesa, DespesaService } from '../financeiro/despesa.service';
import { Venda, VendaService } from '../novo-pedido/venda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

type TipoLancamento = 'Ganho' | 'Gasto';
type FiltroLancamento = 'Todos' | 'Ganhos' | 'Gastos';

interface Lancamento {
  id: string;
  descricao: string;
  categoria: string;
  data: string;
  valor: number;
  tipo: TipoLancamento;
}

@Component({
  selector: 'app-gestao-financeira',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './gestao-financeira.html',
  styleUrl: './gestao-financeira.scss',
})
export class GestaoFinanceira implements OnInit {
  private vendaService = inject(VendaService);
  private despesaService = inject(DespesaService);

  carregando = true;
  erro: string | null = null;
  filtroAtivo: FiltroLancamento = 'Todos';

  lancamentos: Lancamento[] = [];

  ngOnInit() {
    this.carregando = true;

    Promise.all([
      new Promise<Venda[]>((resolve, reject) => this.vendaService.listar().subscribe({ next: resolve, error: reject })),
      new Promise<Despesa[]>((resolve, reject) => this.despesaService.listar().subscribe({ next: resolve, error: reject })),
    ])
      .then(([vendas, despesas]) => {
        this.lancamentos = [...this.vendasParaLancamentos(vendas), ...this.despesasParaLancamentos(despesas)].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
        );
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os lançamentos financeiros.');
        this.carregando = false;
      });
  }

  private vendasParaLancamentos(vendas: Venda[]): Lancamento[] {
    return vendas
      .filter((v) => v.dt_criacao)
      .map((v) => ({
        id: `venda-${v.id}`,
        descricao: v.nomeCliente || (v.mesa ? `Venda mesa ${v.mesa.numero}` : `Venda #${v.id}`),
        categoria: 'Vendas',
        data: v.dt_criacao as string,
        valor: (v.itens ?? []).reduce((soma, item) => soma + (item.valor_total ?? 0), 0),
        tipo: 'Ganho' as const,
      }));
  }

  private despesasParaLancamentos(despesas: Despesa[]): Lancamento[] {
    return despesas.map((d) => ({
      id: `despesa-${d.id}`,
      descricao: d.descricao,
      categoria: d.categoria,
      data: d.dtDespesa,
      valor: d.valor,
      tipo: 'Gasto' as const,
    }));
  }

  get lancamentosFiltrados(): Lancamento[] {
    if (this.filtroAtivo === 'Ganhos') {
      return this.lancamentos.filter((l) => l.tipo === 'Ganho');
    }
    if (this.filtroAtivo === 'Gastos') {
      return this.lancamentos.filter((l) => l.tipo === 'Gasto');
    }
    return this.lancamentos;
  }

  get totalGanhos(): number {
    return this.lancamentos.filter((l) => l.tipo === 'Ganho').reduce((soma, l) => soma + l.valor, 0);
  }

  get totalGastos(): number {
    return this.lancamentos.filter((l) => l.tipo === 'Gasto').reduce((soma, l) => soma + l.valor, 0);
  }

  get saldo(): number {
    return this.totalGanhos - this.totalGastos;
  }

  selecionarFiltro(filtro: FiltroLancamento) {
    this.filtroAtivo = filtro;
  }
}
