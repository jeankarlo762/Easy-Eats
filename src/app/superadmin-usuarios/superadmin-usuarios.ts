import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Perfil } from '../auth/auth.service';
import { Usuario, UsuarioService } from '../usuarios/usuario.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

const LABEL_CARGO: Record<Perfil, string> = {
  SUPERADMIN: 'Superadmin',
  ADMINISTRADOR: 'Administrador',
  OPERADOR: 'Operador',
  GARCOM: 'Garçom',
  COZINHEIRO: 'Cozinheiro',
};

@Component({
  selector: 'app-superadmin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, CarregandoComponent],
  templateUrl: './superadmin-usuarios.html',
  styleUrl: './superadmin-usuarios.scss',
})
export class SuperadminUsuarios implements OnInit {
  private usuarioService = inject(UsuarioService);

  carregando = true;
  erro: string | null = null;
  atualizandoId: number | null = null;

  termoBusca = '';
  filtroEmpresa = 'Todas';
  filtroCargo: 'Todos' | Perfil = 'Todos';
  filtroStatus: 'Todos' | 'Ativo' | 'Inativo' = 'Todos';

  usuarios: Usuario[] = [];

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os usuários da plataforma.');
        this.carregando = false;
      },
    });
  }

  get empresasDisponiveis(): string[] {
    const nomes = this.usuarios.map((u) => u.empresa?.nome ?? 'Sem empresa');
    return ['Todas', ...Array.from(new Set(nomes)).sort()];
  }

  get usuariosFiltrados(): Usuario[] {
    const termo = this.termoBusca.trim().toLowerCase();

    return this.usuarios.filter((u) => {
      const nomeEmpresa = u.empresa?.nome ?? 'Sem empresa';

      const bateBusca =
        !termo ||
        String(u.id).includes(termo) ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        nomeEmpresa.toLowerCase().includes(termo);

      const bateEmpresa = this.filtroEmpresa === 'Todas' || nomeEmpresa === this.filtroEmpresa;
      const bateCargo = this.filtroCargo === 'Todos' || u.role === this.filtroCargo;
      const status = u.flAtivo ? 'Ativo' : 'Inativo';
      const bateStatus = this.filtroStatus === 'Todos' || status === this.filtroStatus;

      return bateBusca && bateEmpresa && bateCargo && bateStatus;
    });
  }

  limparFiltros() {
    this.termoBusca = '';
    this.filtroEmpresa = 'Todas';
    this.filtroCargo = 'Todos';
    this.filtroStatus = 'Todos';
  }

  nomeEmpresa(usuario: Usuario): string {
    return usuario.empresa?.nome ?? 'Sem empresa';
  }

  labelCargo(cargo: Perfil): string {
    return LABEL_CARGO[cargo];
  }

  labelStatus(usuario: Usuario): 'Ativo' | 'Inativo' {
    return usuario.flAtivo ? 'Ativo' : 'Inativo';
  }

  badgeCargo(cargo: Perfil): string {
    return cargo === 'ADMINISTRADOR' || cargo === 'SUPERADMIN' ? 'roxo' : 'azul';
  }

  badgeStatus(usuario: Usuario): string {
    return usuario.flAtivo ? 'sucesso' : 'neutro';
  }

  alternarStatus(usuario: Usuario) {
    this.atualizandoId = usuario.id;
    const novoStatus = !usuario.flAtivo;

    this.usuarioService
      .atualizar(usuario.id, {
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        flAtivo: novoStatus,
      })
      .subscribe({
        next: (usuarioAtualizado) => {
          usuario.flAtivo = usuarioAtualizado.flAtivo;
          this.atualizandoId = null;
        },
        error: (erro) => {
          this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível atualizar o status do usuário.');
          this.atualizandoId = null;
        },
      });
  }
}
