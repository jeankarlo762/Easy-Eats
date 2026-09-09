import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { StatusPedidoEnum } from '../enum/pedidosEnum';
import { Pedido, PedidoService } from '../pedido.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-fila',
  standalone: true,
  templateUrl: './component.fila.html',
  styleUrls: ['./component.fila.scss'],
  imports: [CommonModule, CarregandoComponent],
})
export class ComponentFila implements OnInit {
  private pedidoService = inject(PedidoService);

  public readonly statusEnum = StatusPedidoEnum;

  carregando = true;
  erro: string | null = null;
  atualizandoId: number | null = null;

  activeOrders: Pedido[] = [];
  readyOrders: Pedido[] = [];

  ngOnInit() {
    this.carregarFila();
  }

  private carregarFila() {
    this.carregando = true;

    Promise.all([
      new Promise<Pedido[]>((resolve, reject) => this.pedidoService.fila().subscribe({ next: resolve, error: reject })),
      new Promise<Pedido[]>((resolve, reject) => this.pedidoService.listar().subscribe({ next: resolve, error: reject })),
    ])
      .then(([fila, todos]) => {
        this.activeOrders = fila;
        this.readyOrders = todos.filter((p) => p.status === StatusPedidoEnum.PRONTO);
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a fila da cozinha.');
        this.carregando = false;
      });
  }

  get totalAguardando(): number {
    return this.activeOrders.filter((p) => p.status === StatusPedidoEnum.AGUARDANDO).length;
  }

  get totalPreparando(): number {
    return this.activeOrders.filter((p) => p.status === StatusPedidoEnum.PREPARANDO).length;
  }

  iniciarPreparo(pedido: Pedido) {
    this.atualizandoId = pedido.id;
    this.pedidoService.iniciarPreparo(pedido.id).subscribe({
      next: () => {
        this.atualizandoId = null;
        this.carregarFila();
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível iniciar o preparo.');
        this.atualizandoId = null;
      },
    });
  }

  marcarPronto(pedido: Pedido) {
    this.atualizandoId = pedido.id;
    this.pedidoService.marcarPronto(pedido.id).subscribe({
      next: () => {
        this.atualizandoId = null;
        this.carregarFila();
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível marcar o pedido como pronto.');
        this.atualizandoId = null;
      },
    });
  }
}
