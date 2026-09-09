import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { Estoque, EstoqueService } from '../controle-estoque/estoque.service';
import { Venda, VendaService } from '../novo-pedido/venda.service';
import { Despesa, DespesaPayload, DespesaService } from './despesa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

const ICONE_POR_CATEGORIA: Record<string, string> = {
  Lanches: 'bi-egg-fried',
  Bebidas: 'bi-cup-straw',
};

@Component({
  selector: 'app-financeiro',
  templateUrl: './financeiro.html',
  imports: [CommonModule, FormsModule, CarregandoComponent],
  styleUrls: ['./financeiro.scss'],
})
export class Financeiro implements OnInit {
  private produtoService = inject(ProdutoService);
  private estoqueService = inject(EstoqueService);
  private vendaService = inject(VendaService);
  private despesaService = inject(DespesaService);

  abaSelecionada: 'resumo' | 'vendas' | 'despesas' | 'produtos' = 'resumo';
  filtroSelecionado: 'hoje' | 'semana' | 'periodo' = 'hoje';

  busca = '';
  estoqueMinimoPadrao = 5;

  carregando = true;
  erro: string | null = null;

  produtos: Produto[] = [];
  estoques: Estoque[] = [];
  vendas: Venda[] = [];
  despesas: Despesa[] = [];

  produtosFiltrados: Produto[] = [];

  novaDespesa: DespesaPayload = { descricao: '', categoria: '', valor: 0, dtDespesa: this.hoje() };
  enviandoDespesa = false;
  erroDespesa: string | null = null;

  ngOnInit() {
    this.carregando = true;

    Promise.all([
      this.aPromise(this.produtoService.listar()),
      this.aPromise(this.estoqueService.listar()),
      this.aPromise(this.vendaService.listar()),
      this.aPromise(this.despesaService.listar()),
    ])
      .then(([produtos, estoques, vendas, despesas]) => {
        this.produtos = produtos;
        this.estoques = estoques;
        this.vendas = vendas;
        this.despesas = despesas;
        this.produtosFiltrados = [...this.produtos];
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os dados financeiros.');
        this.carregando = false;
      });
  }

  private aPromise<T>(obs: Observable<T>): Promise<T> {
    return new Promise((resolve, reject) => obs.subscribe({ next: resolve, error: reject }));
  }

  private hoje(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dataDentroDoFiltro(data: string | null): boolean {
    if (!data) return false;
    const dia = data.slice(0, 10);
    const hoje = this.hoje();

    if (this.filtroSelecionado === 'hoje') {
      return dia === hoje;
    }
    if (this.filtroSelecionado === 'semana') {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      return new Date(dia) >= seteDiasAtras;
    }
    return true;
  }

  get vendasFiltradas(): Venda[] {
    return this.vendas.filter((v) => this.dataDentroDoFiltro(v.dt_criacao));
  }

  get despesasFiltradas(): Despesa[] {
    return this.despesas.filter((d) => this.dataDentroDoFiltro(d.dtDespesa));
  }

  totalVenda(venda: Venda): number {
    return (venda.itens ?? []).reduce((soma, item) => soma + (item.valor_total ?? 0), 0);
  }

  get vendasTotal(): number {
    return this.vendasFiltradas.reduce((soma, v) => soma + this.totalVenda(v), 0);
  }

  get despesasTotal(): number {
    return this.despesasFiltradas.reduce((soma, d) => soma + d.valor, 0);
  }

  get lucro(): number {
    return this.vendasTotal - this.despesasTotal;
  }

  get resumo() {
    const pedidos = this.vendasFiltradas.length;
    return {
      pedidos,
      ticketMedio: pedidos > 0 ? this.vendasTotal / pedidos : 0,
      despesasRegistradas: this.despesasFiltradas.length,
      resultado: this.lucro,
    };
  }

  estoqueDoProduto(produtoId: number): number {
    return this.estoques.find((e) => e.produto.id === produtoId)?.quantidadeAtual ?? 0;
  }

  selecionarAba(aba: 'resumo' | 'vendas' | 'despesas' | 'produtos') {
    this.abaSelecionada = aba;
  }

  selecionarFiltro(filtro: 'hoje' | 'semana' | 'periodo') {
    this.filtroSelecionado = filtro;
  }

  filtrarProdutos() {
    const termo = this.busca.toLowerCase().trim();

    if (!termo) {
      this.produtosFiltrados = [...this.produtos];
    } else {
      this.produtosFiltrados = this.produtos.filter((p) => p.nome.toLowerCase().includes(termo));
    }
  }

  isEstoqueBaixo(p: Produto): boolean {
    const estoque = this.estoques.find((e) => e.produto.id === p.id);
    if (!estoque) return false;
    return estoque.quantidadeAtual < estoque.estoqueMinimo;
  }

  iconeCategoria(categoria: string | null | undefined): string {
    return (categoria && ICONE_POR_CATEGORIA[categoria]) ?? 'bi-box-seam';
  }

  registrarDespesa() {
    if (!this.novaDespesa.descricao.trim() || !this.novaDespesa.categoria.trim() || this.novaDespesa.valor <= 0) {
      this.erroDespesa = 'Preencha descrição, categoria e um valor maior que zero.';
      return;
    }

    this.enviandoDespesa = true;
    this.erroDespesa = null;

    this.despesaService.criar(this.novaDespesa).subscribe({
      next: (despesa) => {
        this.despesas = [despesa, ...this.despesas];
        this.novaDespesa = { descricao: '', categoria: '', valor: 0, dtDespesa: this.hoje() };
        this.enviandoDespesa = false;
      },
      error: (erro) => {
        this.erroDespesa = MensagemErroApiUtil.extrair(erro, 'Não foi possível registrar a despesa.');
        this.enviandoDespesa = false;
      },
    });
  }

  excluirDespesa(despesa: Despesa) {
    if (!confirm(`Excluir a despesa "${despesa.descricao}"?`)) {
      return;
    }
    this.despesaService.excluir(despesa.id).subscribe({
      next: () => (this.despesas = this.despesas.filter((d) => d.id !== despesa.id)),
      error: (erro) => (this.erroDespesa = MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir a despesa.')),
    });
  }
}
