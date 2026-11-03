import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { UnidadeMedida } from '../cadastro-produto/produto.service';
import { Categoria, CategoriaService } from '../categorias/categoria.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Ingrediente, IngredienteService, UNIDADES_MEDIDA } from './ingrediente.service';

@Component({
  selector: 'app-ingredientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './ingredientes.html',
  styleUrl: './ingredientes.scss',
})
export class Ingredientes implements OnInit {
  private fb = inject(FormBuilder);
  private ingredienteService = inject(IngredienteService);
  private categoriaService = inject(CategoriaService);

  unidades = UNIDADES_MEDIDA;
  ingredientes: Ingrediente[] = [];
  categorias: Categoria[] = [];

  carregando = true;
  enviando = false;
  erro: string | null = null;
  sucesso = false;

  editandoId: number | null = null;

  form = this.fb.group({
    nome: ['', Validators.required],
    unidadeMedida: [null as UnidadeMedida | null, Validators.required],
    custo: [null as number | null, Validators.min(0)],
    categoriaId: [null as number | null],
    quantidadeEstoque: [0 as number | null, [Validators.required, Validators.min(0)]],
    estoqueMinimo: [0 as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando = true;
    this.erro = null;

    this.ingredienteService.listar().subscribe({
      next: (ingredientes) => {
        this.ingredientes = ingredientes;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os ingredientes.');
        this.carregando = false;
      },
    });

    this.categoriaService.listar().subscribe({
      next: (categorias) => (this.categorias = categorias),
      error: () => {},
    });
  }

  rotuloUnidade(unidade: UnidadeMedida | null): string {
    return unidade?.toLowerCase() ?? '';
  }

  estoqueBaixo(ingrediente: Ingrediente): boolean {
    return (
      ingrediente.quantidadeEstoque !== null &&
      ingrediente.estoqueMinimo !== null &&
      ingrediente.quantidadeEstoque < ingrediente.estoqueMinimo
    );
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
      categoriaId: valores.categoriaId,
      quantidadeEstoque: valores.quantidadeEstoque!,
      estoqueMinimo: valores.estoqueMinimo!,
    };

    this.enviando = true;
    this.erro = null;

    const operacao =
      this.editandoId !== null
        ? this.ingredienteService.atualizar(this.editandoId, payload)
        : this.ingredienteService.criar(payload);

    operacao.subscribe({
      next: (ingrediente) => {
        this.enviando = false;
        this.sucesso = true;
        setTimeout(() => (this.sucesso = false), 4000);

        if (this.editandoId !== null) {
          const indice = this.ingredientes.findIndex((i) => i.id === ingrediente.id);
          if (indice !== -1) this.ingredientes[indice] = ingrediente;
        } else {
          this.ingredientes = [ingrediente, ...this.ingredientes];
        }

        this.cancelarEdicao();
      },
      error: (erro) => {
        this.enviando = false;
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          'Não foi possível salvar o ingrediente. Verifique os dados e tente novamente.',
        );
      },
    });
  }

  editar(ingrediente: Ingrediente) {
    this.editandoId = ingrediente.id;
    this.erro = null;
    this.form.setValue({
      nome: ingrediente.nome,
      unidadeMedida: ingrediente.unidadeMedida,
      custo: ingrediente.custo,
      categoriaId: ingrediente.categoriaId,
      quantidadeEstoque: ingrediente.quantidadeEstoque ?? 0,
      estoqueMinimo: ingrediente.estoqueMinimo ?? 0,
    });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form.reset({
      nome: '',
      unidadeMedida: null,
      custo: null,
      categoriaId: null,
      quantidadeEstoque: 0,
      estoqueMinimo: 0,
    });
  }

  excluir(ingrediente: Ingrediente) {
    if (!confirm(`Excluir o ingrediente "${ingrediente.nome}"?`)) {
      return;
    }

    this.erro = null;
    this.ingredienteService.excluir(ingrediente.id).subscribe({
      next: () => {
        this.ingredientes = this.ingredientes.filter((i) => i.id !== ingrediente.id);
        if (this.editandoId === ingrediente.id) {
          this.cancelarEdicao();
        }
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          'Não foi possível excluir o ingrediente. Verifique se ele está em alguma ficha técnica.',
        );
      },
    });
  }
}
