import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Sidebar } from '../../components/sidebar/sidebar';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import { Notificacao, NotificacaoService } from './notificacao.service';

const CHAVE_SIDEBAR_COLAPSADO = 'easyeats.sidebarColapsado';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout implements OnInit {
  private notificacaoService = inject(NotificacaoService);

  colapsado = signal(localStorage.getItem(CHAVE_SIDEBAR_COLAPSADO) === 'true');
  notificacoesAbertas = signal(false);
  menuMobileAberto = signal(false);

  notificacoes: Notificacao[] = [];

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
  ) {
    this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)).subscribe(() => {
      this.menuMobileAberto.set(false);
    });
  }

  ngOnInit() {
    this.carregarNotificacoes();
  }

  private carregarNotificacoes() {
    this.notificacaoService.listar().subscribe({
      next: (notificacoes) => (this.notificacoes = notificacoes),
      error: () => {},
    });
  }

  alternarMenuMobile() {
    this.menuMobileAberto.update((valor) => !valor);
  }

  fecharMenuMobile() {
    this.menuMobileAberto.set(false);
  }

  get naoLidas(): number {
    return this.notificacoes.filter((n) => !n.lida).length;
  }

  alternarSidebar() {
    this.colapsado.update((valor) => !valor);
    localStorage.setItem(CHAVE_SIDEBAR_COLAPSADO, String(this.colapsado()));
  }

  alternarNotificacoes() {
    this.notificacoesAbertas.update((v) => !v);
  }

  marcarTodasComoLidas() {
    this.notificacaoService.marcarTodasComoLidas().subscribe({
      next: () => this.notificacoes.forEach((n) => (n.lida = true)),
    });
  }

  marcarComoLida(notificacao: Notificacao) {
    if (notificacao.lida) return;

    this.notificacaoService.marcarComoLida(notificacao.id).subscribe({
      next: () => (notificacao.lida = true),
    });
  }

  tempoRelativo(dtCriacao: string | null): string {
    if (!dtCriacao) return '';

    const diffMs = Date.now() - new Date(dtCriacao).getTime();
    const minutos = Math.floor(diffMs / 60000);

    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} h`;

    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'ontem' : `há ${dias} dias`;
  }

  get iniciais(): string {
    const nome = this.authService.usuario()?.nome ?? '';
    return nome
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  }

  irParaPerfil() {
    const role = this.authService.usuario()?.role;
    const rota = role === 'OPERADOR' || role === 'GARCOM' ? '/perfil-garcom' : '/perfil-admin';
    this.router.navigate([rota]);
  }

  sair() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
