import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PontoVendaDia {
  dia: string;
  valor: number;
}

export interface FormaPagamentoResumo {
  metodo: string;
  valor: number;
}

export interface ProdutoRanking {
  nomeProduto: string;
  quantidadeVendida: number;
  faturamentoTotal: number;
}

export interface PontoHorario {
  hora: string;
  pedidos: number;
}

export interface DashboardResumo {
  vendasHoje: number;
  variacaoVendas: number | null;
  pedidosHoje: number;
  variacaoPedidos: number | null;
  ticketMedioHoje: number;
  variacaoTicketMedio: number | null;
  lucroHoje: number;
  variacaoLucro: number | null;
  emPreparo: number;
  prontos: number;
  entreguesHoje: number;
  estoqueCritico: number;
  vendasSemana: PontoVendaDia[];
  formasPagamento: FormaPagamentoResumo[];
  produtosMaisVendidos: ProdutoRanking[];
  horarioMovimento: PontoHorario[];
}

const API_URL = `${environment.apiUrl}/dashboard`;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  resumo(): Observable<DashboardResumo> {
    return this.http.get<DashboardResumo>(`${API_URL}/resumo`);
  }
}
