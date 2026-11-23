import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { FormaPagamento } from '../vendas/venda.service';

export type TipoEntrega = 'DELIVERY' | 'RETIRADA';

export interface ProdutoCardapio {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
}

export interface CategoriaCardapio {
  id: number;
  nome: string;
  produtos: ProdutoCardapio[];
}

/** Espelha o CardapioPublicoDto do backend. */
export interface CardapioPublico {
  nomeEstabelecimento: string;
  aceitaDelivery: boolean;
  aceitaRetirada: boolean;
  formasPagamento: FormaPagamento[];
  categorias: CategoriaCardapio[];
}

export interface EnderecoEntrega {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  referencia: string;
}

/** Espelha o PedidoCardapioDto do backend. */
export interface PedidoCardapioPayload {
  nome: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco: EnderecoEntrega | null;
  formaPagamento: FormaPagamento;
  trocoPara: number | null;
  observacao: string | null;
  itens: { produtoId: number; quantidade: number }[];
}

export interface PedidoCardapioCriado {
  numeroPedido: number;
  tipoEntrega: TipoEntrega;
  total: number;
  formaPagamento: FormaPagamento;
}

const API_URL = `${environment.apiUrl}/publico/cardapio`;

/** Rotas públicas (sem login) do cardápio digital aberto pelo QR Code. */
@Injectable({ providedIn: 'root' })
export class CardapioPublicoService {
  private http = inject(HttpClient);

  buscarCardapio(): Observable<CardapioPublico> {
    return this.http.get<CardapioPublico>(API_URL);
  }

  fazerPedido(pedido: PedidoCardapioPayload): Observable<PedidoCardapioCriado> {
    return this.http.post<PedidoCardapioCriado>(`${API_URL}/pedidos`, pedido);
  }
}
