import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { FichaTecnicaItem, FichaTecnicaService } from '../ficha-tecnica/ficha-tecnica.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Estoque, EstoqueService, MovimentacaoEstoque, TipoMovimentacaoEstoque } from './estoque.service';

const ICONE_POR_CATEGORIA: Record<string, string> = {
  Pães: 'bi-basket3',
  Carnes: 'bi-fire',
  Laticínios: 'bi-egg',
  Vegetais: 'bi-flower1',
  Congelados: 'bi-snow',
  Bebidas: 'bi-cup-straw',
};

/** Quantas unidades de um produto preparado dá para montar com o estoque de insumos. */
export interface ProducaoPossivel {
  produto: Produto;
  quantidade: number;
  /** Insumo que limita a produção (o que acaba primeiro). */
  limitante: string | null;
  /** Insumos da ficha técnica sem controle de estoque cadastrado. */
  semControle: string[];
}

/**
 * Aba Estoque do módulo Produto. Controla só o estoque de INSUMOS: é a partir
 * deles (e da ficha técnica) que se sabe se dá para fazer cada produto.
 */
@Component({
  selector: 'app-controle-estoque',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './controle-estoque.html',
  styleUrls: ['./controle-estoque.scss'],
})
export class ControleEstoque implements OnInit {
  private fb = inject(FormBuilder);
  private estoqueService = inject(EstoqueService);
  private produtoService = inject(ProdutoService);
  private fichaTecnicaService = inject(FichaTecnicaService);

  /** Só estoque de insumos. */
  estoques: Estoque[] = [];
  /** Registros de estoque de produtos que não são insumo (de antes da unificação). */
  estoquesOcultos = 0;
  producaoPossivel: ProducaoPossivel[] = [];
  carregandoProducao = false;
  movimentacoes: MovimentacaoEstoque[] = [];
  produtosSemEstoque: Produto[] = [];

  carregando = true;
  enviandoCadastro = false;
  enviandoMovimentacao = false;
  erro: string | null = null;
  sucesso = false;

  formCadastro = this.fb.group({
    produtoId: [null as number | null, Validators.required],
    quantidadeAtual: [0, [Validators.required, Validators.min(0)]],
    estoqueMinimo: [0, [Validators.required, Validators.min(0)]],
  });

  formMovimentacao = this.fb.group({
    produtoId: [null as number | null, Validators.required],
    tipo: ['ENTRADA' as TipoMovimentacaoEstoque, Validators.required],
    quantidade: [null as number | null, [Validators.required, Validators.min(1)]],
    observacao: [''],
  });

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando = true;
    this.erro = null;

    this.estoqueService.listar().subscribe({
      next: (estoques) => {
        this.todosEstoques = estoques;
        this.aplicarFiltroInsumo();
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o estoque.');
        this.carregando = false;
      },
    });

    this.estoqueService.listarMovimentacoes().subscribe({
      next: (movimentacoes) => {
        this.todasMovimentacoes = movimentacoes;
        this.aplicarFiltroInsumo();
      },
      error: () => {},
    });

    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.todosProdutos = produtos;
        this.aplicarFiltroInsumo();
        this.carregarProducaoPossivel();
      },
      error: () => {},
    });
  }

  private todosProdutos: Produto[] = [];
  private todosEstoques: Estoque[] = [];
  private todasMovimentacoes: MovimentacaoEstoque[] = [];
  private fichasPorProduto: Record<number, FichaTecnicaItem[]> = {};

  /**
   * A natureza vem tanto embutida no estoque quanto na lista de produtos;
   * usa a lista de produtos quando já carregou (é a fonte mais completa).
   */
  private ehInsumo(produtoId: number, natureza?: string | null): boolean {
    const produto = this.todosProdutos.find((p) => p.id === produtoId);
    return (produto?.natureza ?? natureza) === 'INSUMO';
  }

  private aplicarFiltroInsumo() {
    this.estoques = this.todosEstoques.filter((e) => this.ehInsumo(e.produto.id, e.produto.natureza));
    this.estoquesOcultos = this.todosEstoques.length - this.estoques.length;

    const idsInsumo = new Set(this.estoques.map((e) => e.produto.id));
    this.movimentacoes = this.todasMovimentacoes.filter((m) => idsInsumo.has(m.produto.id));

    const idsComEstoque = new Set(this.todosEstoques.map((e) => e.produto.id));
    this.produtosSemEstoque = this.todosProdutos.filter((p) => p.natureza === 'INSUMO' && !idsComEstoque.has(p.id));

    this.calcularProducaoPossivel();
  }

  private carregarProducaoPossivel() {
    const preparados = this.todosProdutos.filter((p) => p.natureza === 'PREPARADO' && p.flAtivo);
    if (preparados.length === 0) {
      this.producaoPossivel = [];
      return;
    }

    this.carregandoProducao = true;
    forkJoin(
      preparados.map((p) => this.fichaTecnicaService.listar(p.id).pipe(catchError(() => of([] as FichaTecnicaItem[])))),
    ).subscribe({
      next: (fichas) => {
        this.fichasPorProduto = {};
        preparados.forEach((p, i) => (this.fichasPorProduto[p.id] = fichas[i]));
        this.carregandoProducao = false;
        this.calcularProducaoPossivel();
      },
      error: () => (this.carregandoProducao = false),
    });
  }

  private calcularProducaoPossivel() {
    const estoquePorInsumo = new Map(this.estoques.map((e) => [e.produto.id, e.quantidadeAtual]));

    this.producaoPossivel = this.todosProdutos
      .filter((p) => this.fichasPorProduto[p.id]?.length)
      .map((produto) => {
        let quantidade = Number.POSITIVE_INFINITY;
        let limitante: string | null = null;
        const semControle: string[] = [];

        for (const item of this.fichasPorProduto[produto.id]) {
          const disponivel = estoquePorInsumo.get(item.insumo.id);
          if (disponivel === undefined) {
            semControle.push(item.insumo.nome);
            continue;
          }
          if (!item.quantidade || item.quantidade <= 0) continue;
          const possivel = Math.floor(disponivel / item.quantidade);
          if (possivel < quantidade) {
            quantidade = possivel;
            limitante = item.insumo.nome;
          }
        }

        return {
          produto,
          quantidade: Number.isFinite(quantidade) ? quantidade : 0,
          limitante,
          semControle,
        };
      })
      .sort((a, b) => a.quantidade - b.quantidade || a.produto.nome.localeCompare(b.produto.nome));
  }

  get estoqueBaixo(): Estoque[] {
    return this.estoques.filter((e) => e.quantidadeAtual < e.estoqueMinimo);
  }

  iconeCategoria(categoriaNome?: string | null): string {
    return (categoriaNome && ICONE_POR_CATEGORIA[categoriaNome]) || 'bi-box-seam';
  }

  cadastrarNoEstoque() {
    if (this.formCadastro.invalid || this.enviandoCadastro) {
      this.formCadastro.markAllAsTouched();
      return;
    }

    const { produtoId, quantidadeAtual, estoqueMinimo } = this.formCadastro.getRawValue();
    this.enviandoCadastro = true;
    this.erro = null;

    this.estoqueService.criar(produtoId!, quantidadeAtual!, estoqueMinimo!).subscribe({
      next: (estoque) => {
        this.enviandoCadastro = false;
        this.todosEstoques = [estoque, ...this.todosEstoques];
        this.aplicarFiltroInsumo();
        this.formCadastro.reset({ produtoId: null, quantidadeAtual: 0, estoqueMinimo: 0 });
      },
      error: (erro) => {
        this.enviandoCadastro = false;
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível cadastrar o produto no estoque.');
      },
    });
  }

  registrarMovimentacao() {
    if (this.formMovimentacao.invalid || this.enviandoMovimentacao) {
      this.formMovimentacao.markAllAsTouched();
      return;
    }

    const { produtoId, tipo, quantidade, observacao } = this.formMovimentacao.getRawValue();
    this.enviandoMovimentacao = true;
    this.erro = null;

    this.estoqueService.registrarMovimentacao(produtoId!, tipo!, quantidade!, observacao || undefined).subscribe({
      next: (movimentacao) => {
        this.enviandoMovimentacao = false;
        this.sucesso = true;
        setTimeout(() => (this.sucesso = false), 4000);
        this.formMovimentacao.reset({ produtoId: null, tipo: 'ENTRADA', quantidade: null, observacao: '' });
        this.carregar();
      },
      error: (erro) => {
        this.enviandoMovimentacao = false;
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível registrar a movimentação.');
      },
    });
  }
}
