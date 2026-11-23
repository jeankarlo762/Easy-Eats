import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type StatusEntrega = 'Aguardando Retirada' | 'A Caminho' | 'Entregue';

interface PedidoEntrega {
  cliente: string;
  endereco: string;
  entregador: string;
  status: StatusEntrega;
}

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-dashboard.html',
  styleUrl: './delivery-dashboard.scss',
})
export class DeliveryDashboard {
  readonly pedidosEmRota = 7;
  readonly tempoMedioEntrega = 28;
  readonly entregadoresAtivos = 4;
  readonly taxaNoPrazo = 91.5;

  readonly pedidos: PedidoEntrega[] = [
    {
      cliente: 'Marina Alves',
      endereco: 'Rua das Flores, 123 - Centro',
      entregador: 'Carlos Souza',
      status: 'A Caminho',
    },
    {
      cliente: 'João Pedro Lima',
      endereco: 'Av. Brasil, 890 - Jardim América',
      entregador: 'Fernanda Dias',
      status: 'Aguardando Retirada',
    },
    {
      cliente: 'Beatriz Ramos',
      endereco: 'Rua Sete de Setembro, 45 - Centro',
      entregador: 'Carlos Souza',
      status: 'Entregue',
    },
    {
      cliente: 'Rafael Torres',
      endereco: 'Rua dos Ipês, 210 - Vila Nova',
      entregador: 'Diego Martins',
      status: 'A Caminho',
    },
    {
      cliente: 'Camila Ferreira',
      endereco: 'Av. Paulista, 1500 - Bela Vista',
      entregador: 'Fernanda Dias',
      status: 'Aguardando Retirada',
    },
    {
      cliente: 'Lucas Nogueira',
      endereco: 'Rua Bahia, 78 - Centro',
      entregador: 'Diego Martins',
      status: 'Entregue',
    },
  ];

  classeBadge(status: StatusEntrega): string {
    switch (status) {
      case 'Entregue':
        return 'sucesso';
      case 'A Caminho':
        return 'alerta';
      default:
        return 'neutro';
    }
  }
}
