import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UnidadeMedida } from '../cadastro-produto/produto.service';

// Vínculo persistido produto × ingrediente × quantidade utilizada (na unidade
// de medida do ingrediente).
export interface FichaTecnicaItem {
  id: number;
  produtoId: number;
  ingredienteId: number;
  produto: { id: number; nome: string };
  ingrediente: {
    id: number;
    nome: string;
    preco: number;
    custo: number | null;
    unidadeMedida: UnidadeMedida | null;
  };
  quantidadeUtilizada: number;
}

export interface FichaTecnicaItemPayload {
  ingredienteId: number;
  quantidadeUtilizada: number;
}

const API_URL = `${environment.apiUrl}/produtos`;

/** Custo unitário de um ingrediente: insumos antigos guardavam o preço de compra em "preco". */
export function custoIngrediente(ingrediente: { custo?: number | null; preco?: number | null }): number {
  return ingrediente.custo ?? ingrediente.preco ?? 0;
}

@Injectable({ providedIn: 'root' })
export class FichaTecnicaService {
  constructor(private http: HttpClient) {}

  listar(produtoId: number): Observable<FichaTecnicaItem[]> {
    return this.http.get<FichaTecnicaItem[]>(`${API_URL}/${produtoId}/ficha-tecnica`);
  }

  custoTotal(produtoId: number): Observable<{ custoTotal: number }> {
    return this.http.get<{ custoTotal: number }>(`${API_URL}/${produtoId}/ficha-tecnica/custo-total`);
  }

  adicionar(produtoId: number, payload: FichaTecnicaItemPayload): Observable<FichaTecnicaItem> {
    return this.http.post<FichaTecnicaItem>(`${API_URL}/${produtoId}/ficha-tecnica`, payload);
  }

  // Grava a composição inteira de uma vez (inclui, altera e remove itens).
  substituir(produtoId: number, itens: FichaTecnicaItemPayload[]): Observable<FichaTecnicaItem[]> {
    return this.http.put<FichaTecnicaItem[]>(`${API_URL}/${produtoId}/ficha-tecnica`, itens);
  }

  atualizar(produtoId: number, id: number, payload: FichaTecnicaItemPayload): Observable<FichaTecnicaItem> {
    return this.http.put<FichaTecnicaItem>(`${API_URL}/${produtoId}/ficha-tecnica/${id}`, payload);
  }

  remover(produtoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${produtoId}/ficha-tecnica/${id}`);
  }
}
