import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Estoque, EstoqueService, ItemMaisConsumido } from '../controle-estoque/estoque.service';
import { NaturezaProduto, Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

interface ContagemPorGrupo {
  grupo: string;
  quantidade: number;
}

interface LinhaRelatorioProduto {
  produto: Produto;
  estoque: Estoque | null;
  margem: number | null;
}

type SituacaoEstoque = 'OK' | 'BAIXO' | 'SEM_CONTROLE' | 'NAO_SE_APLICA';

const LABEL_NATUREZA: Record<NaturezaProduto, string> = {
  PREPARADO: 'Preparado',
  REVENDA: 'Revenda',
  INSUMO: 'Insumo',
};

/**
 * Relatório do módulo Produto: junta a visão de catálogo (preço, custo,
 * margem, natureza) com a de estoque (quantidade, mínimo, consumo), que
 * antes ficava num relatório separado no menu Estoque.
 */
@Component({
  selector: 'app-relatorio-estoque',
  standalone: true,
  imports: [CommonModule, FormsModule, CarregandoComponent],
  templateUrl: './relatorio-estoque.html',
  styleUrl: './relatorio-estoque.scss',
})
export class RelatorioEstoque implements OnInit {
  private estoqueService = inject(EstoqueService);
  private produtoService = inject(ProdutoService);

  produtos: Produto[] = [];
  estoques: Estoque[] = [];
  itensMaisConsumidos: ItemMaisConsumido[] = [];
  carregando = true;
  erro: string | null = null;

  busca = '';
  filtroSituacao: SituacaoEstoque | '' = '';

  private pendentes = 0;

  ngOnInit() {
    this.carregando = true;
    this.pendentes = 2;

    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
        this.concluir();
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os produtos do relatório.');
        this.concluir();
      },
    });

    this.estoqueService.listar().subscribe({
      next: (estoques) => {
        this.estoques = estoques;
        this.concluir();
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o relatório de estoque.');
        this.concluir();
      },
    });

    this.estoqueService.listarMaisConsumidos().subscribe({
      next: (itens) => (this.itensMaisConsumidos = itens),
      error: () => {},
    });
  }

  private concluir() {
    this.pendentes--;
    if (this.pendentes <= 0) this.carregando = false;
  }

  // ---------- Produtos ----------

  get totalProdutos(): number {
    return this.produtos.length;
  }

  get produtosAtivos(): number {
    return this.produtos.filter((p) => p.flAtivo).length;
  }

  get margemMedia(): number | null {
    const margens = this.produtos.map((p) => this.margem(p)).filter((m): m is number => m !== null);
    if (margens.length === 0) return null;
    return margens.reduce((soma, m) => soma + m, 0) / margens.length;
  }

  get produtosPorNatureza(): ContagemPorGrupo[] {
    return this.agrupar(this.produtos, (p) => (p.natureza ? LABEL_NATUREZA[p.natureza] : 'Sem natureza'));
  }

  get produtosPorCategoria(): ContagemPorGrupo[] {
    return this.agrupar(this.produtos, (p) => p.categoria?.nome ?? 'Sem categoria');
  }

  margem(produto: Produto): number | null {
    if (!produto.custo || produto.custo <= 0 || !produto.preco) return null;
    return ((produto.preco - produto.custo) / produto.preco) * 100;
  }

  // ---------- Estoque (só insumos, como na aba Estoque) ----------

  private ehInsumo(produtoId: number, natureza?: string | null): boolean {
    const produto = this.produtos.find((p) => p.id === produtoId);
    return (produto?.natureza ?? natureza) === 'INSUMO';
  }

  get estoquesInsumo(): Estoque[] {
    return this.estoques.filter((e) => this.ehInsumo(e.produto.id, e.produto.natureza));
  }

  get totalItens(): number {
    return this.estoquesInsumo.length;
  }

  get itensCriticos(): number {
    return this.estoquesInsumo.filter((e) => e.quantidadeAtual < e.estoqueMinimo).length;
  }

  get valorTotalEstoque(): number {
    // Valor do insumo parado = quantidade x custo (cai no preço quando o custo não foi informado).
    return this.estoquesInsumo.reduce((soma, e) => {
      const produto = this.produtos.find((p) => p.id === e.produto.id);
      const valorUnitario = produto?.custo ?? e.produto.preco;
      return soma + e.quantidadeAtual * valorUnitario;
    }, 0);
  }

  get insumosSemControle(): number {
    const ids = new Set(this.estoquesInsumo.map((e) => e.produto.id));
    return this.produtos.filter((p) => p.natureza === 'INSUMO' && !ids.has(p.id)).length;
  }

  get insumosMaisConsumidos(): ItemMaisConsumido[] {
    const nomesInsumo = new Set(this.produtos.filter((p) => p.natureza === 'INSUMO').map((p) => p.nome));
    return this.itensMaisConsumidos.filter((i) => nomesInsumo.has(i.nomeProduto));
  }

  get estoquePorCategoria(): ContagemPorGrupo[] {
    return this.agrupar(this.estoquesInsumo, (e) => e.produto.categoria?.nome ?? 'Sem categoria');
  }

  // ---------- Tabela consolidada ----------

  get linhas(): LinhaRelatorioProduto[] {
    const estoquePorProduto = new Map(this.estoquesInsumo.map((e) => [e.produto.id, e]));
    const termo = this.busca.trim().toLowerCase();

    return this.produtos
      .map((produto) => ({
        produto,
        estoque: estoquePorProduto.get(produto.id) ?? null,
        margem: this.margem(produto),
      }))
      .filter((linha) => !termo || linha.produto.nome.toLowerCase().includes(termo))
      .filter((linha) => !this.filtroSituacao || this.situacao(linha) === this.filtroSituacao)
      .sort((a, b) => a.produto.nome.localeCompare(b.produto.nome));
  }

  situacao(linha: LinhaRelatorioProduto): SituacaoEstoque {
    if (linha.produto.natureza !== 'INSUMO') return 'NAO_SE_APLICA';
    if (!linha.estoque) return 'SEM_CONTROLE';
    return linha.estoque.quantidadeAtual < linha.estoque.estoqueMinimo ? 'BAIXO' : 'OK';
  }

  labelNatureza(natureza: NaturezaProduto | null): string {
    return natureza ? LABEL_NATUREZA[natureza] : '—';
  }

  private agrupar<T>(itens: T[], chave: (item: T) => string): ContagemPorGrupo[] {
    const contagem = new Map<string, number>();
    for (const item of itens) {
      const grupo = chave(item);
      contagem.set(grupo, (contagem.get(grupo) ?? 0) + 1);
    }
    return Array.from(contagem.entries())
      .map(([grupo, quantidade]) => ({ grupo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }
}
