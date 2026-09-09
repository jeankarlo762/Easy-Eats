import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Entregador, EntregadorService } from './entregador.service';
import { Entrega, EntregaService, StatusEntrega } from './entrega.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

const LABEL_STATUS: Record<StatusEntrega, string> = {
  AGUARDANDO_RETIRADA: 'Aguardando Retirada',
  A_CAMINHO: 'A Caminho',
  ENTREGUE: 'Entregue',
};

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './delivery-dashboard.html',
  styleUrl: './delivery-dashboard.scss',
})
export class DeliveryDashboard implements OnInit {
  private fb = inject(FormBuilder);
  private entregadorService = inject(EntregadorService);
  private entregaService = inject(EntregaService);

  carregando = true;
  enviando = false;
  erro: string | null = null;
  erroFormulario: string | null = null;

  entregadores: Entregador[] = [];
  entregas: Entrega[] = [];

  form = this.fb.group({
    nomeCliente: ['', Validators.required],
    endereco: ['', Validators.required],
    entregadorId: [null as number | null, Validators.required],
  });

  formEntregador = this.fb.group({
    nome: ['', Validators.required],
    telefone: [''],
  });
  enviandoEntregador = false;

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando = true;

    Promise.all([
      new Promise<Entregador[]>((resolve, reject) => this.entregadorService.listar().subscribe({ next: resolve, error: reject })),
      new Promise<Entrega[]>((resolve, reject) => this.entregaService.listar().subscribe({ next: resolve, error: reject })),
    ])
      .then(([entregadores, entregas]) => {
        this.entregadores = entregadores;
        this.entregas = entregas;
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o dashboard de delivery.');
        this.carregando = false;
      });
  }

  get pedidosEmAndamento(): Entrega[] {
    return this.entregas.filter((e) => e.status !== 'ENTREGUE');
  }

  get pedidosEmRota(): number {
    return this.entregas.filter((e) => e.status === 'A_CAMINHO').length;
  }

  get entregadoresAtivos(): number {
    return this.entregadores.filter((e) => e.flAtivo).length;
  }

  get tempoMedioEntrega(): number {
    const entreguesHoje = this.entregas.filter((e) => e.status === 'ENTREGUE' && e.dtEntrega && e.dtCriacao);
    if (entreguesHoje.length === 0) return 0;

    const totalMinutos = entreguesHoje.reduce((soma, e) => {
      const minutos = (new Date(e.dtEntrega as string).getTime() - new Date(e.dtCriacao as string).getTime()) / 60000;
      return soma + minutos;
    }, 0);

    return Math.round(totalMinutos / entreguesHoje.length);
  }

  labelStatus(status: StatusEntrega): string {
    return LABEL_STATUS[status];
  }

  classeBadge(status: StatusEntrega): string {
    switch (status) {
      case 'ENTREGUE':
        return 'sucesso';
      case 'A_CAMINHO':
        return 'alerta';
      default:
        return 'neutro';
    }
  }

  criarEntrega() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nomeCliente, endereco, entregadorId } = this.form.value;
    this.enviando = true;
    this.erroFormulario = null;

    this.entregaService
      .criar({ nomeCliente: nomeCliente!, endereco: endereco!, entregador: { id: entregadorId! } })
      .subscribe({
        next: (entrega) => {
          this.entregas = [entrega, ...this.entregas];
          this.form.reset();
          this.enviando = false;
        },
        error: (erro) => {
          this.erroFormulario = MensagemErroApiUtil.extrair(erro, 'Não foi possível criar a entrega.');
          this.enviando = false;
        },
      });
  }

  criarEntregador() {
    if (this.formEntregador.invalid) {
      this.formEntregador.markAllAsTouched();
      return;
    }

    const { nome, telefone } = this.formEntregador.value;
    this.enviandoEntregador = true;

    this.entregadorService.criar({ nome: nome!, telefone: telefone || null, flAtivo: true }).subscribe({
      next: (entregador) => {
        this.entregadores = [...this.entregadores, entregador];
        this.formEntregador.reset();
        this.enviandoEntregador = false;
      },
      error: (erro) => {
        this.erroFormulario = MensagemErroApiUtil.extrair(erro, 'Não foi possível cadastrar o entregador.');
        this.enviandoEntregador = false;
      },
    });
  }

  avancarStatus(entrega: Entrega) {
    this.entregaService.avancarStatus(entrega.id).subscribe({
      next: (atualizada) => {
        const indice = this.entregas.findIndex((e) => e.id === atualizada.id);
        if (indice !== -1) this.entregas[indice] = atualizada;
      },
      error: (erro) => (this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível atualizar a entrega.')),
    });
  }
}
