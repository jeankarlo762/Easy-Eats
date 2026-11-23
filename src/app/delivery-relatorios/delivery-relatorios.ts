import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface EntregasDia {
  dia: string;
  entregas: number;
}

interface RankingEntregador {
  nome: string;
  entregas: number;
}

@Component({
  selector: 'app-delivery-relatorios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-relatorios.html',
  styleUrl: './delivery-relatorios.scss',
})
export class DeliveryRelatorios {
  readonly totalEntregas = 214;
  readonly tempoMedioEntrega = 31;
  readonly taxaAtraso = 6.8;

  readonly porDia: EntregasDia[] = [
    { dia: 'Segunda', entregas: 24 },
    { dia: 'Terça', entregas: 28 },
    { dia: 'Quarta', entregas: 30 },
    { dia: 'Quinta', entregas: 26 },
    { dia: 'Sexta', entregas: 38 },
    { dia: 'Sábado', entregas: 42 },
    { dia: 'Domingo', entregas: 26 },
  ];

  readonly ranking: RankingEntregador[] = [
    { nome: 'Carlos Souza', entregas: 68 },
    { nome: 'Fernanda Dias', entregas: 57 },
    { nome: 'Diego Martins', entregas: 49 },
    { nome: 'Aline Costa', entregas: 40 },
  ].sort((a, b) => b.entregas - a.entregas);

  get maiorEntregasDia(): number {
    return Math.max(...this.porDia.map((d) => d.entregas));
  }
}
