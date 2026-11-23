import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { AuthService, PERFIS_GESTAO } from '../auth/auth.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import {
  Caixa,
  CaixaService,
  MovimentacaoCaixa,
  TIPO_MOVIMENTACAO_LABEL,
  TipoLancavel,
  ehSaida,
} from './caixa.service';

/** Quantidade de lançamentos do turno exibidos na tela (o histórico completo fica em Lançamentos). */
const LANCAMENTOS_DO_TURNO = 100;

@Component({
  selector: 'app-caixa',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './caixa.html',
  styleUrl: './caixa.scss',
})
export class CaixaComponent implements OnInit {
  private caixaService = inject(CaixaService);

  /** Sangria, fechamento e lista de lançamentos são restritos a Administrador e Gerente. */
  readonly podeGerir = inject(AuthService).temPerfil(PERFIS_GESTAO);
  readonly tipoLabel = TIPO_MOVIMENTACAO_LABEL;
  readonly ehSaida = ehSaida;

  caixa = signal<Caixa | null>(null);
  lancamentos = signal<MovimentacaoCaixa[]>([]);
  /** Caixa recém-fechado, exibido como resumo até o operador dispensar ou abrir outro. */
  fechado = signal<Caixa | null>(null);

  carregando = signal(true);
  processando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);
  erroModal = signal<string | null>(null);
  modalMovimento = signal<TipoLancavel | null>(null);
  modalFechamento = signal(false);

  formAbertura = new FormGroup({
    fundoCaixa: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    observacao: new FormControl('', { nonNullable: true }),
  });

  formMovimento = new FormGroup({
    valor: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    descricao: new FormControl('', { nonNullable: true }),
  });

  formFechamento = new FormGroup({
    valorContado: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    observacao: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.caixaService.atual().subscribe({
      next: (caixa) => {
        this.caixa.set(caixa);
        this.carregando.set(false);
        this.carregarLancamentos(caixa);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o caixa.'));
        this.carregando.set(false);
      },
    });
  }

  private carregarLancamentos(caixa: Caixa | null): void {
    if (!caixa || !this.podeGerir) {
      this.lancamentos.set([]);
      return;
    }
    this.caixaService.listarMovimentacoes({ caixaId: caixa.id }, 0, LANCAMENTOS_DO_TURNO).subscribe({
      next: (pagina) => this.lancamentos.set(pagina.itens),
      error: () => this.lancamentos.set([]),
    });
  }

  // ---------------------------------------------------------------- abertura

  abrir(): void {
    if (this.formAbertura.invalid) {
      this.formAbertura.markAllAsTouched();
      return;
    }
    const { fundoCaixa, observacao } = this.formAbertura.getRawValue();
    this.processando.set(true);
    this.erro.set(null);
    this.caixaService.abrir(Number(fundoCaixa), observacao.trim() || null).subscribe({
      next: (caixa) => {
        this.processando.set(false);
        this.caixa.set(caixa);
        this.fechado.set(null);
        this.formAbertura.reset({ fundoCaixa: null, observacao: '' });
        this.carregarLancamentos(caixa);
        this.mostrarSucesso('Caixa aberto.');
      },
      error: (erro) => {
        this.processando.set(false);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível abrir o caixa.'));
      },
    });
  }

  // ------------------------------------------------------ suprimento e sangria

  abrirMovimento(tipo: TipoLancavel): void {
    const descricao = this.formMovimento.controls.descricao;
    // a sangria exige motivo; o suprimento aceita descrição vazia
    descricao.setValidators(tipo === 'SANGRIA' ? [Validators.required] : []);
    descricao.updateValueAndValidity();
    this.formMovimento.reset({ valor: null, descricao: '' });
    this.erroModal.set(null);
    this.modalMovimento.set(tipo);
  }

  confirmarMovimento(): void {
    const tipo = this.modalMovimento();
    const caixa = this.caixa();
    if (!tipo || !caixa) {
      return;
    }
    if (this.formMovimento.invalid) {
      this.formMovimento.markAllAsTouched();
      return;
    }
    const { valor, descricao } = this.formMovimento.getRawValue();
    this.processando.set(true);
    this.erroModal.set(null);
    this.caixaService.lancar(caixa.id, tipo, Number(valor), descricao.trim() || null).subscribe({
      next: () => {
        this.processando.set(false);
        this.fecharModais();
        this.carregarLancamentos(caixa);
        this.mostrarSucesso(tipo === 'SANGRIA' ? 'Sangria registrada.' : 'Suprimento registrado.');
      },
      error: (erro) => {
        this.processando.set(false);
        this.erroModal.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível registrar o lançamento.'));
      },
    });
  }

  // --------------------------------------------------------------- fechamento

  abrirFechamento(): void {
    this.formFechamento.reset({ valorContado: null, observacao: '' });
    this.erroModal.set(null);
    this.modalFechamento.set(true);
  }

  confirmarFechamento(): void {
    const caixa = this.caixa();
    if (!caixa) {
      return;
    }
    if (this.formFechamento.invalid) {
      this.formFechamento.markAllAsTouched();
      return;
    }
    const { valorContado, observacao } = this.formFechamento.getRawValue();
    this.processando.set(true);
    this.erroModal.set(null);
    this.caixaService.fechar(caixa.id, Number(valorContado), observacao.trim() || null).subscribe({
      next: (fechado) => {
        this.processando.set(false);
        this.fecharModais();
        this.caixa.set(null);
        this.lancamentos.set([]);
        this.fechado.set(fechado);
      },
      error: (erro) => {
        this.processando.set(false);
        this.erroModal.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível fechar o caixa.'));
      },
    });
  }

  fecharModais(): void {
    this.modalMovimento.set(null);
    this.modalFechamento.set(false);
    this.erroModal.set(null);
  }

  rotuloDiferenca(diferenca: number | null): string {
    if (!diferenca) {
      return 'Sem diferença';
    }
    return diferenca > 0 ? 'Sobra' : 'Falta';
  }

  /** Verde sem diferença, amarelo com sobra, vermelho com falta. */
  classeDiferenca(diferenca: number | null): string {
    if (!diferenca) {
      return 'sucesso';
    }
    return diferenca > 0 ? 'aviso' : 'erro';
  }

  private mostrarSucesso(mensagem: string): void {
    this.sucesso.set(mensagem);
    setTimeout(() => this.sucesso.set(null), 4000);
  }
}
