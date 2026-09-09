import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { StatusPedidoEnum } from './enum/pedidosEnum';

export interface Pedido {
  id: number;
  status: StatusPedidoEnum;
  nomeProduto: string;
  quantidadeProduto: number;
  dataCriacao: string | null;
  dtInicioPreparo: string | null;
  dtPronto: string | null;
}

export interface PedidoPayload {
  nomeProduto: string;
  quantidadeProduto: number;
}

export interface ItemPreparado {
  nome: string;
  quantidade: number;
}

export interface TempoHorario {
  hora: string;
  minutos: number;
}

export interface RelatorioCozinha {
  pedidosPreparadosHoje: number;
  tempoMedioPreparoMinutos: number;
  pedidosAtrasados: number;
  itensMaisPreparados: ItemPreparado[];
  tempoPorHorario: TempoHorario[];
}

const API_URL = `${environment.apiUrl}/pedidos`;

@Injectable({ providedIn: 'root' })
export class PedidoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(API_URL);
  }

  fila(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API_URL}/fila`);
  }

  criar(payload: PedidoPayload): Observable<Pedido> {
    return this.http.post<Pedido>(`${API_URL}/criarPedido`, payload);
  }

  iniciarPreparo(id: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${API_URL}/${id}/iniciar`, {});
  }

  marcarPronto(id: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${API_URL}/${id}/pronto`, {});
  }

  relatorioCozinha(): Observable<RelatorioCozinha> {
    return this.http.get<RelatorioCozinha>(`${API_URL}/relatorio-cozinha`);
  }
}
