import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Perfis existentes no backend (enum com.easyeats.api.entity.enums.Role).
 * O token JWT traz as roles como "ROLE_ADMIN", "ROLE_GERENTE", "ROLE_FUNCIONARIO".
 */
export type Perfil = 'ADMINISTRADOR' | 'GERENTE' | 'FUNCIONARIO';

/** Nome da role no backend para cada perfil do frontend. */
export const ROLE_BACKEND: Record<Perfil, string> = {
  ADMINISTRADOR: 'ADMIN',
  GERENTE: 'GERENTE',
  FUNCIONARIO: 'FUNCIONARIO',
};

export const PERFIL_LABEL: Record<Perfil, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  FUNCIONARIO: 'Funcionário',
};

/** Perfis que enxergam a gestão (estoque, produtos, financeiro, relatórios). */
export const PERFIS_GESTAO: Perfil[] = ['ADMINISTRADOR', 'GERENTE'];

/**
 * Mantido apenas para os módulos ainda sem endpoint no backend (que estão
 * fora das rotas). Não é usado para controle de acesso.
 */
export type Funcionalidade =
  | 'OPERACAO' | 'PEDIDO' | 'COZINHA' | 'DELIVERY' | 'ESTOQUE' | 'COMPRAS'
  | 'FINANCEIRO' | 'PRODUTOS' | 'CLIENTES' | 'USUARIOS' | 'CONFIGURACOES'
  | 'CAIXA' | 'CUPONS';

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  role: Perfil;
  roles: string[];
  expiraEm: number | null;
}

const CHAVE_TOKEN = 'easyeats.token';
const CHAVE_USUARIO = 'easyeats.usuario';
const API_URL = `${environment.apiUrl}/auth`;

/** Converte a lista de roles do backend no perfil de maior privilégio. */
export function perfilDasRoles(roles: string[] | null | undefined): Perfil {
  const normalizadas = (roles ?? []).map((role) => role.toUpperCase().replace(/^ROLE_/, ''));
  if (normalizadas.includes('ADMIN')) return 'ADMINISTRADOR';
  if (normalizadas.includes('GERENTE')) return 'GERENTE';
  return 'FUNCIONARIO';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario = signal<UsuarioLogado | null>(this.recuperarUsuario());

  constructor(private http: HttpClient) {
    // Sessão salva com token já vencido não deve abrir o sistema.
    if (this.getToken() && this.tokenExpirado()) {
      this.logout();
    }
  }

  login(username: string, senha: string): Observable<string> {
    const params = new URLSearchParams({ username, password: senha });

    return this.http
      .post(`${API_URL}/login`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
      })
      .pipe(
        tap((token) => {
          const usuario = this.usuarioDoToken(token);
          sessionStorage.setItem(CHAVE_TOKEN, token);
          sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
          this.usuario.set(usuario);
        }),
      );
  }

  logout(): void {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
    this.usuario.set(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem(CHAVE_TOKEN);
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !this.tokenExpirado();
  }

  /** true quando o token não existe ou já passou do `exp`. */
  tokenExpirado(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const { exp } = this.lerPayload(token);
      return typeof exp === 'number' && exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  temPerfil(perfis: Perfil[]): boolean {
    const role = this.usuario()?.role;
    return !!role && perfis.includes(role);
  }

  isAdministrador(): boolean {
    return this.usuario()?.role === 'ADMINISTRADOR';
  }

  isGerente(): boolean {
    return this.usuario()?.role === 'GERENTE';
  }

  isFuncionario(): boolean {
    return this.usuario()?.role === 'FUNCIONARIO';
  }

  /** Compatibilidade com módulos legados (ex.: caixa). */
  isOperador(): boolean {
    return this.isFuncionario();
  }

  /** Compatibilidade com módulos legados: o backend não controla funcionalidades. */
  temFuncionalidade(_codigo: Funcionalidade): boolean {
    return this.isAuthenticated();
  }

  private usuarioDoToken(token: string): UsuarioLogado {
    const payload = this.lerPayload(token);
    const username = payload.sub ?? 'Usuário';
    const roles = payload.roles ?? [];

    return {
      id: 0,
      nome: username,
      email: username,
      role: perfilDasRoles(roles),
      roles,
      expiraEm: typeof payload.exp === 'number' ? payload.exp * 1000 : null,
    };
  }

  private lerPayload(token: string): { sub?: string; roles?: string[]; exp?: number } {
    return JSON.parse(this.decodificarBase64Url(token.split('.')[1]));
  }

  private decodificarBase64Url(valor: string): string {
    const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return decodeURIComponent(
      Array.from(atob(preenchido))
        .map((caractere) => `%${caractere.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  }

  private recuperarUsuario(): UsuarioLogado | null {
    const bruto = sessionStorage.getItem(CHAVE_USUARIO);
    if (!bruto) return null;
    try {
      const usuario = JSON.parse(bruto) as UsuarioLogado;
      // Sessões salvas por versões antigas usavam perfis que não existem mais.
      if (!['ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO'].includes(usuario.role)) {
        usuario.role = perfilDasRoles(usuario.roles);
      }
      return usuario;
    } catch {
      return null;
    }
  }
}
