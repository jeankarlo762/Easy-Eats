import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProdutoPublico {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria: string | null;
}

export interface CardapioPublico {
  empresa: { nome: string; slug: string; horarioFuncionamento: string | null };
  mesa: { id: number; numero: number } | null;
  produtos: ProdutoPublico[];
}

export interface PedidoPublicoPayload {
  nomeCliente: string | null;
  mesaId: number | null;
  itens: { produtoId: number; quantidade: number; observacao: string | null }[];
}

export interface PedidoPublicoCriado {
  numeroPedido: number;
  status: string;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CardapioPublicoService {
  private http = inject(HttpClient);

  buscarCardapio(slug: string, mesaId: number | null): Observable<CardapioPublico> {
    let params = new HttpParams();
    if (mesaId) params = params.set('mesa', mesaId);
    return this.http.get<CardapioPublico>(
      `${environment.apiUrl}/public/cardapio/${encodeURIComponent(slug)}`,
      { params },
    );
  }

  criarPedido(slug: string, pedido: PedidoPublicoPayload): Observable<PedidoPublicoCriado> {
    return this.http.post<PedidoPublicoCriado>(
      `${environment.apiUrl}/public/cardapio/${encodeURIComponent(slug)}/pedido`,
      pedido,
    );
  }

  /** Autenticado: slug da empresa logada, usado para montar o link do QR Code. */
  meuLink(): Observable<{ slug: string }> {
    return this.http.get<{ slug: string }>(`${environment.apiUrl}/cardapio-publico/meu-link`);
  }
}
