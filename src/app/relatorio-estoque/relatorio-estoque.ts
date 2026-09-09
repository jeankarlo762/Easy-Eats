import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Estoque, EstoqueService, ItemMaisConsumido } from '../controle-estoque/estoque.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

interface CategoriaEstoque {
  categoria: string;
  quantidadeItens: number;
}

@Component({
  selector: 'app-relatorio-estoque',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './relatorio-estoque.html',
  styleUrl: './relatorio-estoque.scss',
})
export class RelatorioEstoque implements OnInit {
  private estoqueService = inject(EstoqueService);

  estoques: Estoque[] = [];
  itensMaisConsumidos: ItemMaisConsumido[] = [];
  carregando = true;
  erro: string | null = null;

  ngOnInit() {
    this.carregando = true;

    this.estoqueService.listar().subscribe({
      next: (estoques) => {
        this.estoques = estoques;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o relatório de estoque.');
        this.carregando = false;
      },
    });

    this.estoqueService.listarMaisConsumidos().subscribe({
      next: (itens) => (this.itensMaisConsumidos = itens),
      error: () => {},
    });
  }

  get totalItens(): number {
    return this.estoques.length;
  }

  get itensCriticos(): number {
    return this.estoques.filter((e) => e.quantidadeAtual < e.estoqueMinimo).length;
  }

  get valorTotalEstoque(): number {
    return this.estoques.reduce((soma, e) => soma + e.quantidadeAtual * e.produto.preco, 0);
  }

  get estoquePorCategoria(): CategoriaEstoque[] {
    const contagem = new Map<string, number>();
    for (const estoque of this.estoques) {
      const nome = estoque.produto.categoria?.nome ?? 'Sem categoria';
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    return Array.from(contagem.entries())
      .map(([categoria, quantidadeItens]) => ({ categoria, quantidadeItens }))
      .sort((a, b) => b.quantidadeItens - a.quantidadeItens);
  }
}
