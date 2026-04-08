import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmar-ped',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-ped.html',
  styleUrls: ['./confirmar-ped.scss']
})
export class ConfirmarPedComponent {
  tipoPedido: 'local' | 'levar' = 'local';
  formaPagamento: 'dinheiro' | 'pix' | 'credito' | 'debito' = 'dinheiro';
  pagarDepois: boolean = false;

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
    console.log('Pedido enviado:', {
      tipoPedido: this.tipoPedido,
      formaPagamento: this.formaPagamento,
      pagarDepois: this.pagarDepois
    });
    alert('Pedido enviado! Veja o console para detalhes.');
  }
}