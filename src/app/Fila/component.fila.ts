import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

type OrderStatus = 'aguardando' | 'preparando' | 'pronto';

interface StatusConfig {
  next: OrderStatus | null;
  label: string;
  btnLabel: string;
}

interface Order {
  id: number;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

@Component({
  selector: 'app-fila',
  imports: [CommonModule],
  templateUrl: './component.fila.html',
  styleUrls: ['./component.fila.scss']
})
export class ComponentFila {

  orders: Order[] = [
    {
      id: 1,
      customerName: 'João',
      status: 'aguardando',
      total: 30,
      items: [
        { product: { id: 1, name: 'Hambúrguer', price: 15 }, quantity: 2 }
      ]
    }
  ];

  statusConfig: Record<OrderStatus, StatusConfig> = {
    aguardando: {
      next: 'preparando',
      label: 'Aguardando',
      btnLabel: 'Iniciar Preparo'
    },
    preparando: {
      next: 'pronto',
      label: 'Preparando',
      btnLabel: 'Marcar como Pronto'
    },
    pronto: {
      next: null,
      label: 'Pronto',
      btnLabel: ''
    }
  };

  get activeOrders() {
    return this.orders.filter(o => o.status !== 'pronto');
  }

  get readyOrders() {
    return this.orders.filter(o => o.status === 'pronto');
  }

  getStatus(order: Order) {
    return this.statusConfig[order.status];
  }

  updateOrderStatus(orderId: number, nextStatus: OrderStatus | null) {
    if (nextStatus) {
      this.orders = this.orders.map(order =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      );
    }
  }
}