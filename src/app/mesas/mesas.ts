import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { AuthService, PERFIS_GESTAO } from '../auth/auth.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { OcupacaoMesa, VendaResumo, VendaService } from '../vendas/venda.service';
import { MesaService } from './mesa.service';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, CarregandoComponent],
  templateUrl: './mesas.html',
  styleUrl: './mesas.scss',
})
export class Mesas implements OnInit {
  private mesaService = inject(MesaService);
  private vendaService = inject(VendaService);
  private router = inject(Router);

  readonly podeGerenciar = inject(AuthService).temPerfil(PERFIS_GESTAO);

  carregando = signal(true);
  salvando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);

  /** Situação de cada mesa vinda do backend: ocupada enquanto houver venda aberta nela. */
  mesas = signal<OcupacaoMesa[]>([]);
  retiradas = signal<VendaResumo[]>([]);

  numero: number | null = null;
  editando = signal<OcupacaoMesa | null>(null);

  totalOcupadas = computed(() => this.mesas().filter((m) => m.ocupada).length);
  totalLivres = computed(() => this.mesas().length - this.totalOcupadas());

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    forkJoin({
      mesas: this.vendaService.ocupacaoMesas(),
      abertas: this.vendaService.abertas(),
    }).subscribe({
      next: ({ mesas, abertas }) => {
        this.mesas.set(mesas);
        this.retiradas.set(abertas.filter((venda) => venda.tipo === 'RETIRADA'));
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar as mesas.'));
        this.carregando.set(false);
      },
    });
  }

  novoPedido(mesa: OcupacaoMesa): void {
    this.router.navigate(['/novo-pedido'], { queryParams: { mesa: mesa.mesaId } });
  }

  novaRetirada(): void {
    this.router.navigate(['/novo-pedido'], { queryParams: { tipo: 'retirada' } });
  }

  salvar(): void {
    const numero = Number(this.numero);
    if (!Number.isInteger(numero) || numero <= 0) {
      this.erro.set('Informe um número de mesa inteiro e maior que zero.');
      return;
    }
    const editando = this.editando();
    this.salvando.set(true);
    this.erro.set(null);
    const requisicao = editando
      ? this.mesaService.atualizar(editando.mesaId, numero)
      : this.mesaService.criar(numero);
    requisicao.subscribe({
      next: () => {
        this.salvando.set(false);
        this.mostrarSucesso(editando ? `Mesa ${numero} atualizada.` : `Mesa ${numero} cadastrada.`);
        this.cancelarEdicao();
        this.carregar();
      },
      error: (erro) => {
        this.salvando.set(false);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível salvar a mesa.'));
      },
    });
  }

  editar(mesa: OcupacaoMesa): void {
    this.editando.set(mesa);
    this.numero = mesa.numero;
  }

  cancelarEdicao(): void {
    this.editando.set(null);
    this.numero = null;
  }

  excluir(mesa: OcupacaoMesa): void {
    if (mesa.ocupada) {
      this.erro.set(`A mesa ${mesa.numero} tem uma conta aberta e não pode ser excluída agora.`);
      return;
    }
    if (!confirm(`Excluir a mesa ${mesa.numero}?`)) {
      return;
    }
    this.mesaService.excluir(mesa.mesaId).subscribe({
      next: () => {
        this.mostrarSucesso(`Mesa ${mesa.numero} excluída.`);
        this.carregar();
      },
      error: (erro) => this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível excluir a mesa.')),
    });
  }

  private mostrarSucesso(mensagem: string): void {
    this.sucesso.set(mensagem);
    setTimeout(() => this.sucesso.set(null), 4000);
  }
}
