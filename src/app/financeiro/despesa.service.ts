import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Despesa {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  dtDespesa: string;
}

export interface DespesaPayload {
  descricao: string;
  categoria: string;
  valor: number;
  dtDespesa: string;
}

const API_URL = `${environment.apiUrl}/despesa`;

@Injectable({ providedIn: 'root' })
export class DespesaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(API_URL);
  }

  criar(payload: DespesaPayload): Observable<Despesa> {
    return this.http.post<Despesa>(API_URL, payload);
  }

  atualizar(id: number, payload: DespesaPayload): Observable<Despesa> {
    return this.http.put<Despesa>(`${API_URL}/${id}`, payload);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
