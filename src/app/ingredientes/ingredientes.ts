import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { UNIDADES_MEDIDA, UnidadeMedida } from '../cadastro-produto/produto.service';
import { Estoque, EstoqueService } from '../controle-estoque/estoque.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

/**
 * Cadastro de ingredientes: produto INSUMO + registro de estoque, gravados
 * juntos pela API. São estes ingredientes que a ficha técnica dos produtos
 * pode usar. O saldo só é informado na criação; depois muda por movimentação
 * (Itens em Estoque), para o saldo bater com o histórico.
 */
@Component({
  selector: 'app-ingredientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './ingredientes.html',
  styleUrls: ['./ingredientes.scss'],
})
export class Ingredientes implements OnInit {
  private fb = inject(FormBuilder);
  private estoqueService = inject(EstoqueService);

  unidades = UNIDADES_MEDIDA;
  ingredientes: Estoque[] = [];

  carregando = true;
  enviando = false;
  erro: string | null = null;
  sucesso: string | null = null;

  editandoId: number | null = null;

  form = this.fb.group({
    nome: ['', Validators.required],
    unidadeMedida: [null as UnidadeMedida | null, Validators.required],
    custo: [null as number | null, Validators.min(0)],
    quantidadeAtual: [0 as number | null, [Validators.required, Validators.min(0)]],
    estoqueMinimo: [0 as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando = true;
    this.estoqueService.listarIngredientes().subscribe({
      next: (ingredientes) => {
        this.ingredientes = ingredientes;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os ingredientes.');
        this.carregando = false;
      },
    });
  }

  get estoqueBaixo(): number {
    return this.ingredientes.filter((e) => e.quantidadeAtual < e.estoqueMinimo).length;
  }

  unidade(estoque: Estoque): string {
    return (estoque.produto.unidadeMedida ?? 'UN').toLowerCase();
  }

  salvar() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const payload = {
      nome: valores.nome!.trim(),
      unidadeMedida: valores.unidadeMedida!,
      custo: valores.custo,
      quantidadeAtual: valores.quantidadeAtual,
      estoqueMinimo: valores.estoqueMinimo!,
    };

    this.enviando = true;
    this.erro = null;
    this.sucesso = null;

    const requisicao$ = this.editandoId
      ? this.estoqueService.atualizarIngrediente(this.editandoId, payload)
      : this.estoqueService.criarIngrediente(payload);

    requisicao$.subscribe({
      next: (salvo) => {
        this.enviando = false;
        const existe = this.ingredientes.some((e) => e.produto.id === salvo.produto.id);
        this.ingredientes = existe
          ? this.ingredientes.map((e) => (e.produto.id === salvo.produto.id ? salvo : e))
          : [...this.ingredientes, salvo].sort((a, b) => a.produto.nome.localeCompare(b.produto.nome));
        this.sucesso = existe ? `"${salvo.produto.nome}" atualizado.` : `"${salvo.produto.nome}" cadastrado.`;
        this.cancelarEdicao();
      },
      error: (erro) => {
        this.enviando = false;
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível salvar o ingrediente.');
      },
    });
  }

  editar(estoque: Estoque) {
    this.editandoId = estoque.produto.id;
    this.erro = null;
    this.sucesso = null;
    this.form.reset({
      nome: estoque.produto.nome,
      unidadeMedida: estoque.produto.unidadeMedida ?? 'UN',
      custo: estoque.produto.custo ?? estoque.produto.preco ?? null,
      quantidadeAtual: estoque.quantidadeAtual,
      estoqueMinimo: estoque.estoqueMinimo,
    });
    // Saldo só muda por movimentação depois do cadastro.
    this.form.controls.quantidadeAtual.disable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form.controls.quantidadeAtual.enable();
    this.form.reset({ nome: '', unidadeMedida: null, custo: null, quantidadeAtual: 0, estoqueMinimo: 0 });
  }

  excluir(estoque: Estoque) {
    if (!confirm(`Excluir o ingrediente "${estoque.produto.nome}"? Ele sai do estoque; o histórico de movimentações é mantido.`)) {
      return;
    }

    this.erro = null;
    this.sucesso = null;
    this.estoqueService.removerIngrediente(estoque.produto.id).subscribe({
      next: () => {
        this.ingredientes = this.ingredientes.filter((e) => e.produto.id !== estoque.produto.id);
        if (this.editandoId === estoque.produto.id) this.cancelarEdicao();
        this.sucesso = `"${estoque.produto.nome}" foi excluído.`;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir o ingrediente.');
      },
    });
  }
}
