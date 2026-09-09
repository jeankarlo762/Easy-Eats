import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Fornecedor, FornecedorService } from './fornecedor.service';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './fornecedores.html',
  styleUrl: './fornecedores.scss',
})
export class Fornecedores implements OnInit {
  private fb = inject(FormBuilder);
  private fornecedorService = inject(FornecedorService);

  editandoId: number | null = null;

  fornecedores: Fornecedor[] = [];
  carregando = true;
  enviando = false;
  erro: string | null = null;
  sucesso = false;

  form = this.fb.group({
    nome: ['', Validators.required],
    cnpj: ['', Validators.required],
    telefone: [''],
    email: ['', Validators.email],
  });

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando = true;
    this.fornecedorService.listar().subscribe({
      next: (fornecedores) => {
        this.fornecedores = fornecedores;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os fornecedores.');
        this.carregando = false;
      },
    });
  }

  salvar() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, cnpj, telefone, email } = this.form.getRawValue();
    const payload = {
      nome: nome!.trim(),
      cnpj: cnpj!.trim(),
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      flAtivo: true,
    };

    this.enviando = true;
    this.erro = null;

    const operacao =
      this.editandoId !== null
        ? this.fornecedorService.atualizar(this.editandoId, payload)
        : this.fornecedorService.criar(payload);

    operacao.subscribe({
      next: (fornecedor) => {
        this.enviando = false;
        this.sucesso = true;
        setTimeout(() => (this.sucesso = false), 4000);

        if (this.editandoId !== null) {
          const indice = this.fornecedores.findIndex((f) => f.id === fornecedor.id);
          if (indice !== -1) this.fornecedores[indice] = fornecedor;
        } else {
          this.fornecedores = [fornecedor, ...this.fornecedores];
        }

        this.cancelarEdicao();
      },
      error: (erro) => {
        this.enviando = false;
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          'Não foi possível salvar o fornecedor. Verifique os dados e tente novamente.',
        );
      },
    });
  }

  editar(fornecedor: Fornecedor) {
    this.editandoId = fornecedor.id;
    this.erro = null;
    this.form.setValue({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj,
      telefone: fornecedor.telefone ?? '',
      email: fornecedor.email ?? '',
    });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form.reset({ nome: '', cnpj: '', telefone: '', email: '' });
  }

  excluir(fornecedor: Fornecedor) {
    if (!confirm(`Excluir o fornecedor "${fornecedor.nome}"?`)) {
      return;
    }

    this.erro = null;
    this.fornecedorService.excluir(fornecedor.id).subscribe({
      next: () => {
        this.fornecedores = this.fornecedores.filter((f) => f.id !== fornecedor.id);
        if (this.editandoId === fornecedor.id) {
          this.cancelarEdicao();
        }
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir o fornecedor.');
      },
    });
  }
}
