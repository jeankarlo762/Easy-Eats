import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-confirmar-ped',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-pedido.html',
  styleUrls: ['./confirmar-pedido.scss']
})
export class ConfirmarPedComponent {
  tipoPedido: 'local' | 'levar' = 'local';
  formaPagamento: 'dinheiro' | 'pix' | 'credito' | 'debito' = 'dinheiro';
  pagarDepois: boolean = false;
  private router = inject(Router);

   protected acessarRota(rota: string) {
    this.router.navigate([rota]);
  }

  selecionarTipoPedido(tipo: 'local' | 'levar') {
    this.tipoPedido = tipo;
  }

  selecionarFormaPagamento(forma: 'dinheiro' | 'pix' | 'credito' | 'debito') {
    this.formaPagamento = forma;
  }

  togglePagarDepois() {
    this.pagarDepois = !this.pagarDepois;
  }

  enviarPedido() {
      this.acessarRota('/novo-pedido');
  }
}