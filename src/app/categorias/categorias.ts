import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { ProdutoService } from '../cadastro-produto/produto.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Categoria, CategoriaService } from './categoria.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss',
})
export class Categorias implements OnInit {
  private fb = inject(FormBuilder);
  private categoriaService = inject(CategoriaService);
  private produtoService = inject(ProdutoService);

  categorias: Categoria[] = [];

  // Contagem de produtos por categoria calculada no front: o backend não
  // devolve produtos junto da categoria (Categoria.produtos é @JsonIgnore,
  // de propósito, para não arrastar o catálogo inteiro em toda listagem).
  // Produto já vem com a categoria aninhada, então uma segunda chamada
  // resolve isso sem precisar de um novo endpoint.
  produtosPorCategoria: Record<number, number> = {};

  carregando = true;
  enviando = false;
  erro: string | null = null;
  sucesso = false;

  editandoId: number | null = null;

  form = this.fb.group({
    nome: ['', Validators.required],
    descricao: [''],
  });

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando = true;
    this.erro = null;

    this.categoriaService.listar().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar as categorias.');
        this.carregando = false;
      },
    });

    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtosPorCategoria = {};
        for (const produto of produtos) {
          const categoriaId = produto.categoria?.id;
          if (categoriaId != null) {
            this.produtosPorCategoria[categoriaId] = (this.produtosPorCategoria[categoriaId] ?? 0) + 1;
          }
        }
      },
      error: () => {},
    });
  }

  produtosVinculados(categoria: Categoria): number {
    return this.produtosPorCategoria[categoria.id] ?? 0;
  }

  salvar() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, descricao } = this.form.getRawValue();
    const payload = { nome: nome!.trim(), descricao: descricao?.trim() || null, flativo: true };

    this.enviando = true;
    this.erro = null;

    const operacao =
      this.editandoId !== null
        ? this.categoriaService.atualizar(this.editandoId, payload)
        : this.categoriaService.criar(payload);

    operacao.subscribe({
      next: (categoria) => {
        this.enviando = false;
        this.sucesso = true;
        setTimeout(() => (this.sucesso = false), 4000);

        if (this.editandoId !== null) {
          const indice = this.categorias.findIndex((c) => c.id === categoria.id);
          if (indice !== -1) this.categorias[indice] = categoria;
        } else {
          this.categorias = [categoria, ...this.categorias];
        }

        this.cancelarEdicao();
      },
      error: (erro) => {
        this.enviando = false;
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          'Não foi possível salvar a categoria. Verifique os dados e tente novamente.',
        );
      },
    });
  }

  editar(categoria: Categoria) {
    this.editandoId = categoria.id;
    this.erro = null;
    this.form.setValue({ nome: categoria.nome, descricao: categoria.descricao ?? '' });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form.reset({ nome: '', descricao: '' });
  }

  excluir(categoria: Categoria) {
    if (!confirm(`Excluir a categoria "${categoria.nome}"?`)) {
      return;
    }

    this.erro = null;
    this.categoriaService.excluir(categoria.id).subscribe({
      next: () => {
        this.categorias = this.categorias.filter((c) => c.id !== categoria.id);
        if (this.editandoId === categoria.id) {
          this.cancelarEdicao();
        }
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          'Não foi possível excluir a categoria. Verifique se há produtos vinculados.',
        );
      },
    });
  }
}
