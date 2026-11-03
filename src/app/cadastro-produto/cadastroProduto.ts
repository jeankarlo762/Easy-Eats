import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToggleSwitchComponent } from '../../components/toggle-switch/toggle-switch';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { ModalCadastroProduto } from '../../components/modal-cadastro-produto/modal-cadastro-produto';
import { Adicional, AdicionalService } from './adicional.service';
import { Categoria, CategoriaService } from '../categorias/categoria.service';
import { ComposicaoItem, ComposicaoItemService } from './composicao-item.service';
import { NaturezaProduto, Produto, ProdutoPayload, ProdutoService, UnidadeMedida } from './produto.service';
import { FichaTecnicaService } from '../ficha-tecnica/ficha-tecnica.service';
import { Ingrediente, IngredienteService } from '../ingredientes/ingrediente.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Observable, of, switchMap } from 'rxjs';

const NATUREZAS: { valor: NaturezaProduto; label: string }[] = [
  { valor: 'PREPARADO', label: 'Preparado/montado (ex.: X-Burger)' },
  { valor: 'REVENDA', label: 'Revenda (ex.: refrigerante lacrado)' },
  { valor: 'INSUMO', label: 'Insumo/matéria-prima (ex.: pão, queijo)' },
];

// Linha da ficha técnica sendo montada no formulário do produto: só é
// persistida (PUT /produtos/{id}/ficha-tecnica) quando o produto é salvo.
export interface LinhaFichaTecnica {
  ingredienteId: number;
  ingredienteNome: string;
  unidadeMedida: UnidadeMedida | null;
  custoUnitario: number;
  quantidadeUtilizada: number | null;
}

@Component({
  selector: 'app-cadastro-produto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ToggleSwitchComponent,
    CarregandoComponent,
    ModalCadastroProduto,
  ],
  templateUrl: './cadastroProduto.html',
  styleUrls: ['./cadastroProduto.scss'],
})
export class CadastroProdutoComponent implements OnInit {
  naturezas = NATUREZAS;
  categorias: Categoria[] = [];
  produtos: Produto[] = [];

  carregando = true;
  enviando = false;
  erro: string | null = null;

  produtoParaConfirmar: Produto | null = null;

  editandoId: number | null = null;
  carregandoFicha = false;
  mostrarInativos = false;

  ingredientes: Ingrediente[] = [];
  fichaTecnica: LinhaFichaTecnica[] = [];
  novoIngredienteId: number | null = null;
  novaQuantidadeUtilizada: number | null = null;
  erroFicha: string | null = null;

  form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: Validators.required }),
    descricao: new FormControl('', { nonNullable: true }),
    categoriaId: new FormControl<number | null>(null, Validators.required),
    natureza: new FormControl<NaturezaProduto | null>(null, Validators.required),
    preco: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    custo: new FormControl<number | null>(null, Validators.min(0)),
    flAtivo: new FormControl(true, { nonNullable: true }),
  });

  produtoExpandidoId: number | null = null;
  composicaoPorProduto: Record<number, ComposicaoItem[]> = {};
  adicionaisPorProduto: Record<number, Adicional[]> = {};
  carregandoDetalhes = false;

  novoItemComposicaoNome = '';
  novoAdicionalNome = '';
  novoAdicionalPreco: number | null = null;

  constructor(
    private produtoService: ProdutoService,
    private categoriaService: CategoriaService,
    private composicaoItemService: ComposicaoItemService,
    private adicionalService: AdicionalService,
    private ingredienteService: IngredienteService,
    private fichaTecnicaService: FichaTecnicaService,
  ) {}

  ngOnInit() {
    this.categoriaService.listar().subscribe({
      next: (categorias) => (this.categorias = categorias),
      error: () => {},
    });
    this.ingredienteService.listar().subscribe({
      next: (ingredientes) => (this.ingredientes = ingredientes),
      error: () => {},
    });
    this.carregarProdutos();
  }

  private carregarProdutos() {
    this.carregando = true;
    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar os produtos cadastrados.';
        this.carregando = false;
      },
    });
  }

  // Excluir desativa o produto (o histórico de vendas continua apontando para
  // ele); por padrão a lista mostra só os ativos.
  get produtosVisiveis(): Produto[] {
    return this.mostrarInativos ? this.produtos : this.produtos.filter((p) => p.flAtivo !== false);
  }

  // A ficha técnica só se aplica a produtos preparados/montados.
  get exibeFichaTecnica(): boolean {
    return this.form.controls.natureza.value === 'PREPARADO';
  }

  get ingredientesParaAdicionar(): Ingrediente[] {
    const usados = new Set(this.fichaTecnica.map((l) => l.ingredienteId));
    return this.ingredientes.filter((i) => !usados.has(i.id));
  }

  get custoFichaTecnica(): number {
    return this.fichaTecnica.reduce((soma, l) => soma + l.custoUnitario * (l.quantidadeUtilizada ?? 0), 0);
  }

  adicionarIngredienteNaFicha() {
    const ingrediente = this.ingredientes.find((i) => i.id === this.novoIngredienteId);
    const quantidade = this.novaQuantidadeUtilizada;

    if (!ingrediente || !quantidade || quantidade <= 0) {
      this.erroFicha = 'Selecione um ingrediente e informe uma quantidade maior que zero.';
      return;
    }

    this.fichaTecnica = [
      ...this.fichaTecnica,
      {
        ingredienteId: ingrediente.id,
        ingredienteNome: ingrediente.nome,
        unidadeMedida: ingrediente.unidadeMedida,
        custoUnitario: ingrediente.custo ?? 0,
        quantidadeUtilizada: quantidade,
      },
    ];
    this.novoIngredienteId = null;
    this.novaQuantidadeUtilizada = null;
    this.erroFicha = null;
  }

  removerIngredienteDaFicha(ingredienteId: number) {
    this.fichaTecnica = this.fichaTecnica.filter((l) => l.ingredienteId !== ingredienteId);
  }

  salvar() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.exibeFichaTecnica && this.fichaTecnica.some((l) => !l.quantidadeUtilizada || l.quantidadeUtilizada <= 0)) {
      this.erroFicha = 'Informe uma quantidade maior que zero para todos os ingredientes da ficha técnica.';
      return;
    }

    const valores = this.form.getRawValue();
    const editandoProduto = this.produtos.find((p) => p.id === this.editandoId);
    const payload: ProdutoPayload = {
      nome: valores.nome,
      descricao: valores.descricao || null,
      preco: valores.preco!,
      custo: valores.custo,
      flAtivo: valores.flAtivo,
      natureza: valores.natureza!,
      categoria: { id: valores.categoriaId! },
    };

    this.enviando = true;
    this.erro = null;
    this.erroFicha = null;

    const operacao =
      this.editandoId !== null
        ? this.produtoService.atualizar(this.editandoId, payload)
        : this.produtoService.criar(payload);

    let produtoSalvo: Produto | null = null;

    operacao
      .pipe(
        switchMap((produto) => {
          produtoSalvo = produto;
          return this.salvarFichaTecnica(produto);
        }),
      )
      .subscribe({
        next: () => {
          this.enviando = false;
          const produto = produtoSalvo!;
          if (editandoProduto) {
            this.produtos = this.produtos.map((p) => (p.id === produto.id ? produto : p));
          } else {
            this.produtos = [produto, ...this.produtos];
            this.produtoParaConfirmar = produto;
          }
          this.cancelarEdicao();
        },
        error: (erro) => {
          this.enviando = false;
          if (produtoSalvo) {
            // O produto foi gravado mas a ficha não: mantém o formulário em
            // edição desse produto para o usuário corrigir e salvar de novo.
            const produto: Produto = produtoSalvo;
            if (!this.produtos.some((p) => p.id === produto.id)) {
              this.produtos = [produto, ...this.produtos];
            }
            this.editandoId = produto.id;
            this.erroFicha = MensagemErroApiUtil.extrair(
              erro,
              'O produto foi salvo, mas não foi possível salvar a ficha técnica.',
            );
            return;
          }
          this.erro = MensagemErroApiUtil.extrair(
            erro,
            'Não foi possível salvar o produto. Verifique os dados e tente novamente.',
          );
        },
      });
  }

  private salvarFichaTecnica(produto: Produto): Observable<unknown> {
    if (produto.natureza !== 'PREPARADO') {
      return of(null);
    }
    return this.fichaTecnicaService.substituir(
      produto.id,
      this.fichaTecnica.map((l) => ({ ingredienteId: l.ingredienteId, quantidadeUtilizada: l.quantidadeUtilizada! })),
    );
  }

  editar(produto: Produto) {
    this.editandoId = produto.id;
    this.erro = null;
    this.erroFicha = null;
    this.form.setValue({
      nome: produto.nome,
      descricao: produto.descricao ?? '',
      categoriaId: produto.categoria?.id ?? null,
      natureza: produto.natureza,
      preco: produto.preco,
      custo: produto.custo,
      flAtivo: produto.flAtivo ?? true,
    });

    this.fichaTecnica = [];
    this.carregandoFicha = true;
    this.fichaTecnicaService.listar(produto.id).subscribe({
      next: (itens) => {
        this.fichaTecnica = itens.map((item) => ({
          ingredienteId: item.ingredienteId,
          ingredienteNome: item.ingredienteNome,
          unidadeMedida: item.unidadeMedida,
          custoUnitario: item.custoUnitario,
          quantidadeUtilizada: item.quantidadeUtilizada,
        }));
        this.carregandoFicha = false;
      },
      error: (erro) => {
        this.carregandoFicha = false;
        this.erroFicha = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a ficha técnica do produto.');
      },
    });

    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.fichaTecnica = [];
    this.novoIngredienteId = null;
    this.novaQuantidadeUtilizada = null;
    this.erroFicha = null;
    this.form.reset({ flAtivo: true, descricao: '' });
  }

  excluir(produto: Produto) {
    if (!confirm(`Excluir o produto "${produto.nome}"? Ele será desativado e deixará de aparecer nas vendas.`)) {
      return;
    }

    this.erro = null;
    this.produtoService.excluir(produto.id).subscribe({
      next: () => {
        this.produtos = this.produtos.map((p) => (p.id === produto.id ? { ...p, flAtivo: false } : p));
        if (this.editandoId === produto.id) {
          this.cancelarEdicao();
        }
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir o produto.');
      },
    });
  }

  unidade(unidadeMedida: UnidadeMedida | null): string {
    return unidadeMedida?.toLowerCase() ?? '';
  }

  fecharModalConfirmacao() {
    this.produtoParaConfirmar = null;
  }

  get exibeComposicao(): boolean {
    const produto = this.produtos.find((p) => p.id === this.produtoExpandidoId);
    return produto?.natureza === 'PREPARADO';
  }

  get exibeAdicionais(): boolean {
    const produto = this.produtos.find((p) => p.id === this.produtoExpandidoId);
    return produto?.natureza === 'PREPARADO' || produto?.natureza === 'REVENDA';
  }

  alternarExpandir(produto: Produto) {
    if (this.produtoExpandidoId === produto.id) {
      this.produtoExpandidoId = null;
      return;
    }

    this.produtoExpandidoId = produto.id;
    this.novoItemComposicaoNome = '';
    this.novoAdicionalNome = '';
    this.novoAdicionalPreco = null;
    this.carregarDetalhes(produto.id);
  }

  private carregarDetalhes(produtoId: number) {
    this.carregandoDetalhes = true;
    this.composicaoItemService.listar(produtoId).subscribe({
      next: (itens) => {
        this.composicaoPorProduto[produtoId] = itens;
        this.carregandoDetalhes = false;
      },
      error: () => (this.carregandoDetalhes = false),
    });
    this.adicionalService.listar(produtoId).subscribe({
      next: (adicionais) => (this.adicionaisPorProduto[produtoId] = adicionais),
      error: () => {},
    });
  }

  adicionarItemComposicao(produtoId: number) {
    const nome = this.novoItemComposicaoNome.trim();
    if (!nome) return;

    this.composicaoItemService.criar(produtoId, { nome, removivel: true }).subscribe({
      next: (item) => {
        this.composicaoPorProduto[produtoId] = [...(this.composicaoPorProduto[produtoId] ?? []), item];
        this.novoItemComposicaoNome = '';
      },
    });
  }

  excluirItemComposicao(produtoId: number, itemId: number) {
    this.composicaoItemService.excluir(produtoId, itemId).subscribe({
      next: () => {
        this.composicaoPorProduto[produtoId] = (this.composicaoPorProduto[produtoId] ?? []).filter(
          (i) => i.id !== itemId,
        );
      },
    });
  }

  adicionarAdicional(produtoId: number) {
    const nome = this.novoAdicionalNome.trim();
    if (!nome || this.novoAdicionalPreco === null || this.novoAdicionalPreco < 0) return;

    this.adicionalService.criar(produtoId, { nome, preco: this.novoAdicionalPreco }).subscribe({
      next: (adicional) => {
        this.adicionaisPorProduto[produtoId] = [...(this.adicionaisPorProduto[produtoId] ?? []), adicional];
        this.novoAdicionalNome = '';
        this.novoAdicionalPreco = null;
      },
    });
  }

  excluirAdicional(produtoId: number, adicionalId: number) {
    this.adicionalService.excluir(produtoId, adicionalId).subscribe({
      next: () => {
        this.adicionaisPorProduto[produtoId] = (this.adicionaisPorProduto[produtoId] ?? []).filter(
          (a) => a.id !== adicionalId,
        );
      },
    });
  }
}
