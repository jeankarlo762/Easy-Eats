import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Categoria {
  id: number;
  nome: string;
  ativa: boolean;
}

export interface CategoriaPayload {
  nome: string;
  ativa: boolean;
}

interface ApiCategoria {
  id: number;
  nome: string;
  flativo: string | null;
}

const API_URL = `${environment.apiUrl}/categorias`;

/**
 * Endpoints /categorias do backend. O GET devolve ativas e inativas; a
 * exclusão é lógica via PATCH /categorias/{id}/inativar e a reativação é
 * feita pelo PUT com flativo = 'S'.
 */
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Categoria[]> {
    return this.http.get<ApiCategoria[] | null>(API_URL).pipe(
      map((categorias) =>
        (categorias ?? [])
          .map((categoria) => this.mapear(categoria))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      ),
    );
  }

  criar(categoria: CategoriaPayload): Observable<Categoria> {
    return this.http
      .post<ApiCategoria>(API_URL, this.paraApi(categoria))
      .pipe(map((resultado) => this.mapear(resultado)));
  }

  atualizar(id: number, categoria: CategoriaPayload): Observable<Categoria> {
    return this.http
      .put<ApiCategoria>(`${API_URL}/${id}`, this.paraApi(categoria))
      .pipe(map((resultado) => this.mapear(resultado)));
  }

  inativar(id: number): Observable<Categoria> {
    return this.http
      .patch<ApiCategoria>(`${API_URL}/${id}/inativar`, {})
      .pipe(map((resultado) => this.mapear(resultado)));
  }

  private paraApi(categoria: CategoriaPayload) {
    return {
      nome: categoria.nome,
      flativo: categoria.ativa ? 'S' : 'N',
    };
  }

  private mapear(categoria: ApiCategoria): Categoria {
    return {
      id: categoria.id,
      nome: categoria.nome,
      ativa: categoria.flativo !== 'N',
    };
  }
}
