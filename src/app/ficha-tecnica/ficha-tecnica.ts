import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
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
  private fichaTecnicaService = inject(FichaTecnicaService);

  carregando = true;
  erro: string | null = null;

  produtosPreparados: Produto[] = [];
  insumosDisponiveis: Produto[] = [];

  produtoExpandidoId: number | null = null;
  itensPorProduto: Record<number, FichaTecnicaItem[]> = {};
  carregandoItens = false;

  novoInsumoId: Record<number, number | null> = {};
  novaQuantidade: Record<number, number | null> = {};
  erroFormulario: Record<number, string | null> = {};

  ngOnInit() {
    this.carregando = true;

    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtosPreparados = produtos.filter((p) => p.natureza === 'PREPARADO');
        this.insumosDisponiveis = produtos.filter((p) => p.natureza === 'INSUMO');
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a ficha técnica.');
        this.carregando = false;
      },
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
        this.carregandoItens = false;
      },
      error: () => (this.carregandoItens = false),
    });
  }

  custoTotal(produto: Produto): number {
    const itens = this.itensPorProduto[produto.id] ?? [];
    return itens.reduce((soma, item) => soma + (item.insumo.custo ?? 0) * item.quantidade, 0);
  }

  adicionarInsumo(produtoId: number) {
    const insumoId = this.novoInsumoId[produtoId];
    const quantidade = this.novaQuantidade[produtoId];

    if (!insumoId || !quantidade || quantidade <= 0) {
      this.erroFormulario[produtoId] = 'Selecione um insumo e informe uma quantidade maior que zero.';
      return;
    }

    this.fichaTecnicaService.adicionar(produtoId, { insumoId, quantidade }).subscribe({
      next: (item) => {
        this.itensPorProduto[produtoId] = [...(this.itensPorProduto[produtoId] ?? []), item];
        this.novoInsumoId[produtoId] = null;
        this.novaQuantidade[produtoId] = null;
        this.erroFormulario[produtoId] = null;
      },
      error: (erro) => {
        this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível adicionar o insumo.');
      },
    });
  }

  removerInsumo(produtoId: number, itemId: number) {
    this.fichaTecnicaService.remover(produtoId, itemId).subscribe({
      next: () => {
        this.itensPorProduto[produtoId] = (this.itensPorProduto[produtoId] ?? []).filter((i) => i.id !== itemId);
      },
      error: (erro) => {
        this.erroFormulario[produtoId] = MensagemErroApiUtil.extrair(erro, 'Não foi possível remover o insumo.');
      },
    });
  }
}
