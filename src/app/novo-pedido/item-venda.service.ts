import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ItemVendaPayload {
  produtoId: number;
  quantidade: number;
}

export interface ItemPedidoResposta {
  id: number;
  pedidoId: number;
  produtoId: number;
  quantidade: number;
  valorUnitario: number;
}

const API_URL = `${environment.apiUrl}/item-pedido`;

@Injectable({ providedIn: 'root' })
export class ItemVendaService {
  constructor(private http: HttpClient) {}

  criar(pedidoId: number, item: ItemVendaPayload): Observable<ItemPedidoResposta> {
    return this.http.post<ItemPedidoResposta>(`${API_URL}/pedido/${pedidoId}`, item);
  }

  listarPorPedido(pedidoId: number): Observable<ItemPedidoResposta[] | null> {
    return this.http.get<ItemPedidoResposta[] | null>(`${API_URL}/pedido/${pedidoId}`);
  }
}
