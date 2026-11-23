import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatusConexao =
  | 'desabilitado'
  | 'indisponivel'
  | 'iniciando'
  | 'conectando'
  | 'aguardando_qr'
  | 'conectado'
  | 'desconectado';

/** Situação do número conectado ao gateway Baileys. */
export interface ConexaoWhatsapp {
  status: StatusConexao;
  numero?: string | null;
  /** Texto do QR Code a escanear (só enquanto não conectado). */
  qr?: string | null;
  erro?: string | null;
}

const API_URL = `${environment.apiUrl}/integracoes/whatsapp`;

/** Integração WhatsApp (Administrador e Gerente): conexão do número pelo QR Code e mensagem de teste. */
@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private http = inject(HttpClient);

  conexao(): Observable<ConexaoWhatsapp> {
    return this.http.get<ConexaoWhatsapp>(`${API_URL}/conexao`);
  }

  desconectar(): Observable<unknown> {
    return this.http.post(`${API_URL}/desconectar`, {});
  }

  testar(telefone: string): Observable<{ enviado: boolean; erro?: string }> {
    return this.http.post<{ enviado: boolean; erro?: string }>(`${API_URL}/teste`, { telefone });
  }
}
