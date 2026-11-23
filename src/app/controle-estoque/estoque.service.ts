import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ingrediente {
  id: number;
  nome: string;
  unidadeMedida: string;
  custo: number;
}

export type IngredientePayload = Omit<Ingrediente, 'id'>;

export interface Estoque {
  id: number;
  idIngrediente: number;
  nomeIngrediente: string | null;
  qtdAtual: number;
  qtdMinima: number;
  dtAtualizacao: string | null;
  abaixoDoMinimo: boolean;
}

/** Ingrediente com o respectivo estoque (quando já cadastrado). */
export interface ItemEstoque {
  ingrediente: Ingrediente;
  estoque: Estoque | null;
}

interface ApiEstoque {
  id: number | null;
  qtdAtual: number;
  qtdMinima: number;
  dtAtualizacao: string | null;
  idIngrediente: number;
  nomeIngrediente: string | null;
  abaixoDoMinimo: boolean | null;
}

const INGREDIENTES_URL = `${environment.apiUrl}/ingredientes`;
const ESTOQUES_URL = `${environment.apiUrl}/estoques`;

/**
 * Endpoints /ingredientes e /estoques do backend.
 * - O ingrediente guarda nome, unidade e custo; o estoque guarda quantidades.
 * - PUT /estoques/{id} só altera a quantidade mínima: a quantidade atual
 *   muda apenas por PATCH /entrada e /saida.
 * - DELETE /ingredientes/{id} é exclusão lógica e falha se o ingrediente
 *   estiver em uso na ficha técnica de um produto ativo.
 */
@Injectable({ providedIn: 'root' })
export class EstoqueService {
  constructor(private http: HttpClient) {}

  // ---------------------------------------------------------- ingredientes
  listarIngredientes(): Observable<Ingrediente[]> {
    return this.http.get<Ingrediente[] | null>(INGREDIENTES_URL).pipe(
      map((lista) =>
        (lista ?? [])
          .map((ingrediente) => ({ ...ingrediente, custo: Number(ingrediente.custo ?? 0) }))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      ),
    );
  }

  criarIngrediente(payload: IngredientePayload): Observable<Ingrediente> {
    return this.http.post<Ingrediente>(INGREDIENTES_URL, { id: null, ...payload });
  }

  atualizarIngrediente(id: number, payload: IngredientePayload): Observable<Ingrediente> {
    return this.http.put<Ingrediente>(`${INGREDIENTES_URL}/${id}`, { id, ...payload });
  }

  excluirIngrediente(id: number): Observable<void> {
    return this.http.delete<void>(`${INGREDIENTES_URL}/${id}`);
  }

  // -------------------------------------------------------------- estoques
  listarEstoques(): Observable<Estoque[]> {
    return this.http
      .get<ApiEstoque[] | null>(ESTOQUES_URL)
      .pipe(map((lista) => (lista ?? []).map((estoque) => this.mapearEstoque(estoque))));
  }

  listarAlertas(): Observable<Estoque[]> {
    return this.http
      .get<ApiEstoque[] | null>(`${ESTOQUES_URL}/alertas`)
      .pipe(map((lista) => (lista ?? []).map((estoque) => this.mapearEstoque(estoque))));
  }

  criarEstoque(idIngrediente: number, qtdAtual: number, qtdMinima: number): Observable<Estoque> {
    return this.http
      .post<ApiEstoque>(ESTOQUES_URL, { id: null, idIngrediente, qtdAtual, qtdMinima })
      .pipe(map((estoque) => this.mapearEstoque(estoque)));
  }

  /** Altera a quantidade mínima (o backend exige que a quantidade atual seja reenviada inalterada). */
  alterarMinimo(estoque: Estoque, qtdMinima: number): Observable<Estoque> {
    return this.http
      .put<ApiEstoque>(`${ESTOQUES_URL}/${estoque.id}`, {
        id: estoque.id,
        idIngrediente: estoque.idIngrediente,
        qtdAtual: estoque.qtdAtual,
        qtdMinima,
      })
      .pipe(map((resultado) => this.mapearEstoque(resultado)));
  }

  registrarEntrada(id: number, quantidade: number): Observable<Estoque> {
    return this.http
      .patch<ApiEstoque>(`${ESTOQUES_URL}/${id}/entrada`, { quantidade })
      .pipe(map((estoque) => this.mapearEstoque(estoque)));
  }

  registrarSaida(id: number, quantidade: number): Observable<Estoque> {
    return this.http
      .patch<ApiEstoque>(`${ESTOQUES_URL}/${id}/saida`, { quantidade })
      .pipe(map((estoque) => this.mapearEstoque(estoque)));
  }

  // ---------------------------------------------------------------- junção
  /** Ingredientes ativos + estoque de cada um, em uma única chamada. */
  listarItens(): Observable<ItemEstoque[]> {
    return forkJoin({
      ingredientes: this.listarIngredientes(),
      estoques: this.listarEstoques(),
    }).pipe(
      map(({ ingredientes, estoques }) =>
        ingredientes.map((ingrediente) => ({
          ingrediente,
          estoque: estoques.find((estoque) => estoque.idIngrediente === ingrediente.id) ?? null,
        })),
      ),
    );
  }

  private mapearEstoque(estoque: ApiEstoque): Estoque {
    const qtdAtual = Number(estoque.qtdAtual ?? 0);
    const qtdMinima = Number(estoque.qtdMinima ?? 0);
    return {
      id: estoque.id ?? 0,
      idIngrediente: estoque.idIngrediente,
      nomeIngrediente: estoque.nomeIngrediente,
      qtdAtual,
      qtdMinima,
      dtAtualizacao: estoque.dtAtualizacao,
      abaixoDoMinimo: estoque.abaixoDoMinimo ?? qtdAtual <= qtdMinima,
    };
  }
}
