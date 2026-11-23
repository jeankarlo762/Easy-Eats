import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type StatusPedido = 'Aguardando' | 'Enviado' | 'Recebido';

interface PedidoCompra {
  id: number;
  fornecedor: string;
  itens: string;
  valorTotal: number;
  status: StatusPedido;
}

@Component({
  selector: 'app-pedidos-compra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pedidos-compra.html',
  styleUrl: './pedidos-compra.scss',
})
export class PedidosCompra {
  private fb = new FormBuilder();
  private proximoId = 5;

  fornecedores = ['Distribuidora Boi Forte', 'Hortifruti São José', 'Bebidas Del Rey'];

  pedidos: PedidoCompra[] = [
    {
      id: 1,
      fornecedor: 'Distribuidora Boi Forte',
      itens: '50kg Carne Bovina, 20kg Batata',
      valorTotal: 1250,
      status: 'Aguardando',
    },
    {
      id: 2,
      fornecedor: 'Hortifruti São José',
      itens: '30kg Tomate, 15kg Alface, 10kg Cebola',
      valorTotal: 480,
      status: 'Enviado',
    },
    {
      id: 3,
      fornecedor: 'Bebidas Del Rey',
      itens: '10 caixas Refrigerante, 5 caixas Água',
      valorTotal: 620,
      status: 'Recebido',
    },
    {
      id: 4,
      fornecedor: 'Distribuidora Boi Forte',
      itens: '20kg Queijo Cheddar, 40un Pão Brioche',
      valorTotal: 890,
      status: 'Aguardando',
    },
  ];

  form = this.fb.group({
    fornecedor: ['', Validators.required],
    itens: ['', Validators.required],
    valorTotal: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  get pedidosAguardando(): number {
    return this.pedidos.filter((p) => p.status === 'Aguardando').length;
  }

  get valorTotalAberto(): number {
    return this.pedidos
      .filter((p) => p.status !== 'Recebido')
      .reduce((soma, p) => soma + p.valorTotal, 0);
  }

  criarPedido() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fornecedor, itens, valorTotal } = this.form.value;

    this.pedidos.unshift({
      id: this.proximoId++,
      fornecedor: fornecedor!,
      itens: itens!,
      valorTotal: valorTotal!,
      status: 'Aguardando',
    });

    this.form.reset();
  }

  badgeClasse(status: StatusPedido): string {
    switch (status) {
      case 'Aguardando':
        return 'alerta';
      case 'Enviado':
        return 'neutro';
      case 'Recebido':
        return 'sucesso';
    }
  }
}
