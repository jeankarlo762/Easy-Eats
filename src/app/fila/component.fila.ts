import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { PeriodoUtil } from '../utils/periodoUtil';
import { CarregandoComponent } from '../../components/carregando/carregando';
import {
  PROXIMO_STATUS,
  STATUS_PEDIDO_LABEL,
  Comanda,
  ComandaService,
  identificacaoPedido,
} from '../comandas/comanda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

const INTERVALO_ATUALIZACAO_MS = 15000;
/** Pedidos em andamento há mais tempo que isso são destacados como atrasados. */
const MINUTOS_ATRASO = 20;

@Component({
  selector: 'app-fila',
  standalone: true,
  templateUrl: './component.fila.html',
  styleUrls: ['./component.fila.scss'],
  imports: [CurrencyPipe, DatePipe, CarregandoComponent],
})
export class ComponentFila implements OnInit {
  private comandaService = inject(ComandaService);
  private destroyRef = inject(DestroyRef);

  readonly statusLabel = STATUS_PEDIDO_LABEL;
  readonly identificacao = identificacaoPedido;

  carregando = signal(true);
  erro = signal<string | null>(null);
  processandoId = signal<number | null>(null);
  agora = signal(Date.now());

  emAndamento = signal<Comanda[]>([]);
  finalizadosHoje = signal<Comanda[]>([]);

  totalAguardando = computed(() => this.emAndamento().filter((p) => p.status === 'ABERTO').length);
  totalPreparando = computed(() => this.emAndamento().filter((p) => p.status === 'EM_PREPARO').length);

  ngOnInit(): void {
    this.carregar();
    interval(INTERVALO_ATUALIZACAO_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar(false));
  }

  carregar(mostrarCarregando = true): void {
    if (mostrarCarregando) this.carregando.set(true);

    this.comandaService.listar().subscribe({
      next: (pedidos) => {
        const hoje = PeriodoUtil.paraIso(new Date());
        this.emAndamento.set(
          pedidos
            .filter((p) => p.status === 'ABERTO' || p.status === 'EM_PREPARO')
            .sort((a, b) => (a.dataCriacao ?? '').localeCompare(b.dataCriacao ?? '')),
        );
        this.finalizadosHoje.set(
          pedidos
            .filter((p) => p.status === 'FINALIZADO' && (p.dataAlteracao ?? p.dataCriacao ?? '').startsWith(hoje))
            .sort((a, b) => (b.dataAlteracao ?? '').localeCompare(a.dataAlteracao ?? '')),
        );
        this.agora.set(Date.now());
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a fila da cozinha.'));
        this.carregando.set(false);
      },
    });
  }

  minutosEspera(pedido: Comanda): number {
    if (!pedido.dataCriacao) return 0;
    return Math.max(0, Math.floor((this.agora() - new Date(pedido.dataCriacao).getTime()) / 60000));
  }

  atrasado(pedido: Comanda): boolean {
    return this.minutosEspera(pedido) >= MINUTOS_ATRASO;
  }

  rotuloAcao(pedido: Comanda): string {
    return PROXIMO_STATUS[pedido.status] === 'EM_PREPARO' ? 'Iniciar preparo' : 'Finalizar';
  }

  avancar(pedido: Comanda): void {
    const proximo = PROXIMO_STATUS[pedido.status];
    if (!proximo) return;

    this.processandoId.set(pedido.id);
    this.erro.set(null);

    this.comandaService.atualizarStatus(pedido.id, proximo).subscribe({
      next: () => {
        this.processandoId.set(null);
        this.carregar(false);
      },
      error: (erro) => {
        this.processandoId.set(null);
        this.erro.set(MensagemErroApiUtil.extrair(erro, `Não foi possível atualizar o pedido #${pedido.id}.`));
      },
    });
  }
}
