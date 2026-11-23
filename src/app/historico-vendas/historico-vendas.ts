import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import {
  PROXIMO_STATUS,
  STATUS_PEDIDO_LABEL,
  StatusPedido,
  TODOS_STATUS_PEDIDO,
  Comanda,
  ComandaService,
  identificacaoPedido,
} from '../comandas/comanda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

type FiltroStatus = 'TODOS' | StatusPedido;

@Component({
  selector: 'app-historico-vendas',
  standalone: true,
  templateUrl: './historico-vendas.html',
  styleUrls: ['./historico-vendas.scss'],
  imports: [CurrencyPipe, DatePipe, FormsModule, CarregandoComponent],
})
export class HistoricoVendasComponent implements OnInit {
  private comandaService = inject(ComandaService);

  readonly statusLabel = STATUS_PEDIDO_LABEL;
  readonly filtros: { valor: FiltroStatus; label: string }[] = [
    { valor: 'TODOS', label: 'Todos' },
    ...TODOS_STATUS_PEDIDO.map((status) => ({ valor: status as FiltroStatus, label: STATUS_PEDIDO_LABEL[status] })),
  ];
  readonly identificacao = identificacaoPedido;

  busca = signal('');
  filtroSelecionado = signal<FiltroStatus>('TODOS');
  carregando = signal(true);
  erro = signal<string | null>(null);
  processandoId = signal<number | null>(null);
  comandas = signal<Comanda[]>([]);

  comandasFiltradas = computed(() => {
    const termo = this.busca().toLowerCase().trim().replace(/^#/, '');
    const filtro = this.filtroSelecionado();

    return this.comandas()
      .filter((comanda) => filtro === 'TODOS' || comanda.status === filtro)
      .filter(
        (comanda) =>
          !termo ||
          identificacaoPedido(comanda).toLowerCase().includes(termo) ||
          (comanda.nomeCliente ?? '').toLowerCase().includes(termo) ||
          comanda.id.toString() === termo,
      )
      .sort((a, b) => (b.dataCriacao ?? '').localeCompare(a.dataCriacao ?? ''));
  });

  totalFiltrado = computed(() =>
    this.comandasFiltradas()
      .filter((comanda) => comanda.status !== 'CANCELADO')
      .reduce((total, comanda) => total + comanda.valorTotal, 0),
  );

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando.set(true);
    this.comandaService.listar().subscribe({
      next: (comandas) => {
        this.comandas.set(comandas);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o histórico de pedidos.'));
        this.carregando.set(false);
      },
    });
  }

  proximoStatus(comanda: Comanda): StatusPedido | undefined {
    return PROXIMO_STATUS[comanda.status];
  }

  podeCancelar(comanda: Comanda): boolean {
    return comanda.status === 'ABERTO' || comanda.status === 'EM_PREPARO';
  }

  avancar(comanda: Comanda) {
    const proximo = this.proximoStatus(comanda);
    if (proximo) this.alterarStatus(comanda, proximo);
  }

  cancelar(comanda: Comanda) {
    const aviso =
      comanda.status === 'EM_PREPARO'
        ? ' Os ingredientes já baixados do estoque não são devolvidos automaticamente.'
        : '';
    if (confirm(`Cancelar o pedido #${comanda.id}?${aviso}`)) {
      this.alterarStatus(comanda, 'CANCELADO');
    }
  }

  private alterarStatus(comanda: Comanda, status: StatusPedido) {
    this.processandoId.set(comanda.id);
    this.erro.set(null);

    this.comandaService.atualizarStatus(comanda.id, status).subscribe({
      next: (atualizada) => {
        this.comandas.update((lista) => lista.map((v) => (v.id === atualizada.id ? atualizada : v)));
        this.processandoId.set(null);
      },
      error: (erro) => {
        this.processandoId.set(null);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível atualizar o status do pedido.'));
      },
    });
  }
}
