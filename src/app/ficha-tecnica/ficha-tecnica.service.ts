import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UnidadeMedida } from '../cadastro-produto/produto.service';

// Vínculo produto × ingrediente × quantidade utilizada, persistido no backend
// (base para custo, planejamento de produção e baixa de estoque).
export interface FichaTecnicaItem {
  id: number;
  produtoId: number;
  ingredienteId: number;
  ingredienteNome: string;
  unidadeMedida: UnidadeMedida | null;
  custoUnitario: number;
  quantidadeUtilizada: number;
  custoTotal: number;
}

export interface FichaTecnicaItemPayload {
  ingredienteId: number;
  quantidadeUtilizada: number;
}

const API_URL = `${environment.apiUrl}/produtos`;

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

  atualizar(produtoId: number, id: number, payload: FichaTecnicaItemPayload): Observable<FichaTecnicaItem> {
    return this.http.put<FichaTecnicaItem>(`${API_URL}/${produtoId}/ficha-tecnica/${id}`, payload);
  }

  // Substitui a composição inteira do produto (usado ao salvar o cadastro do produto).
  substituir(produtoId: number, itens: FichaTecnicaItemPayload[]): Observable<FichaTecnicaItem[]> {
    return this.http.put<FichaTecnicaItem[]>(`${API_URL}/${produtoId}/ficha-tecnica`, itens);
  }

  remover(produtoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${produtoId}/ficha-tecnica/${id}`);
  }
}
