import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Permissao {
  modulo: string;
  concedida: boolean;
}

@Component({
  selector: 'app-grupos-acesso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grupos-acesso.html',
  styleUrl: './grupos-acesso.scss',
})
export class GruposAcesso {
  permissoesAdministrador: Permissao[] = [
    { modulo: 'Dashboard', concedida: true },
    { modulo: 'Pedido', concedida: true },
    { modulo: 'Cozinha', concedida: true },
    { modulo: 'Estoque', concedida: true },
    { modulo: 'Compras', concedida: true },
    { modulo: 'Financeiro', concedida: true },
    { modulo: 'Produtos', concedida: true },
    { modulo: 'Clientes', concedida: true },
    { modulo: 'Usuários', concedida: true },
    { modulo: 'Configurações', concedida: true },
  ];

  permissoesOperador: Permissao[] = [
    { modulo: 'Dashboard', concedida: true },
    { modulo: 'Pedido', concedida: true },
    { modulo: 'Cozinha', concedida: true },
    { modulo: 'Estoque', concedida: false },
    { modulo: 'Compras', concedida: false },
    { modulo: 'Financeiro', concedida: false },
    { modulo: 'Produtos', concedida: false },
    { modulo: 'Clientes', concedida: true },
    { modulo: 'Usuários', concedida: false },
    { modulo: 'Configurações', concedida: false },
  ];
}
