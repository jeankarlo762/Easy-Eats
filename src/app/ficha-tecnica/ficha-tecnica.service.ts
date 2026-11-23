import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VinculoProdutoIngrediente {
  produtoId: number;
  ingredienteId: number;
  quantidade: number;
}

const API_URL = `${environment.apiUrl}/produto-ingrediente`;

/**
 * Endpoints /produto-ingrediente do backend (ficha técnica).
 * O POST recebe um lote { produtoId, ingredientes: [{ ingredienteId, quantidade }] }
 * e falha se algum ingrediente já estiver vinculado ao produto.
 */
@Injectable({ providedIn: 'root' })
export class FichaTecnicaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<VinculoProdutoIngrediente[]> {
    return this.http
      .get<VinculoProdutoIngrediente[] | null>(API_URL)
      .pipe(map((lista) => (lista ?? []).map((v) => ({ ...v, quantidade: Number(v.quantidade) }))));
  }

  adicionar(produtoId: number, ingredientes: { ingredienteId: number; quantidade: number }[]): Observable<unknown> {
    return this.http.post(API_URL, { produtoId, ingredientes });
  }

  remover(produtoId: number, ingredienteId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${produtoId}/${ingredienteId}`);
  }
}
