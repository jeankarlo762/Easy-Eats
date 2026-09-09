import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FichaTecnicaItem {
  id: number;
  produto: { id: number; nome: string };
  insumo: { id: number; nome: string; preco: number; custo: number | null };
  quantidade: number;
}

export interface FichaTecnicaItemPayload {
  insumoId: number;
  quantidade: number;
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

  remover(produtoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${produtoId}/ficha-tecnica/${id}`);
  }
}
