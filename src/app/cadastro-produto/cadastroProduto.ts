import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Categoria, CategoriaService } from '../categorias/categoria.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Produto, ProdutoService } from './produto.service';

@Component({
  selector: 'app-cadastro-produto',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './cadastroProduto.html',
  styleUrls: ['./cadastroProduto.scss'],
})
export class CadastroProdutoComponent implements OnInit {
  private produtoService = inject(ProdutoService);
  private categoriaService = inject(CategoriaService);

  categorias = signal<Categoria[]>([]);
  produtos = signal<Produto[]>([]);
  carregando = signal(true);
  enviando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);
  editando = signal<Produto | null>(null);
  busca = signal('');

  categoriasAtivas = computed(() => this.categorias().filter((c) => c.ativa));

  produtosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.produtos().filter(
      (p) => !termo || p.nome.toLowerCase().includes(termo) || (p.categoria?.nome ?? '').toLowerCase().includes(termo),
    );
  });

  form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: Validators.required }),
    descricao: new FormControl('', { nonNullable: true }),
    categoriaId: new FormControl<number | null>(null, Validators.required),
    preco: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    forkJoin({
      categorias: this.categoriaService.listar(),
      produtos: this.produtoService.listar(),
    }).subscribe({
      next: ({ categorias, produtos }) => {
        this.categorias.set(categorias);
        this.produtos.set(produtos);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar produtos e categorias.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const payload = {
      nome: valores.nome.trim(),
      descricao: valores.descricao.trim() || null,
      preco: Number(valores.preco),
      categoriaId: valores.categoriaId!,
    };
    const editando = this.editando();

    this.enviando.set(true);
    this.erro.set(null);

    const requisicao = editando
      ? this.produtoService.atualizar(editando.id, payload)
      : this.produtoService.criar(payload);

    requisicao.subscribe({
      next: (produto) => {
        this.enviando.set(false);
        this.produtos.update((lista) =>
          (editando ? lista.map((p) => (p.id === produto.id ? produto : p)) : [...lista, produto]).sort((a, b) =>
            a.nome.localeCompare(b.nome),
          ),
        );
        this.mostrarSucesso(editando ? `"${produto.nome}" atualizado.` : `"${produto.nome}" cadastrado.`);
        this.cancelarEdicao();
      },
      error: (erro) => {
        this.enviando.set(false);
        this.erro.set(
          MensagemErroApiUtil.extrair(erro, 'Não foi possível salvar o produto. Verifique os dados e tente novamente.'),
        );
      },
    });
  }

  editar(produto: Produto): void {
    this.editando.set(produto);
    this.form.setValue({
      nome: produto.nome,
      descricao: produto.descricao ?? '',
      categoriaId: produto.categoria?.id ?? null,
      preco: produto.preco || null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao(): void {
    this.editando.set(null);
    this.form.reset({ nome: '', descricao: '', categoriaId: null, preco: null });
  }

  excluir(produto: Produto): void {
    if (!confirm(`Excluir o produto "${produto.nome}"? Ele deixará de aparecer no cardápio.`)) {
      return;
    }

    this.produtoService.excluir(produto.id).subscribe({
      next: () => {
        this.produtos.update((lista) => lista.filter((p) => p.id !== produto.id));
        if (this.editando()?.id === produto.id) this.cancelarEdicao();
        this.mostrarSucesso(`"${produto.nome}" excluído.`);
      },
      error: (erro) => this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir o produto.')),
    });
  }

  private mostrarSucesso(mensagem: string): void {
    this.sucesso.set(mensagem);
    setTimeout(() => this.sucesso.set(null), 4000);
  }
}
