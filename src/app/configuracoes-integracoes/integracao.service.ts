import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IntegracaoConfig {
  id: number;
  chave: string;
  credenciaisJson: string | null;
  ativo: boolean;
}

const API_URL = `${environment.apiUrl}/integracoes`;

@Injectable({ providedIn: 'root' })
export class IntegracaoConfigService {
  constructor(private http: HttpClient) {}

  listar(): Observable<IntegracaoConfig[]> {
    return this.http.get<IntegracaoConfig[]>(API_URL);
  }

  salvar(chave: string, credenciaisJson: string, ativo: boolean): Observable<IntegracaoConfig> {
    return this.http.put<IntegracaoConfig>(`${API_URL}/${chave}`, { credenciaisJson, ativo });
  }
}
