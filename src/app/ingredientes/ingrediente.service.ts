import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UnidadeMedida } from '../cadastro-produto/produto.service';

// Ingrediente = produto de natureza INSUMO + o seu registro de estoque.
export interface Ingrediente {
  id: number;
  nome: string;
  unidadeMedida: UnidadeMedida | null;
  custo: number | null;
  categoriaId: number | null;
  categoriaNome: string | null;
  quantidadeEstoque: number | null;
  estoqueMinimo: number | null;
}

export interface IngredientePayload {
  nome: string;
  unidadeMedida: UnidadeMedida;
  custo: number | null;
  categoriaId: number | null;
  quantidadeEstoque: number;
  estoqueMinimo: number;
}

export const UNIDADES_MEDIDA: { valor: UnidadeMedida; label: string }[] = [
  { valor: 'UN', label: 'Unidade (un)' },
  { valor: 'KG', label: 'Quilograma (kg)' },
  { valor: 'G', label: 'Grama (g)' },
  { valor: 'L', label: 'Litro (L)' },
  { valor: 'ML', label: 'Mililitro (mL)' },
];

const API_URL = `${environment.apiUrl}/ingredientes`;

@Injectable({ providedIn: 'root' })
export class IngredienteService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Ingrediente[]> {
    return this.http.get<Ingrediente[]>(API_URL);
  }

  criar(ingrediente: IngredientePayload): Observable<Ingrediente> {
    return this.http.post<Ingrediente>(API_URL, ingrediente);
  }

  atualizar(id: number, ingrediente: IngredientePayload): Observable<Ingrediente> {
    return this.http.put<Ingrediente>(`${API_URL}/${id}`, ingrediente);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
