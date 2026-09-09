import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Entregador {
  id: number;
  nome: string;
  telefone: string | null;
  flAtivo: boolean | null;
}

export interface EntregadorPayload {
  nome: string;
  telefone: string | null;
  flAtivo: boolean;
}

const API_URL = `${environment.apiUrl}/entregadores`;

@Injectable({ providedIn: 'root' })
export class EntregadorService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Entregador[]> {
    return this.http.get<Entregador[]>(API_URL);
  }

  criar(payload: EntregadorPayload): Observable<Entregador> {
    return this.http.post<Entregador>(API_URL, payload);
  }

  atualizar(id: number, payload: EntregadorPayload): Observable<Entregador> {
    return this.http.put<Entregador>(`${API_URL}/${id}`, payload);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
