import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-fila',
  templateUrl: './component.fila.html',
  styleUrls: ['./component.fila.scss'],
})
export class ComponentFila {
  activeOrders = [];
  readyOrders = [];
  private router = inject(Router);

  updateOrderStatus(id: number) {}

  protected acessarRota(rota: string) {
    this.router.navigate([rota]);
  }
}
