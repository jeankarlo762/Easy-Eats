import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Segmento } from '../superadmin-segmentos/segmento.service';

export interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string | null;
  flAtivo: boolean;
  segmento: Segmento | null;
}

export interface EmpresaPayload {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string | null;
  flAtivo: boolean;
  segmento: { id: number } | null;
}

const API_URL = `${environment.apiUrl}/empresa`;

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(API_URL);
  }

  buscarPorId(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${API_URL}/${id}`);
  }

  criar(empresa: EmpresaPayload): Observable<Empresa> {
    return this.http.post<Empresa>(API_URL, empresa);
  }

  atualizar(id: number, empresa: EmpresaPayload): Observable<Empresa> {
    return this.http.put<Empresa>(`${API_URL}/${id}`, empresa);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
