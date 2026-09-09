import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
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

@Component({
  selector: 'app-controle-estoque',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './controle-estoque.html',
  styleUrls: ['./controle-estoque.scss'],
})
export class ControleEstoque implements OnInit {
  private fb = inject(FormBuilder);
  private estoqueService = inject(EstoqueService);
  private produtoService = inject(ProdutoService);

  estoques: Estoque[] = [];
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
        this.estoques = estoques;
        this.carregando = false;
        this.calcularProdutosSemEstoque();
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o estoque.');
        this.carregando = false;
      },
    });

    this.estoqueService.listarMovimentacoes().subscribe({
      next: (movimentacoes) => (this.movimentacoes = movimentacoes),
      error: () => {},
    });

    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.todosProdutos = produtos;
        this.calcularProdutosSemEstoque();
      },
      error: () => {},
    });
  }

  private todosProdutos: Produto[] = [];

  private calcularProdutosSemEstoque() {
    const idsComEstoque = new Set(this.estoques.map((e) => e.produto.id));
    this.produtosSemEstoque = this.todosProdutos.filter((p) => !idsComEstoque.has(p.id));
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
        this.estoques = [estoque, ...this.estoques];
        this.calcularProdutosSemEstoque();
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
        this.movimentacoes = [movimentacao, ...this.movimentacoes];
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
