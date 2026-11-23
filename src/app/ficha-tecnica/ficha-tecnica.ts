import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { EstoqueService, Ingrediente } from '../controle-estoque/estoque.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { FichaTecnicaService, VinculoProdutoIngrediente } from './ficha-tecnica.service';

interface LinhaFicha {
  ingrediente: Ingrediente;
  quantidade: number;
  custo: number;
}

interface FichaProduto {
  produto: Produto;
  linhas: LinhaFicha[];
  custo: number;
  margem: number | null;
}

@Component({
  selector: 'app-ficha-tecnica',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule, RouterLink, CarregandoComponent],
  templateUrl: './ficha-tecnica.html',
  styleUrl: './ficha-tecnica.scss',
})
export class FichaTecnica implements OnInit {
  private produtoService = inject(ProdutoService);
  private estoqueService = inject(EstoqueService);
  private fichaService = inject(FichaTecnicaService);

  carregando = signal(true);
  erro = signal<string | null>(null);
  salvando = signal(false);
  busca = signal('');
  expandidos = signal<Set<number>>(new Set());

  private produtos = signal<Produto[]>([]);
  ingredientes = signal<Ingrediente[]>([]);
  private vinculos = signal<VinculoProdutoIngrediente[]>([]);

  /** Formulário "adicionar ingrediente" por produto. */
  novoIngrediente: Record<number, { ingredienteId: number | null; quantidade: number | null }> = {};

  fichas = computed<FichaProduto[]>(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.produtos()
      .filter((produto) => !termo || produto.nome.toLowerCase().includes(termo))
      .map((produto) => {
        const linhas = this.vinculos()
          .filter((v) => v.produtoId === produto.id)
          .map((v) => {
            const ingrediente = this.ingredientes().find((i) => i.id === v.ingredienteId) ?? {
              id: v.ingredienteId,
              nome: `Ingrediente #${v.ingredienteId} (inativo)`,
              unidadeMedida: '',
              custo: 0,
            };
            return { ingrediente, quantidade: v.quantidade, custo: v.quantidade * ingrediente.custo };
          });
        const custo = linhas.reduce((soma, linha) => soma + linha.custo, 0);
        return {
          produto,
          linhas,
          custo,
          margem: produto.preco > 0 && linhas.length ? ((produto.preco - custo) / produto.preco) * 100 : null,
        };
      });
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    forkJoin({
      produtos: this.produtoService.listar(),
      ingredientes: this.estoqueService.listarIngredientes(),
      vinculos: this.fichaService.listar(),
    }).subscribe({
      next: ({ produtos, ingredientes, vinculos }) => {
        this.produtos.set(produtos);
        this.ingredientes.set(ingredientes);
        this.vinculos.set(vinculos);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a ficha técnica.'));
        this.carregando.set(false);
      },
    });
  }

  estaExpandido(produto: Produto): boolean {
    return this.expandidos().has(produto.id);
  }

  alternarExpansao(produto: Produto): void {
    this.expandidos.update((atual) => {
      const novo = new Set(atual);
      if (novo.has(produto.id)) {
        novo.delete(produto.id);
      } else {
        novo.add(produto.id);
        this.novoIngrediente[produto.id] ??= { ingredienteId: null, quantidade: null };
      }
      return novo;
    });
  }

  ingredientesDisponiveis(ficha: FichaProduto): Ingrediente[] {
    const usados = new Set(ficha.linhas.map((linha) => linha.ingrediente.id));
    return this.ingredientes().filter((ingrediente) => !usados.has(ingrediente.id));
  }

  unidadeSelecionada(produtoId: number): string {
    const id = this.novoIngrediente[produtoId]?.ingredienteId;
    return this.ingredientes().find((i) => i.id === id)?.unidadeMedida ?? '';
  }

  adicionar(produto: Produto): void {
    const novo = this.novoIngrediente[produto.id];
    const quantidade = Number(novo?.quantidade);
    if (!novo?.ingredienteId || !(quantidade > 0)) {
      this.erro.set('Selecione o ingrediente e informe uma quantidade maior que zero.');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    this.fichaService.adicionar(produto.id, [{ ingredienteId: novo.ingredienteId, quantidade }]).subscribe({
      next: () => {
        this.salvando.set(false);
        this.vinculos.update((lista) => [...lista, { produtoId: produto.id, ingredienteId: novo.ingredienteId!, quantidade }]);
        this.novoIngrediente[produto.id] = { ingredienteId: null, quantidade: null };
      },
      error: (erro) => {
        this.salvando.set(false);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível adicionar o ingrediente.'));
      },
    });
  }

  remover(produto: Produto, linha: LinhaFicha): void {
    if (!confirm(`Remover "${linha.ingrediente.nome}" da ficha de "${produto.nome}"?`)) {
      return;
    }

    this.fichaService.remover(produto.id, linha.ingrediente.id).subscribe({
      next: () =>
        this.vinculos.update((lista) =>
          lista.filter((v) => !(v.produtoId === produto.id && v.ingredienteId === linha.ingrediente.id)),
        ),
      error: (erro) => this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível remover o ingrediente.')),
    });
  }
}
