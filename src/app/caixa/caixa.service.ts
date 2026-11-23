import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatusCaixa = 'ABERTO' | 'FECHADO';
export type TipoMovimentacao = 'FUNDO_INICIAL' | 'SUPRIMENTO' | 'SANGRIA' | 'VENDA';
/** Tipos que o operador pode lançar durante o turno (o fundo inicial só entra na abertura). */
export type TipoLancavel = Extract<TipoMovimentacao, 'SUPRIMENTO' | 'SANGRIA'>;

export const TIPO_MOVIMENTACAO_LABEL: Record<TipoMovimentacao, string> = {
  FUNDO_INICIAL: 'Fundo inicial',
  SUPRIMENTO: 'Suprimento',
  SANGRIA: 'Sangria',
  VENDA: 'Venda (dinheiro)',
};

export const TIPOS_MOVIMENTACAO: TipoMovimentacao[] = ['FUNDO_INICIAL', 'SUPRIMENTO', 'SANGRIA', 'VENDA'];

/** Sangria retira dinheiro do caixa; os demais tipos somam. */
export function ehSaida(tipo: TipoMovimentacao): boolean {
  return tipo === 'SANGRIA';
}

/** Espelha o CaixaDto do backend. */
export interface Caixa {
  id: number;
  status: StatusCaixa;
  fundoCaixa: number;
  usuarioAbertura: string;
  dataAbertura: string;
  observacaoAbertura: string | null;
  usuarioFechamento: string | null;
  dataFechamento: string | null;
  valorEsperado: number | null;
  valorContado: number | null;
  diferenca: number | null;
  observacaoFechamento: string | null;
  saldoAtual: number;
}

/** Espelha o MovimentacaoCaixaDto do backend. */
export interface MovimentacaoCaixa {
  id: number;
  caixaId: number;
  /** Venda que originou a entrada (lançamentos do tipo VENDA). */
  vendaId: number | null;
  tipo: TipoMovimentacao;
  valor: number;
  descricao: string | null;
  usuario: string;
  dataMovimentacao: string;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
  totalPaginas: number;
}

export interface ResumoLancamentos {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
}

export interface RelatorioFechamento {
  caixa: Caixa;
  totalSuprimentos: number;
  totalSangrias: number;
  totalVendas: number;
  movimentacoes: MovimentacaoCaixa[];
}

/** Filtros opcionais do histórico de caixas (datas em yyyy-MM-dd, inclusivas). */
export interface FiltroCaixas {
  inicio?: string;
  fim?: string;
  usuario?: string;
  status?: StatusCaixa | null;
}

/** Filtros opcionais dos lançamentos (datas em yyyy-MM-dd, inclusivas). */
export interface FiltroLancamentos {
  inicio?: string;
  fim?: string;
  tipo?: TipoMovimentacao | null;
  usuario?: string;
  caixaId?: number | null;
}

const API_URL = `${environment.apiUrl}/caixa`;

/** Monta os parâmetros da URL ignorando valores vazios. */
function parametros(valores: Record<string, string | number | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      params = params.set(chave, String(valor).trim());
    }
  }
  return params;
}

/**
 * Endpoints /caixa do backend.
 * - GET /caixa/atual responde 204 (corpo vazio) quando não há caixa aberto.
 * - Abrir caixa, ver o caixa atual e lançar suprimento valem para qualquer usuário;
 *   sangria, fechamento e consultas exigem Administrador ou Gerente.
 * - O usuário responsável vem do token: o frontend não envia nome de usuário.
 */
@Injectable({ providedIn: 'root' })
export class CaixaService {
  constructor(private http: HttpClient) {}

  atual(): Observable<Caixa | null> {
    return this.http.get<Caixa | null>(`${API_URL}/atual`);
  }

  abrir(fundoCaixa: number, observacao: string | null): Observable<Caixa> {
    return this.http.post<Caixa>(`${API_URL}/abrir`, { fundoCaixa, observacao });
  }

  lancar(
    caixaId: number,
    tipo: TipoLancavel,
    valor: number,
    descricao: string | null,
  ): Observable<MovimentacaoCaixa> {
    return this.http.post<MovimentacaoCaixa>(`${API_URL}/${caixaId}/movimentacoes`, { tipo, valor, descricao });
  }

  fechar(caixaId: number, valorContado: number, observacao: string | null): Observable<Caixa> {
    return this.http.post<Caixa>(`${API_URL}/${caixaId}/fechar`, { valorContado, observacao });
  }

  listar(filtro: FiltroCaixas, pagina: number, tamanho: number): Observable<Pagina<Caixa>> {
    const params = parametros({
      inicio: filtro.inicio,
      fim: filtro.fim,
      usuario: filtro.usuario,
      status: filtro.status,
      pagina,
      tamanho,
    });
    return this.http.get<Pagina<Caixa>>(API_URL, { params });
  }

  relatorioFechamento(caixaId: number): Observable<RelatorioFechamento> {
    return this.http.get<RelatorioFechamento>(`${API_URL}/${caixaId}/relatorio-fechamento`);
  }

  listarMovimentacoes(
    filtro: FiltroLancamentos,
    pagina: number,
    tamanho: number,
  ): Observable<Pagina<MovimentacaoCaixa>> {
    const params = parametros({ ...this.filtroLancamentos(filtro), pagina, tamanho });
    return this.http.get<Pagina<MovimentacaoCaixa>>(`${API_URL}/movimentacoes`, { params });
  }

  resumirMovimentacoes(filtro: FiltroLancamentos): Observable<ResumoLancamentos> {
    const params = parametros(this.filtroLancamentos(filtro));
    return this.http.get<ResumoLancamentos>(`${API_URL}/movimentacoes/resumo`, { params });
  }

  private filtroLancamentos(filtro: FiltroLancamentos) {
    return {
      inicio: filtro.inicio,
      fim: filtro.fim,
      tipo: filtro.tipo,
      usuario: filtro.usuario,
      caixaId: filtro.caixaId,
    };
  }
}
