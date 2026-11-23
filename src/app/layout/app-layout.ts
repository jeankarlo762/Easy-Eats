import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { catchError, filter, forkJoin, interval, of, startWith, switchMap } from 'rxjs';
import { Sidebar } from '../../components/sidebar/sidebar';
import { AuthService, PERFIL_LABEL, PERFIS_GESTAO } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import { EstoqueService } from '../controle-estoque/estoque.service';
import { ComandaService } from '../comandas/comanda.service';

const CHAVE_SIDEBAR_COLAPSADO = 'easyeats.sidebarColapsado';
const INTERVALO_NOTIFICACOES_MS = 60_000;

interface Notificacao {
  chave: string;
  icone: string;
  cor: 'laranja' | 'vermelho' | 'verde' | 'azul';
  titulo: string;
  descricao: string;
  rota: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private estoqueService = inject(EstoqueService);
  private comandaService = inject(ComandaService);
  private destroyRef = inject(DestroyRef);

  colapsado = signal(localStorage.getItem(CHAVE_SIDEBAR_COLAPSADO) === 'true');
  notificacoesAbertas = signal(false);
  menuMobileAberto = signal(false);

  /** Notificações reais, montadas a partir de GET /pedido?status=ABERTO e GET /estoques/alertas. */
  notificacoes = signal<Notificacao[]>([]);
  private lidas = new Set<string>();

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuMobileAberto.set(false);
        this.notificacoesAbertas.set(false);
      });
  }

  ngOnInit(): void {
    const gestao = this.authService.temPerfil(PERFIS_GESTAO);

    interval(INTERVALO_NOTIFICACOES_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            aguardando: this.comandaService.listarPorStatus('ABERTO').pipe(catchError(() => of([]))),
            alertas: gestao ? this.estoqueService.listarAlertas().pipe(catchError(() => of([]))) : of([]),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ aguardando, alertas }) => {
        const lista: Notificacao[] = [];

        if (aguardando.length > 0) {
          lista.push({
            chave: `aguardando-${aguardando.map((p) => p.id).join(',')}`,
            icone: 'bi-cart-check',
            cor: 'laranja',
            titulo: aguardando.length === 1 ? '1 pedido aguardando' : `${aguardando.length} pedidos aguardando`,
            descricao: 'Pedidos ainda não iniciados pela cozinha.',
            rota: '/tela-cozinha',
          });
        }

        for (const alerta of alertas) {
          lista.push({
            chave: `estoque-${alerta.id}-${alerta.qtdAtual}`,
            icone: 'bi-exclamation-triangle',
            cor: 'vermelho',
            titulo: 'Repor estoque',
            descricao: `${alerta.nomeIngrediente ?? 'Ingrediente'}: ${alerta.qtdAtual.toLocaleString('pt-BR')} (mínimo ${alerta.qtdMinima.toLocaleString('pt-BR')}).`,
            rota: '/controle-estoque',
          });
        }

        this.notificacoes.set(lista);
      });
  }

  get labelPerfil(): string {
    const role = this.authService.usuario()?.role;
    return role ? PERFIL_LABEL[role] : '';
  }

  get naoLidas(): number {
    return this.notificacoes().filter((n) => !this.lidas.has(n.chave)).length;
  }

  estaLida(notificacao: Notificacao): boolean {
    return this.lidas.has(notificacao.chave);
  }

  alternarMenuMobile() {
    this.menuMobileAberto.update((valor) => !valor);
  }

  fecharMenuMobile() {
    this.menuMobileAberto.set(false);
  }

  alternarSidebar() {
    this.colapsado.update((valor) => !valor);
    localStorage.setItem(CHAVE_SIDEBAR_COLAPSADO, String(this.colapsado()));
  }

  alternarNotificacoes() {
    this.notificacoesAbertas.update((v) => !v);
  }

  marcarTodasComoLidas() {
    this.notificacoes().forEach((n) => this.lidas.add(n.chave));
  }

  abrirNotificacao(notificacao: Notificacao) {
    this.lidas.add(notificacao.chave);
    this.notificacoesAbertas.set(false);
    this.router.navigate([notificacao.rota]);
  }

  get iniciais(): string {
    const nome = this.authService.usuario()?.nome ?? '';
    return nome
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  }

  irParaPerfil() {
    this.router.navigate(['/perfil']);
  }

  sair() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
