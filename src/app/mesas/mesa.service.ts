import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mesa {
  id: number;
  numero: number;
  ativa: boolean;
}

interface ApiMesa {
  id: number | null;
  numero: number;
  flativo: string | null;
}

const API_URL = `${environment.apiUrl}/mesa`;

/**
 * Endpoints /mesa do backend. O GET lista apenas mesas ativas e responde
 * 204 (corpo vazio) quando não há nenhuma; o DELETE é exclusão lógica.
 */
@Injectable({ providedIn: 'root' })
export class MesaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Mesa[]> {
    return this.http.get<ApiMesa[] | null>(API_URL).pipe(
      map((mesas) => (mesas ?? []).map((mesa) => this.mapear(mesa)).sort((a, b) => a.numero - b.numero)),
    );
  }

  criar(numero: number): Observable<Mesa> {
    return this.http
      .post<ApiMesa>(API_URL, { id: null, numero, flativo: 'S' })
      .pipe(map((mesa) => this.mapear(mesa)));
  }

  atualizar(id: number, numero: number): Observable<Mesa> {
    return this.http
      .put<ApiMesa>(`${API_URL}/${id}`, { id, numero, flativo: 'S' })
      .pipe(map((mesa) => this.mapear(mesa)));
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }

  private mapear(mesa: ApiMesa): Mesa {
    return {
      id: mesa.id ?? 0,
      numero: mesa.numero,
      ativa: mesa.flativo !== 'N',
    };
  }
}
