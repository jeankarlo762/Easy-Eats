import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Cargo = 'Administrador' | 'Operador';
type StatusUsuario = 'Ativo' | 'Inativo';

interface UsuarioPlataforma {
  id: number;
  nome: string;
  email: string;
  empresa: string;
  cargo: Cargo;
  status: StatusUsuario;
}

@Component({
  selector: 'app-superadmin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-usuarios.html',
  styleUrl: './superadmin-usuarios.scss',
})
export class SuperadminUsuarios {
  termoBusca = '';
  filtroEmpresa = 'Todas';
  filtroCargo: 'Todos' | Cargo = 'Todos';
  filtroStatus: 'Todos' | StatusUsuario = 'Todos';

  usuarios: UsuarioPlataforma[] = [
    { id: 1, nome: 'Mateus Sousa', email: 'mateus.sousa@saborecia.com', empresa: 'Food Truck Sabor & Cia', cargo: 'Administrador', status: 'Ativo' },
    { id: 2, nome: 'Ana Ribeiro', email: 'ana.ribeiro@saborecia.com', empresa: 'Food Truck Sabor & Cia', cargo: 'Operador', status: 'Ativo' },
    { id: 3, nome: 'Carlos Mendes', email: 'carlos.mendes@burgerhouse.com', empresa: 'Burger House Ltda', cargo: 'Administrador', status: 'Ativo' },
    { id: 4, nome: 'Juliana Lima', email: 'juliana.lima@burgerhouse.com', empresa: 'Burger House Ltda', cargo: 'Operador', status: 'Inativo' },
    { id: 5, nome: 'Roberto Alves', email: 'roberto.alves@bellanapoli.com', empresa: 'Pizzaria Bella Napoli', cargo: 'Administrador', status: 'Inativo' },
    { id: 6, nome: 'Fernanda Costa', email: 'fernanda.costa@docesonho.com', empresa: 'Doceria Doce Sonho', cargo: 'Operador', status: 'Ativo' },
    { id: 7, nome: 'Bruno Teixeira', email: 'bruno.teixeira@docesonho.com', empresa: 'Doceria Doce Sonho', cargo: 'Administrador', status: 'Ativo' },
    { id: 8, nome: 'Patrícia Gomes', email: 'patricia.gomes@saborexpress.com', empresa: 'Rede Sabor Express', cargo: 'Operador', status: 'Ativo' },
  ];

  get empresasDisponiveis(): string[] {
    return ['Todas', ...Array.from(new Set(this.usuarios.map((u) => u.empresa))).sort()];
  }

  get usuariosFiltrados(): UsuarioPlataforma[] {
    const termo = this.termoBusca.trim().toLowerCase();

    return this.usuarios.filter((u) => {
      const bateBusca =
        !termo ||
        String(u.id).includes(termo) ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        u.empresa.toLowerCase().includes(termo);

      const bateEmpresa = this.filtroEmpresa === 'Todas' || u.empresa === this.filtroEmpresa;
      const bateCargo = this.filtroCargo === 'Todos' || u.cargo === this.filtroCargo;
      const bateStatus = this.filtroStatus === 'Todos' || u.status === this.filtroStatus;

      return bateBusca && bateEmpresa && bateCargo && bateStatus;
    });
  }

  limparFiltros() {
    this.termoBusca = '';
    this.filtroEmpresa = 'Todas';
    this.filtroCargo = 'Todos';
    this.filtroStatus = 'Todos';
  }

  alternarStatus(usuario: UsuarioPlataforma) {
    usuario.status = usuario.status === 'Ativo' ? 'Inativo' : 'Ativo';
  }

  badgeCargo(cargo: Cargo): string {
    return cargo === 'Administrador' ? 'roxo' : 'azul';
  }

  badgeStatus(status: StatusUsuario): string {
    return status === 'Ativo' ? 'sucesso' : 'neutro';
  }
}
