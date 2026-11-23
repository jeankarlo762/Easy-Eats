import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Perfil, ROLE_BACKEND, perfilDasRoles } from '../auth/auth.service';

export interface Usuario {
  username: string;
  roles: string[];
  perfil: Perfil;
}

export interface UsuarioPayload {
  username: string;
  senha: string;
  perfil: Perfil;
}

interface ApiUsuario {
  username: string;
  roles: string[] | null;
}

const API_URL = `${environment.apiUrl}/usuarios`;

/** Endpoints /usuarios do backend (UsuarioDTO: username, password, roles). */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Usuario[]> {
    return this.http.get<ApiUsuario[] | null>(API_URL).pipe(
      map((usuarios) =>
        (usuarios ?? [])
          .map((usuario) => this.mapear(usuario))
          .sort((a, b) => a.username.localeCompare(b.username)),
      ),
    );
  }

  /** POST /usuarios responde 201 sem corpo. */
  criar(usuario: UsuarioPayload): Observable<Usuario> {
    const roles = [ROLE_BACKEND[usuario.perfil]];

    return this.http
      .post<void>(API_URL, { username: usuario.username, password: usuario.senha, roles })
      .pipe(map(() => this.mapear({ username: usuario.username, roles })));
  }

  private mapear(usuario: ApiUsuario): Usuario {
    const roles = usuario.roles ?? [];
    return { username: usuario.username, roles, perfil: perfilDasRoles(roles) };
  }
}
