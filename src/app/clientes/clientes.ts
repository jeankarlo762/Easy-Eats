import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FormatarCPFUtil } from '../utils/formatarCpfUtil';
import { FormatarTelefoneUtil } from '../utils/formatarTelefoneUtil';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { Cliente, ClienteService } from './cliente.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CarregandoComponent],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class Clientes implements OnInit {
  private fb = inject(FormBuilder);
  private clienteService = inject(ClienteService);

  editandoId: number | null = null;
  busca = '';

  clientes: Cliente[] = [];
  carregando = true;
  enviando = false;
  erro: string | null = null;
  sucesso = false;

  form = this.fb.group({
    nome: ['', Validators.required],
    telefone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    cpf: [''],
  });

  ngOnInit() {
    this.carregar();

    this.form.controls.cpf.valueChanges.subscribe((valor) => {
      const formatado = FormatarCPFUtil.formatar(valor ?? '');
      if (formatado !== valor) {
        this.form.controls.cpf.setValue(formatado, { emitEvent: false });
      }
    });

    this.form.controls.telefone.valueChanges.subscribe((valor) => {
      const formatado = FormatarTelefoneUtil.formatar(valor ?? '');
      if (formatado !== valor) {
        this.form.controls.telefone.setValue(formatado, { emitEvent: false });
      }
    });
  }

  private carregar() {
    this.carregando = true;
    this.clienteService.listar().subscribe({
      next: (clientes) => {
        this.clientes = clientes;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os clientes.');
        this.carregando = false;
      },
    });
  }

  get clientesFiltrados(): Cliente[] {
    const termo = this.busca.toLowerCase().trim();
    if (!termo) {
      return this.clientes;
    }
    return this.clientes.filter((c) => c.nome.toLowerCase().includes(termo));
  }

  salvar() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, telefone, email, cpf } = this.form.getRawValue();
    const payload = {
      nome: nome!.trim(),
      telefone: telefone!.trim(),
      email: email!.trim(),
      cpf: cpf?.trim() || null,
      endereco: null,
    };

    this.enviando = true;
    this.erro = null;

    const operacao =
      this.editandoId !== null
        ? this.clienteService.atualizar(this.editandoId, payload)
        : this.clienteService.criar(payload);

    operacao.subscribe({
      next: (cliente) => {
        this.enviando = false;
        this.sucesso = true;
        setTimeout(() => (this.sucesso = false), 4000);

        if (this.editandoId !== null) {
          const indice = this.clientes.findIndex((c) => c.id === cliente.id);
          if (indice !== -1) this.clientes[indice] = cliente;
        } else {
          this.clientes = [cliente, ...this.clientes];
        }

        this.cancelarEdicao();
      },
      error: (erro) => {
        this.enviando = false;
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          'Não foi possível salvar o cliente. Verifique os dados e tente novamente.',
        );
      },
    });
  }

  editar(cliente: Cliente) {
    this.editandoId = cliente.id;
    this.erro = null;
    this.form.setValue({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      cpf: cliente.cpf ?? '',
    });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form.reset({ nome: '', telefone: '', email: '', cpf: '' });
  }

  excluir(cliente: Cliente) {
    if (!confirm(`Excluir o cliente "${cliente.nome}"?`)) {
      return;
    }

    this.erro = null;
    this.clienteService.excluir(cliente.id).subscribe({
      next: () => {
        this.clientes = this.clientes.filter((c) => c.id !== cliente.id);
        if (this.editandoId === cliente.id) {
          this.cancelarEdicao();
        }
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir o cliente.');
      },
    });
  }
}
