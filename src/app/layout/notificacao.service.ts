import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notificacao {
  id: number;
  icone: string;
  cor: string;
  titulo: string;
  descricao: string;
  lida: boolean;
  dtCriacao: string | null;
}

const API_URL = `${environment.apiUrl}/notificacoes`;

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(API_URL);
  }

  marcarComoLida(id: number): Observable<Notificacao> {
    return this.http.put<Notificacao>(`${API_URL}/${id}/lida`, {});
  }

  marcarTodasComoLidas(): Observable<void> {
    return this.http.put<void>(`${API_URL}/marcar-todas-lidas`, {});
  }
}
