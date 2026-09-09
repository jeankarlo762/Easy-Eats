import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatusPedidoCompra = 'AGUARDANDO' | 'ENVIADO' | 'RECEBIDO';

export interface PedidoCompra {
  id: number;
  fornecedor: { id: number; nome: string };
  itens: string;
  valorTotal: number;
  status: StatusPedidoCompra;
  dtCriacao: string | null;
}

export interface PedidoCompraPayload {
  fornecedor: { id: number };
  itens: string;
  valorTotal: number;
}

const API_URL = `${environment.apiUrl}/pedidos-compra`;

@Injectable({ providedIn: 'root' })
export class PedidoCompraService {
  constructor(private http: HttpClient) {}

  listar(): Observable<PedidoCompra[]> {
    return this.http.get<PedidoCompra[]>(API_URL);
  }

  criar(payload: PedidoCompraPayload): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(API_URL, payload);
  }

  avancarStatus(id: number): Observable<PedidoCompra> {
    return this.http.put<PedidoCompra>(`${API_URL}/${id}/avancar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
