import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatusEntrega = 'AGUARDANDO_RETIRADA' | 'A_CAMINHO' | 'ENTREGUE';

export interface Entrega {
  id: number;
  nomeCliente: string;
  endereco: string;
  entregador: { id: number; nome: string } | null;
  status: StatusEntrega;
  dtCriacao: string | null;
  dtSaida: string | null;
  dtEntrega: string | null;
}

export interface EntregaPayload {
  nomeCliente: string;
  endereco: string;
  entregador: { id: number };
}

export interface EntregasDia {
  dia: string;
  entregas: number;
}

export interface RankingEntregador {
  nome: string;
  entregas: number;
}

export interface RelatorioDelivery {
  totalEntregas: number;
  tempoMedioEntregaMinutos: number;
  entregasPendentes: number;
  porDiaSemana: EntregasDia[];
  ranking: RankingEntregador[];
}

const API_URL = `${environment.apiUrl}/entregas`;

@Injectable({ providedIn: 'root' })
export class EntregaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Entrega[]> {
    return this.http.get<Entrega[]>(API_URL);
  }

  relatorio(): Observable<RelatorioDelivery> {
    return this.http.get<RelatorioDelivery>(`${API_URL}/relatorio`);
  }

  criar(payload: EntregaPayload): Observable<Entrega> {
    return this.http.post<Entrega>(API_URL, payload);
  }

  avancarStatus(id: number): Observable<Entrega> {
    return this.http.put<Entrega>(`${API_URL}/${id}/avancar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
