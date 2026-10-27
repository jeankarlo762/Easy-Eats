import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { Estoque, EstoqueService } from '../controle-estoque/estoque.service';
import { FichaTecnicaItem, FichaTecnicaService, custoIngrediente } from './ficha-tecnica.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-ficha-tecnica',
  standalone: true,
  imports: [CommonModule, FormsModule, CarregandoComponent],
  templateUrl: './ficha-tecnica.html',
  styleUrl: './ficha-tecnica.scss',
})
export class FichaTecnica implements OnInit {
  private produtoService = inject(ProdutoService);
  private estoqueService = inject(EstoqueService);
  private fichaTecnicaService = inject(FichaTecnicaService);

  carregando = true;
  erro: string | null = null;

  produtosPreparados: Produto[] = [];
  // Só ingredientes já cadastrados no estoque podem entrar na ficha técnica.
  ingredientesDisponiveis: Estoque[] = [];

  produtoExpandidoId: number | null = null;
  itensPorProduto: Record<number, FichaTecnicaItem[]> = {};
  carregandoItens = false;

  novoIngredienteId: Record<number, number | null> = {};
  novaQuantidade: Record<number, number | null> = {};
  erroFormulario: Record<number, string | null> = {};

  itemEditandoId: number | null = null;
  quantidadeEditada: number | null = null;

  custoIngrediente = custoIngrediente;

  ngOnInit() {
    this.carregando = true;

    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtosPreparados = produtos.filter((p) => p.natureza === 'PREPARADO');
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a ficha técnica.');
        this.carregando = false;
      },
    });

    this.estoqueService.listarIngredientes().subscribe({
      next: (ingredientes) => (this.ingredientesDisponiveis = ingredientes),
      error: () => {},
    });
  }

  alternarExpansao(produto: Produto) {
    if (this.produtoExpandidoId === produto.id) {
      this.produtoExpandidoId = null;
      return;
    }

    this.produtoExpandidoId = produto.id;
    this.cancelarEdicao();
    if (!this.itensPorProduto[produto.id]) {
      this.carregarItens(produto.id);
    }
  }

  private carregarItens(produtoId: number) {
    this.carregandoItens = true;
    this.fichaTecnicaService.listar(produtoId).subscribe({
      next: (itens) => {
        this.itensPorProduto[produtoId] = itens;
        this.carregandoItens = false;
      },
      error: () => (this.carregandoItens = false),
    });
  }

  // Ingredientes que ainda não estão na ficha deste produto.
  ingredientesParaAdicionar(produtoId: number): Estoque[] {
    const jaUsados = new Set((this.itensPorProduto[produtoId] ?? []).map((i) => i.ingredienteId));
    return this.ingredientesDisponiveis.filter((e) => !jaUsados.has(e.produto.id));
  }

  custoTotal(produto: Produto): number {
    const itens = this.itensPorProduto[produto.id] ?? [];
    return itens.reduce((soma, item) => soma + custoIngrediente(item.ingrediente) * item.quantidadeUtilizada, 0);
  }

  adicionarIngrediente(produtoId: number) {
    const ingredienteId = this.novoIngredienteId[produtoId];
    const quantidadeUtilizada = this.novaQuantidade[produtoId];

    if (!ingredienteId || !quantidadeUtilizada || quantidadeUtilizada <= 0) {
      this.erroFormulario[produtoId] = 'Selecione um ingrediente e informe uma quantidade maior que zero.';
      return;
    }

    this.fichaTecnicaService.adicionar(produtoId, { ingredienteId, quantidadeUtilizada }).subscribe({
      next: (item) => {
        this.itensPorProduto[produtoId] = [...(this.itensPorProduto[produtoId] ?? []), item];
        this.novoIngredienteId[produtoId] = null;
        this.novaQuantidade[produtoId] = null;
        this.erroFormulario[produtoId] = null;
      },
      error: (erro) => {
        this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível adicionar o ingrediente.');
      },
    });
  }

  editarQuantidade(item: FichaTecnicaItem) {
    this.itemEditandoId = item.id;
    this.quantidadeEditada = item.quantidadeUtilizada;
  }

  cancelarEdicao() {
    this.itemEditandoId = null;
    this.quantidadeEditada = null;
  }

  salvarQuantidade(produtoId: number, item: FichaTecnicaItem) {
    const quantidadeUtilizada = this.quantidadeEditada;
    if (!quantidadeUtilizada || quantidadeUtilizada <= 0) {
      this.erroFormulario[produtoId] = 'Informe uma quantidade maior que zero.';
      return;
    }

    this.fichaTecnicaService
      .atualizar(produtoId, item.id, { ingredienteId: item.ingredienteId, quantidadeUtilizada })
      .subscribe({
        next: (atualizado) => {
          this.itensPorProduto[produtoId] = (this.itensPorProduto[produtoId] ?? []).map((i) =>
            i.id === atualizado.id ? atualizado : i,
          );
          this.erroFormulario[produtoId] = null;
          this.cancelarEdicao();
        },
        error: (erro) => {
          this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível alterar a quantidade.');
        },
      });
  }

  removerIngrediente(produtoId: number, itemId: number) {
    this.fichaTecnicaService.remover(produtoId, itemId).subscribe({
      next: () => {
        this.itensPorProduto[produtoId] = (this.itensPorProduto[produtoId] ?? []).filter((i) => i.id !== itemId);
      },
      error: (erro) => {
        this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível remover o ingrediente.');
      },
    });
  }
}
