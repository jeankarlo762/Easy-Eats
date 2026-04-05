import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { StatusPedidoEnum } from '../enum/pedidosEnum';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent {
  private router = inject(Router);

  public readonly statusEnum = StatusPedidoEnum;
  public statusPedido: StatusPedidoEnum = StatusPedidoEnum.PREPARANDO;

  protected acessarRota(rota: string) {
    this.router.navigate([rota]);
  }

  marcarComoPronto() {
    this.statusPedido = StatusPedidoEnum.PRONTO;
  }

  marcarComoEntregue() {
    this.statusPedido = StatusPedidoEnum.ENTREGUE;
  }

  marcarComoPreparando() {
    this.statusPedido = StatusPedidoEnum.PREPARANDO;
  }

  constructor() {}
}
