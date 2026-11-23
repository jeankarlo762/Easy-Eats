import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Estoque, EstoqueService, ItemEstoque } from './estoque.service';

type TipoMovimento = 'entrada' | 'saida';

interface Movimento {
  item: ItemEstoque;
  tipo: TipoMovimento;
}

export const UNIDADES_MEDIDA = ['un', 'kg', 'g', 'L', 'ml', 'fatia', 'folha', 'bola', 'pct'];

@Component({
  selector: 'app-controle-estoque',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './controle-estoque.html',
  styleUrls: ['./controle-estoque.scss'],
})
export class ControleEstoque implements OnInit {
  private estoqueService = inject(EstoqueService);

  itens = signal<ItemEstoque[]>([]);

  /** Unidades padrão + as que já existem nos ingredientes cadastrados na API. */
  unidades = computed(() => [
    ...new Set([...UNIDADES_MEDIDA, ...this.itens().map((item) => item.ingrediente.unidadeMedida).filter(Boolean)]),
  ]);
  carregando = signal(true);
  salvando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);
  editando = signal<ItemEstoque | null>(null);
  busca = signal('');
  somenteCriticos = signal(false);

  movimento = signal<Movimento | null>(null);
  quantidadeMovimento: number | null = null;
  movimentando = signal(false);

  form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    unidadeMedida: new FormControl('un', { nonNullable: true, validators: [Validators.required] }),
    custo: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    qtdAtual: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
    qtdMinima: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
  });

  itensFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.itens().filter(
      (item) =>
        (!termo || item.ingrediente.nome.toLowerCase().includes(termo)) &&
        (!this.somenteCriticos() || this.critico(item)),
    );
  });

  totalCriticos = computed(() => this.itens().filter((item) => this.critico(item)).length);
  valorTotal = computed(() =>
    this.itens().reduce((soma, item) => soma + (item.estoque?.qtdAtual ?? 0) * item.ingrediente.custo, 0),
  );

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando.set(true);
    this.estoqueService.listarItens().subscribe({
      next: (itens) => {
        this.itens.set(itens);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o estoque.'));
        this.carregando.set(false);
      },
    });
  }

  critico(item: ItemEstoque): boolean {
    return !!item.estoque && item.estoque.abaixoDoMinimo;
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const ingrediente = {
      nome: valores.nome.trim(),
      unidadeMedida: valores.unidadeMedida,
      custo: Number(valores.custo ?? 0),
    };
    const qtdAtual = Number(valores.qtdAtual ?? 0);
    const qtdMinima = Number(valores.qtdMinima ?? 0);
    const editando = this.editando();

    this.salvando.set(true);
    this.erro.set(null);

    const requisicao: Observable<unknown> = editando
      ? this.estoqueService.atualizarIngrediente(editando.ingrediente.id, ingrediente).pipe(
          switchMap(() => this.salvarEstoque(editando.ingrediente.id, editando.estoque, qtdAtual, qtdMinima)),
        )
      : this.estoqueService
          .criarIngrediente(ingrediente)
          .pipe(switchMap((criado) => this.estoqueService.criarEstoque(criado.id, qtdAtual, qtdMinima)));

    requisicao.subscribe({
      next: () => {
        this.salvando.set(false);
        this.mostrarSucesso(editando ? `"${ingrediente.nome}" atualizado.` : `"${ingrediente.nome}" cadastrado.`);
        this.cancelarEdicao();
        this.carregar();
      },
      error: (erro) => {
        this.salvando.set(false);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível salvar o ingrediente.'));
        // o ingrediente pode ter sido salvo mesmo se o estoque falhou
        this.carregar();
      },
    });
  }

  /** Cria o estoque se ainda não existir; senão altera só o mínimo (se mudou). */
  private salvarEstoque(
    idIngrediente: number,
    estoque: Estoque | null,
    qtdAtual: number,
    qtdMinima: number,
  ): Observable<unknown> {
    if (!estoque) {
      return this.estoqueService.criarEstoque(idIngrediente, qtdAtual, qtdMinima);
    }
    return estoque.qtdMinima !== qtdMinima ? this.estoqueService.alterarMinimo(estoque, qtdMinima) : of(null);
  }

  editar(item: ItemEstoque) {
    this.editando.set(item);
    this.form.setValue({
      nome: item.ingrediente.nome,
      unidadeMedida: item.ingrediente.unidadeMedida,
      custo: item.ingrediente.custo,
      qtdAtual: item.estoque?.qtdAtual ?? 0,
      qtdMinima: item.estoque?.qtdMinima ?? 0,
    });
    // a quantidade atual só muda por entrada/saída
    if (item.estoque) {
      this.form.controls.qtdAtual.disable();
    } else {
      this.form.controls.qtdAtual.enable();
    }
  }

  cancelarEdicao() {
    this.editando.set(null);
    this.form.controls.qtdAtual.enable();
    this.form.reset({ nome: '', unidadeMedida: 'un', custo: null, qtdAtual: 0, qtdMinima: 0 });
  }

  excluir(item: ItemEstoque) {
    if (!confirm(`Excluir o ingrediente "${item.ingrediente.nome}"?`)) {
      return;
    }

    this.estoqueService.excluirIngrediente(item.ingrediente.id).subscribe({
      next: () => {
        this.mostrarSucesso(`"${item.ingrediente.nome}" excluído.`);
        if (this.editando()?.ingrediente.id === item.ingrediente.id) this.cancelarEdicao();
        this.carregar();
      },
      error: (erro) =>
        this.erro.set(
          MensagemErroApiUtil.extrair(
            erro,
            'Não foi possível excluir. Verifique se o ingrediente está na ficha técnica de algum produto.',
          ),
        ),
    });
  }

  // ------------------------------------------------------------ movimento
  abrirMovimento(item: ItemEstoque, tipo: TipoMovimento) {
    this.movimento.set({ item, tipo });
    this.quantidadeMovimento = null;
  }

  fecharMovimento() {
    this.movimento.set(null);
  }

  confirmarMovimento() {
    const movimento = this.movimento();
    const quantidade = Number(this.quantidadeMovimento);
    if (!movimento || !(quantidade > 0)) {
      return;
    }

    const { item, tipo } = movimento;
    const requisicao = !item.estoque
      ? this.estoqueService.criarEstoque(item.ingrediente.id, quantidade, 0)
      : tipo === 'entrada'
        ? this.estoqueService.registrarEntrada(item.estoque.id, quantidade)
        : this.estoqueService.registrarSaida(item.estoque.id, quantidade);

    this.movimentando.set(true);
    requisicao.subscribe({
      next: () => {
        this.movimentando.set(false);
        this.movimento.set(null);
        this.mostrarSucesso(
          `${tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${quantidade} ${item.ingrediente.unidadeMedida} em "${item.ingrediente.nome}" registrada.`,
        );
        this.carregar();
      },
      error: (erro) => {
        this.movimentando.set(false);
        this.movimento.set(null);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível registrar a movimentação.'));
      },
    });
  }

  private mostrarSucesso(mensagem: string) {
    this.sucesso.set(mensagem);
    setTimeout(() => this.sucesso.set(null), 4000);
  }
}
