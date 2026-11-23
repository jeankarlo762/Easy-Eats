import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, PERFIS_GESTAO, Perfil } from '../auth/auth.service';
import { Comanda, ComandaService, filtrarPorPeriodo } from '../comandas/comanda.service';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { PeriodoUtil } from '../utils/periodoUtil';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

interface AcaoRapida {
  label: string;
  descricao: string;
  icon: string;
  cor: string;
  rota: string;
  perfis?: Perfil[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CarregandoComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private authService = inject(AuthService);
  private comandaService = inject(ComandaService);

  private readonly todasAcoes: AcaoRapida[] = [
    { label: 'Novo Pedido', descricao: 'Monte um pedido para uma mesa', icon: 'bi-plus-circle', cor: 'laranja', rota: '/novo-pedido' },
    { label: 'Tela Cozinha', descricao: 'Acompanhe e avance os pedidos', icon: 'bi-egg-fried', cor: 'verde', rota: '/tela-cozinha' },
    { label: 'Mesas', descricao: 'Veja as mesas livres e ocupadas', icon: 'bi-grid-3x3-gap', cor: 'azul', rota: '/mesas' },
    { label: 'Histórico', descricao: 'Consulte os pedidos realizados', icon: 'bi-clock-history', cor: 'roxo', rota: '/historico-vendas' },
    { label: 'Dashboard', descricao: 'Indicadores da operação', icon: 'bi-speedometer2', cor: 'azul', rota: '/dashboard', perfis: PERFIS_GESTAO },
    { label: 'Estoque', descricao: 'Ingredientes e quantidades', icon: 'bi-box-seam', cor: 'verde', rota: '/controle-estoque', perfis: PERFIS_GESTAO },
    { label: 'Produtos', descricao: 'Catálogo e preços', icon: 'bi-basket3', cor: 'roxo', rota: '/cadastro-produto', perfis: PERFIS_GESTAO },
    { label: 'Financeiro', descricao: 'Faturamento por período', icon: 'bi-cash-coin', cor: 'laranja', rota: '/financeiro', perfis: PERFIS_GESTAO },
  ];

  readonly acoes = this.todasAcoes.filter((acao) => !acao.perfis || this.authService.temPerfil(acao.perfis));
  readonly nome = this.authService.usuario()?.nome ?? '';

  carregando = signal(true);
  erro = signal<string | null>(null);
  pedidos = signal<Comanda[]>([]);

  aguardando = computed(() => this.pedidos().filter((p) => p.status === 'ABERTO').length);
  emPreparo = computed(() => this.pedidos().filter((p) => p.status === 'EM_PREPARO').length);
  finalizadosHoje = computed(() => {
    const hoje = PeriodoUtil.paraIso(new Date());
    return filtrarPorPeriodo(this.pedidos(), hoje, hoje).filter((p) => p.status === 'FINALIZADO').length;
  });

  ngOnInit(): void {
    this.comandaService.listar().subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o resumo de pedidos.'));
        this.carregando.set(false);
      },
    });
  }
}
