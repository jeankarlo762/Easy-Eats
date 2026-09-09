import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Fornecedor, FornecedorService } from '../fornecedores/fornecedor.service';
import { PedidoCompra, PedidoCompraService, StatusPedidoCompra } from './pedido-compra.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-pedidos-compra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './pedidos-compra.html',
  styleUrl: './pedidos-compra.scss',
})
export class PedidosCompra implements OnInit {
  private fb = inject(FormBuilder);
  private fornecedorService = inject(FornecedorService);
  private pedidoCompraService = inject(PedidoCompraService);

  carregando = true;
  enviando = false;
  erro: string | null = null;
  erroFormulario: string | null = null;

  fornecedores: Fornecedor[] = [];
  pedidos: PedidoCompra[] = [];

  form = this.fb.group({
    fornecedorId: [null as number | null, Validators.required],
    itens: ['', Validators.required],
    valorTotal: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit() {
    this.carregando = true;

    Promise.all([
      new Promise<Fornecedor[]>((resolve, reject) => this.fornecedorService.listar().subscribe({ next: resolve, error: reject })),
      new Promise<PedidoCompra[]>((resolve, reject) => this.pedidoCompraService.listar().subscribe({ next: resolve, error: reject })),
    ])
      .then(([fornecedores, pedidos]) => {
        this.fornecedores = fornecedores;
        this.pedidos = pedidos;
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os pedidos de compra.');
        this.carregando = false;
      });
  }

  get pedidosAguardando(): number {
    return this.pedidos.filter((p) => p.status === 'AGUARDANDO').length;
  }

  get valorTotalAberto(): number {
    return this.pedidos.filter((p) => p.status !== 'RECEBIDO').reduce((soma, p) => soma + p.valorTotal, 0);
  }

  criarPedido() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fornecedorId, itens, valorTotal } = this.form.value;
    this.enviando = true;
    this.erroFormulario = null;

    this.pedidoCompraService
      .criar({ fornecedor: { id: fornecedorId! }, itens: itens!, valorTotal: valorTotal! })
      .subscribe({
        next: (pedido) => {
          this.pedidos = [pedido, ...this.pedidos];
          this.form.reset();
          this.enviando = false;
        },
        error: (erro) => {
          this.erroFormulario = MensagemErroApiUtil.extrair(erro, 'Não foi possível criar o pedido de compra.');
          this.enviando = false;
        },
      });
  }

  avancarStatus(pedido: PedidoCompra) {
    this.pedidoCompraService.avancarStatus(pedido.id).subscribe({
      next: (atualizado) => {
        const indice = this.pedidos.findIndex((p) => p.id === atualizado.id);
        if (indice !== -1) this.pedidos[indice] = atualizado;
      },
      error: (erro) => (this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível atualizar o pedido.')),
    });
  }

  labelStatus(status: StatusPedidoCompra): string {
    return { AGUARDANDO: 'Aguardando', ENVIADO: 'Enviado', RECEBIDO: 'Recebido' }[status];
  }

  badgeClasse(status: StatusPedidoCompra): string {
    switch (status) {
      case 'AGUARDANDO':
        return 'alerta';
      case 'ENVIADO':
        return 'neutro';
      case 'RECEBIDO':
        return 'sucesso';
    }
  }
}
