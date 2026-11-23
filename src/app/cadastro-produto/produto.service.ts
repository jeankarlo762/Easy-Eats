import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export type NaturezaProduto = 'INSUMO' | 'REVENDA' | 'PREPARADO';

export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  /** Não existe no backend; mantido por compatibilidade com componentes legados. */
  custo: number | null;
  flAtivo: boolean;
  /** Não existe no backend; mantido por compatibilidade com componentes legados. */
  natureza: NaturezaProduto | null;
  categoria: { id: number; nome: string } | null;
}

export interface ProdutoPayload {
  nome: string;
  descricao: string | null;
  preco: number;
  categoriaId: number;
}

interface ApiProduto {
  id: number;
  nome: string;
  descricao: string | null;
  flativo: string | null;
  categoriaId: number;
  preco: number | null;
}

interface ApiCategoria {
  id: number;
  nome: string;
}

const API_URL = `${environment.apiUrl}/produto`;
const CATEGORIAS_URL = `${environment.apiUrl}/categorias`;

/**
 * Endpoints /produto do backend. O GET lista apenas produtos ativos (com o
 * preço ativo); o PUT gera uma nova versão de preço; o DELETE é exclusão lógica.
 */
@Injectable({ providedIn: 'root' })
export class ProdutoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Produto[]> {
    return forkJoin({
      produtos: this.http.get<ApiProduto[] | null>(API_URL),
      categorias: this.http.get<ApiCategoria[] | null>(CATEGORIAS_URL),
    }).pipe(
      map(({ produtos, categorias }) =>
        (produtos ?? [])
          .map((produto) => this.mapearProduto(produto, categorias ?? []))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      ),
    );
  }

  criar(payload: ProdutoPayload): Observable<Produto> {
    return this.http
      .post<ApiProduto>(API_URL, this.paraApi(payload))
      .pipe(switchMap((produto) => this.buscarCategoriaEMapear(produto)));
  }

  atualizar(id: number, payload: ProdutoPayload): Observable<Produto> {
    return this.http
      .put<ApiProduto>(`${API_URL}/${id}`, this.paraApi(payload))
      .pipe(switchMap((produto) => this.buscarCategoriaEMapear(produto)));
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }

  private buscarCategoriaEMapear(produto: ApiProduto): Observable<Produto> {
    return this.http
      .get<ApiCategoria[] | null>(CATEGORIAS_URL)
      .pipe(map((categorias) => this.mapearProduto(produto, categorias ?? [])));
  }

  private mapearProduto(produto: ApiProduto, categorias: ApiCategoria[]): Produto {
    const categoria = categorias.find((item) => item.id === produto.categoriaId);

    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao ?? null,
      preco: Number(produto.preco ?? 0),
      custo: null,
      flAtivo: produto.flativo !== 'N',
      natureza: null,
      categoria: categoria ? { id: categoria.id, nome: categoria.nome } : null,
    };
  }

  private paraApi(payload: ProdutoPayload) {
    return {
      nome: payload.nome,
      descricao: payload.descricao,
      categoriaId: payload.categoriaId,
      preco: payload.preco,
    };
  }
}
