import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import {
  PROXIMO_STATUS,
  Comanda,
  ComandaService,
  identificacaoPedido,
} from '../comandas/comanda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

const INTERVALO_ATUALIZACAO_MS = 10000;

@Component({
  selector: 'app-tela-cozinha',
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, CarregandoComponent],
  templateUrl: './tela-cozinha.html',
  styleUrl: './tela-cozinha.scss',
})
export class TelaCozinha implements OnInit {
  private comandaService = inject(ComandaService);
  private destroyRef = inject(DestroyRef);

  readonly identificacao = identificacaoPedido;

  comandas = signal<Comanda[]>([]);
  carregando = signal(true);
  erro = signal<string | null>(null);
  processandoId = signal<number | null>(null);

  aguardando = computed(() => this.ordenar(this.comandas().filter((v) => v.status === 'ABERTO')));
  preparando = computed(() => this.ordenar(this.comandas().filter((v) => v.status === 'EM_PREPARO')));

  ngOnInit() {
    this.carregar();
    interval(INTERVALO_ATUALIZACAO_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar(false));
  }

  carregar(mostrarCarregando = true) {
    if (mostrarCarregando) {
      this.carregando.set(true);
    }

    this.comandaService.listar().subscribe({
      next: (comandas) => {
        this.comandas.set(comandas.filter((v) => v.status === 'ABERTO' || v.status === 'EM_PREPARO'));
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os pedidos.'));
        this.carregando.set(false);
      },
    });
  }

  avancar(comanda: Comanda): void {
    const proximoStatus = PROXIMO_STATUS[comanda.status];
    if (!proximoStatus || this.processandoId() !== null) {
      return;
    }

    this.processandoId.set(comanda.id);
    this.erro.set(null);

    this.comandaService.atualizarStatus(comanda.id, proximoStatus).subscribe({
      next: () => {
        this.processandoId.set(null);
        this.carregar(false);
      },
      error: (erro) => {
        this.processandoId.set(null);
        this.erro.set(
          MensagemErroApiUtil.extrair(
            erro,
            `Não foi possível atualizar o pedido #${comanda.id}. Verifique o estoque dos ingredientes.`,
          ),
        );
      },
    });
  }

  abrirNovaJanela() {
    window.open(`${window.location.origin}/tela-cozinha`, '_blank', 'width=1400,height=900,noopener,noreferrer');
  }

  private ordenar(lista: Comanda[]): Comanda[] {
    return [...lista].sort((a, b) => (a.dataCriacao ?? '').localeCompare(b.dataCriacao ?? ''));
  }
}
