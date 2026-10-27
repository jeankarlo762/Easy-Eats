import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UnidadeMedida } from '../cadastro-produto/produto.service';

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA';

export interface Estoque {
  id: number;
  produto: {
    id: number;
    nome: string;
    preco: number;
    custo?: number | null;
    natureza?: string | null;
    unidadeMedida?: UnidadeMedida | null;
    categoria: { id: number; nome: string } | null;
  };
  quantidadeAtual: number;
  estoqueMinimo: number;
  dtUltimaMovimentacao: string | null;
}

// Ingrediente = produto INSUMO + seu registro de estoque, gravados juntos.
// quantidadeAtual só vale na criação; depois o saldo muda por movimentação.
export interface IngredientePayload {
  nome: string;
  unidadeMedida: UnidadeMedida;
  custo: number | null;
  quantidadeAtual: number | null;
  estoqueMinimo: number;
}

export interface MovimentacaoEstoque {
  id: number;
  produto: { id: number; nome: string };
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  observacao: string | null;
  dtMovimentacao: string;
}

export interface ItemMaisConsumido {
  nomeProduto: string;
  quantidadeConsumida: number;
}

const API_URL = `${environment.apiUrl}/estoque`;

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Estoque[]> {
    return this.http.get<Estoque[]>(API_URL);
  }

  listarAbaixoDoMinimo(): Observable<Estoque[]> {
    return this.http.get<Estoque[]>(`${API_URL}/abaixo-do-minimo`);
  }

  listarMovimentacoes(): Observable<MovimentacaoEstoque[]> {
    return this.http.get<MovimentacaoEstoque[]>(`${API_URL}/movimentacoes`);
  }

  listarMaisConsumidos(): Observable<ItemMaisConsumido[]> {
    return this.http.get<ItemMaisConsumido[]>(`${API_URL}/mais-consumidos`);
  }

  criar(produtoId: number, quantidadeAtual: number, estoqueMinimo: number): Observable<Estoque> {
    return this.http.post<Estoque>(API_URL, { produto: { id: produtoId }, quantidadeAtual, estoqueMinimo });
  }

  atualizar(produtoId: number, quantidadeAtual: number, estoqueMinimo: number): Observable<Estoque> {
    return this.http.put<Estoque>(`${API_URL}/${produtoId}`, { quantidadeAtual, estoqueMinimo });
  }

  registrarMovimentacao(
    produtoId: number,
    tipo: TipoMovimentacaoEstoque,
    quantidade: number,
    observacao?: string,
  ): Observable<MovimentacaoEstoque> {
    return this.http.post<MovimentacaoEstoque>(`${API_URL}/${produtoId}/movimentacao`, {
      tipo,
      quantidade,
      observacao: observacao || null,
    });
  }

  remover(produtoId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${produtoId}`);
  }

  listarIngredientes(): Observable<Estoque[]> {
    return this.http.get<Estoque[]>(`${API_URL}/ingredientes`);
  }

  criarIngrediente(payload: IngredientePayload): Observable<Estoque> {
    return this.http.post<Estoque>(`${API_URL}/ingredientes`, payload);
  }

  atualizarIngrediente(produtoId: number, payload: IngredientePayload): Observable<Estoque> {
    return this.http.put<Estoque>(`${API_URL}/ingredientes/${produtoId}`, payload);
  }

  removerIngrediente(produtoId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/ingredientes/${produtoId}`);
  }
}
