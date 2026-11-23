import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { AuthService, PERFIS_GESTAO } from '../auth/auth.service';
import { STATUS_PEDIDO_LABEL } from '../comandas/comanda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import {
  FORMAS_PAGAMENTO,
  FORMA_PAGAMENTO_LABEL,
  FormaPagamento,
  PagamentoVenda,
  STATUS_VENDA_LABEL,
  TIPO_VENDA_LABEL,
  Venda,
  VendaService,
} from '../vendas/venda.service';

/** Arredonda para centavos: o backend aceita no máximo 2 casas decimais. */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Conta (venda) de uma mesa ou retirada: comandas, pagamentos, finalização e cancelamento.
 * Finalizar exige o total pago igual ao total da venda e um caixa aberto.
 */
@Component({
  selector: 'app-conta',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, CarregandoComponent],
  templateUrl: './conta.html',
  styleUrl: './conta.scss',
})
export class Conta implements OnInit {
  private vendaService = inject(VendaService);
  private route = inject(ActivatedRoute);

  /** Cancelar a venda é restrito a Administrador e Gerente. */
  readonly podeGerir = inject(AuthService).temPerfil(PERFIS_GESTAO);
  readonly formas = FORMAS_PAGAMENTO;
  readonly formaLabel = FORMA_PAGAMENTO_LABEL;
  readonly tipoLabel = TIPO_VENDA_LABEL;
  readonly statusVendaLabel = STATUS_VENDA_LABEL;
  readonly statusComandaLabel = STATUS_PEDIDO_LABEL;

  venda = signal<Venda | null>(null);
  carregando = signal(true);
  processando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);
  /** Verdadeiro quando a finalização falhou por falta de caixa aberto (mostra o atalho para abrir). */
  precisaAbrirCaixa = signal(false);

  // novo pagamento
  forma = signal<FormaPagamento>('DINHEIRO');
  valorPagamento = signal<number | null>(null);
  valorRecebido = signal<number | null>(null);

  // cancelamento
  modalCancelamento = signal(false);
  motivo = signal('');
  devolverEstoque = signal(false);
  senhaGerente = signal('');
  erroModal = signal<string | null>(null);

  comandasAtivas = computed(() => this.venda()?.comandas.filter((comanda) => comanda.status !== 'CANCELADO') ?? []);
  aberta = computed(() => this.venda()?.status === 'ABERTA');

  /** Troco do pagamento em dinheiro que está sendo digitado. */
  troco = computed(() => {
    const recebido = this.valorRecebido();
    const valor = this.valorPagamento();
    if (this.forma() !== 'DINHEIRO' || recebido === null || valor === null) {
      return 0;
    }
    return Math.max(0, centavos(recebido - valor));
  });

  podeFinalizar = computed(() => {
    const venda = this.venda();
    return (
      !!venda &&
      venda.status === 'ABERTA' &&
      this.comandasAtivas().length > 0 &&
      Math.abs(venda.valorRestante) < 0.005 &&
      !this.processando()
    );
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.erro.set('Conta inválida.');
      this.carregando.set(false);
      return;
    }
    this.carregar(id);
  }

  carregar(id = this.venda()?.id): void {
    if (!id) {
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    this.vendaService.buscarPorId(id).subscribe({
      next: (venda) => {
        this.aplicar(venda);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar a conta.'));
        this.carregando.set(false);
      },
    });
  }

  /** Atualiza a tela com a venda devolvida pela API e sugere o valor restante como próximo pagamento. */
  private aplicar(venda: Venda): void {
    this.venda.set(venda);
    this.valorPagamento.set(venda.valorRestante > 0 ? centavos(venda.valorRestante) : null);
    this.valorRecebido.set(null);
  }

  titulo(venda: Venda): string {
    if (venda.tipo === 'MESA') {
      return `Conta da mesa ${venda.numeroMesa ?? ''}`.trim();
    }
    return `${this.tipoLabel[venda.tipo]}${venda.nomeCliente ? ' de ' + venda.nomeCliente : ''}`;
  }

  // ------------------------------------------------------------------ pagamentos

  registrarPagamento(): void {
    const venda = this.venda();
    const valor = this.valorPagamento();
    if (!venda || valor === null || valor <= 0) {
      this.erro.set('Informe um valor de pagamento maior que zero.');
      return;
    }
    const recebido = this.valorRecebido();
    this.executar(
      this.vendaService.registrarPagamento(venda.id, {
        forma: this.forma(),
        valor: centavos(valor),
        valorRecebido: this.forma() === 'DINHEIRO' && recebido !== null ? centavos(recebido) : null,
      }),
      'Pagamento registrado.',
      'Não foi possível registrar o pagamento.',
    );
  }

  removerPagamento(pagamento: PagamentoVenda): void {
    const venda = this.venda();
    if (!venda || !confirm(`Remover o pagamento de ${FORMA_PAGAMENTO_LABEL[pagamento.forma]}?`)) {
      return;
    }
    this.executar(
      this.vendaService.removerPagamento(venda.id, pagamento.id),
      'Pagamento removido.',
      'Não foi possível remover o pagamento.',
    );
  }

  finalizar(): void {
    const venda = this.venda();
    if (!venda || !this.podeFinalizar()) {
      return;
    }
    this.executar(
      this.vendaService.finalizar(venda.id),
      'Venda finalizada. A mesa foi liberada.',
      'Não foi possível finalizar a venda.',
    );
  }

  private executar(requisicao: ReturnType<VendaService['finalizar']>, mensagemSucesso: string, mensagemErro: string): void {
    this.processando.set(true);
    this.erro.set(null);
    this.precisaAbrirCaixa.set(false);
    requisicao.subscribe({
      next: (venda) => {
        this.processando.set(false);
        this.aplicar(venda);
        this.mostrarSucesso(mensagemSucesso);
      },
      error: (erro) => {
        this.processando.set(false);
        const mensagem = MensagemErroApiUtil.extrair(erro, mensagemErro);
        this.erro.set(mensagem);
        this.precisaAbrirCaixa.set(mensagem.toLowerCase().includes('abra o caixa'));
      },
    });
  }

  // ------------------------------------------------------------------ cancelamento

  abrirCancelamento(): void {
    this.motivo.set('');
    this.devolverEstoque.set(false);
    this.senhaGerente.set('');
    this.erroModal.set(null);
    this.modalCancelamento.set(true);
  }

  fecharCancelamento(): void {
    this.modalCancelamento.set(false);
  }

  confirmarCancelamento(): void {
    const venda = this.venda();
    if (!venda) {
      return;
    }
    if (!this.motivo().trim()) {
      this.erroModal.set('Informe o motivo do cancelamento.');
      return;
    }
    if (this.devolverEstoque() && !this.senhaGerente().trim()) {
      this.erroModal.set('Informe a senha do gerente para devolver o estoque.');
      return;
    }
    this.processando.set(true);
    this.erroModal.set(null);
    this.vendaService
      .cancelar(venda.id, {
        motivo: this.motivo().trim(),
        devolverEstoque: this.devolverEstoque(),
        senhaGerente: this.devolverEstoque() ? this.senhaGerente() : null,
      })
      .subscribe({
        next: (cancelada) => {
          this.processando.set(false);
          this.modalCancelamento.set(false);
          this.aplicar(cancelada);
          this.mostrarSucesso('Venda cancelada.');
        },
        error: (erro) => {
          this.processando.set(false);
          this.erroModal.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível cancelar a venda.'));
        },
      });
  }

  /** Parâmetros para lançar mais um pedido nesta conta. */
  novoPedidoParams(venda: Venda): Record<string, string | number> {
    return venda.tipo === 'MESA'
      ? { mesa: venda.mesaId ?? '' }
      : { tipo: 'retirada', venda: venda.id, cliente: venda.nomeCliente ?? '' };
  }

  private mostrarSucesso(mensagem: string): void {
    this.sucesso.set(mensagem);
    setTimeout(() => this.sucesso.set(null), 4000);
  }
}
