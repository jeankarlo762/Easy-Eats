import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ClienteRanking {
  nome: string;
  pontos: number;
}

@Component({
  selector: 'app-fidelidade',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fidelidade.html',
  styleUrl: './fidelidade.scss',
})
export class Fidelidade {
  clientesParticipantes = 128;
  pontosDistribuidosNoMes = 940;
  descontosResgatadosNoMes = 37;

  rankingClientes: ClienteRanking[] = [
    { nome: 'Ana Paula Ferreira', pontos: 86 },
    { nome: 'Carlos Eduardo Lima', pontos: 74 },
    { nome: 'Marina Souza Costa', pontos: 61 },
    { nome: 'Ricardo Alves Nunes', pontos: 52 },
    { nome: 'Juliana Martins Rocha', pontos: 45 },
    { nome: 'Fábio Henrique Dias', pontos: 38 },
    { nome: 'Patrícia Gomes Silva', pontos: 29 },
  ].sort((a, b) => b.pontos - a.pontos);
}
