import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { CashbackConfig, CashbackService } from '../cupons-cashback/cashback.service';
import { Cliente, ClienteService } from '../clientes/cliente.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-fidelidade',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './fidelidade.html',
  styleUrl: './fidelidade.scss',
})
export class Fidelidade implements OnInit {
  private clienteService = inject(ClienteService);
  private cashbackService = inject(CashbackService);

  carregando = true;
  erro: string | null = null;

  clientes: Cliente[] = [];
  cashbackConfig: CashbackConfig | null = null;

  ngOnInit() {
    this.carregando = true;

    Promise.all([
      new Promise<Cliente[]>((resolve, reject) => this.clienteService.listar().subscribe({ next: resolve, error: reject })),
      new Promise<CashbackConfig>((resolve, reject) => this.cashbackService.buscar().subscribe({ next: resolve, error: reject })),
    ])
      .then(([clientes, cashbackConfig]) => {
        this.clientes = clientes;
        this.cashbackConfig = cashbackConfig;
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o programa de fidelidade.');
        this.carregando = false;
      });
  }

  get clientesParticipantes(): number {
    return this.clientes.filter((c) => (c.saldoCashback ?? 0) > 0).length;
  }

  get saldoTotalDistribuido(): number {
    return this.clientes.reduce((soma, c) => soma + (c.saldoCashback ?? 0), 0);
  }

  get rankingClientes(): Cliente[] {
    return [...this.clientes]
      .filter((c) => (c.saldoCashback ?? 0) > 0)
      .sort((a, b) => (b.saldoCashback ?? 0) - (a.saldoCashback ?? 0));
  }
}
