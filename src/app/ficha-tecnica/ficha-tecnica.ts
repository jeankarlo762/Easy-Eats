import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { Ingrediente, IngredienteService } from '../ingredientes/ingrediente.service';
import { FichaTecnicaItem, FichaTecnicaService } from './ficha-tecnica.service';
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
  private ingredienteService = inject(IngredienteService);
  private fichaTecnicaService = inject(FichaTecnicaService);

  carregando = true;
  erro: string | null = null;

  produtosPreparados: Produto[] = [];
  ingredientesDisponiveis: Ingrediente[] = [];

  produtoExpandidoId: number | null = null;
  itensPorProduto: Record<number, FichaTecnicaItem[]> = {};
  carregandoItens = false;

  novoIngredienteId: Record<number, number | null> = {};
  novaQuantidade: Record<number, number | null> = {};
  quantidadeEditada: Record<number, number | null> = {};
  erroFormulario: Record<number, string | null> = {};

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

    this.ingredienteService.listar().subscribe({
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
    if (!this.itensPorProduto[produto.id]) {
      this.carregarItens(produto.id);
    }
  }

  private carregarItens(produtoId: number) {
    this.carregandoItens = true;
    this.fichaTecnicaService.listar(produtoId).subscribe({
      next: (itens) => {
        this.itensPorProduto[produtoId] = itens;
        itens.forEach((item) => (this.quantidadeEditada[item.id] = item.quantidadeUtilizada));
        this.carregandoItens = false;
      },
      error: () => (this.carregandoItens = false),
    });
  }

  custoTotal(produto: Produto): number {
    const itens = this.itensPorProduto[produto.id] ?? [];
    return itens.reduce((soma, item) => soma + item.custoTotal, 0);
  }

  // Ingredientes que ainda não estão na ficha do produto (um ingrediente aparece uma vez por ficha).
  ingredientesParaAdicionar(produtoId: number): Ingrediente[] {
    const usados = new Set((this.itensPorProduto[produtoId] ?? []).map((i) => i.ingredienteId));
    return this.ingredientesDisponiveis.filter((i) => !usados.has(i.id));
  }

  unidade(item: FichaTecnicaItem): string {
    return item.unidadeMedida?.toLowerCase() ?? '';
  }

  quantidadeAlterada(item: FichaTecnicaItem): boolean {
    return this.quantidadeEditada[item.id] !== item.quantidadeUtilizada;
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
        this.quantidadeEditada[item.id] = item.quantidadeUtilizada;
        this.novoIngredienteId[produtoId] = null;
        this.novaQuantidade[produtoId] = null;
        this.erroFormulario[produtoId] = null;
      },
      error: (erro) => {
        this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível adicionar o ingrediente.');
      },
    });
  }

  salvarQuantidade(produtoId: number, item: FichaTecnicaItem) {
    const quantidadeUtilizada = this.quantidadeEditada[item.id];
    if (!quantidadeUtilizada || quantidadeUtilizada <= 0) {
      this.erroFormulario[produtoId] = 'A quantidade utilizada deve ser maior que zero.';
      return;
    }

    this.fichaTecnicaService
      .atualizar(produtoId, item.id, { ingredienteId: item.ingredienteId, quantidadeUtilizada })
      .subscribe({
        next: (atualizado) => {
          this.itensPorProduto[produtoId] = (this.itensPorProduto[produtoId] ?? []).map((i) =>
            i.id === atualizado.id ? atualizado : i,
          );
          this.quantidadeEditada[atualizado.id] = atualizado.quantidadeUtilizada;
          this.erroFormulario[produtoId] = null;
        },
        error: (erro) => {
          this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível atualizar a quantidade.');
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
