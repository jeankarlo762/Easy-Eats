import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Categoria, CategoriaService } from './categoria.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [ReactiveFormsModule, CarregandoComponent],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss',
})
export class Categorias implements OnInit {
  private categoriaService = inject(CategoriaService);

  categorias = signal<Categoria[]>([]);
  carregando = signal(true);
  salvando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);
  editando = signal<Categoria | null>(null);

  form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ativa: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando.set(true);
    this.categoriaService.listar().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar as categorias.'));
        this.carregando.set(false);
      },
    });
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, ativa } = this.form.getRawValue();
    const payload = { nome: nome.trim(), ativa };
    const editando = this.editando();

    this.salvando.set(true);
    this.erro.set(null);

    const requisicao = editando
      ? this.categoriaService.atualizar(editando.id, payload)
      : this.categoriaService.criar(payload);

    requisicao.subscribe({
      next: () => {
        this.salvando.set(false);
        this.mostrarSucesso(editando ? `Categoria "${payload.nome}" atualizada.` : `Categoria "${payload.nome}" criada.`);
        this.cancelarEdicao();
        this.carregar();
      },
      error: (erro) => {
        this.salvando.set(false);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível salvar a categoria.'));
      },
    });
  }

  editar(categoria: Categoria) {
    this.editando.set(categoria);
    this.form.setValue({ nome: categoria.nome, ativa: categoria.ativa });
  }

  cancelarEdicao() {
    this.editando.set(null);
    this.form.reset({ nome: '', ativa: true });
  }

  alternarAtiva(categoria: Categoria) {
    const requisicao = categoria.ativa
      ? this.categoriaService.inativar(categoria.id)
      : this.categoriaService.atualizar(categoria.id, { nome: categoria.nome, ativa: true });

    if (categoria.ativa && !confirm(`Inativar a categoria "${categoria.nome}"?`)) {
      return;
    }

    requisicao.subscribe({
      next: (atualizada) => {
        this.categorias.update((lista) => lista.map((c) => (c.id === atualizada.id ? atualizada : c)));
        this.mostrarSucesso(`Categoria "${categoria.nome}" ${atualizada.ativa ? 'reativada' : 'inativada'}.`);
      },
      error: (erro) => this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível alterar a categoria.')),
    });
  }

  private mostrarSucesso(mensagem: string) {
    this.sucesso.set(mensagem);
    setTimeout(() => this.sucesso.set(null), 4000);
  }
}
