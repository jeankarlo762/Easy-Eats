import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { Pagina } from '../caixa/caixa.service';
import type { StatusPedido } from '../comandas/comanda.service';

export type TipoVenda = 'MESA' | 'RETIRADA' | 'DELIVERY';
export type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'CANCELADA';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CREDITO' | 'DEBITO' | 'OUTROS';

export const TIPO_VENDA_LABEL: Record<TipoVenda, string> = {
  MESA: 'Mesa',
  RETIRADA: 'Retirada',
  DELIVERY: 'Delivery',
};

export const STATUS_VENDA_LABEL: Record<StatusVenda, string> = {
  ABERTA: 'Aberta',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CREDITO: 'Cartão de crédito',
  DEBITO: 'Cartão de débito',
  OUTROS: 'Outros',
};

export const FORMAS_PAGAMENTO: FormaPagamento[] = ['DINHEIRO', 'PIX', 'CREDITO', 'DEBITO', 'OUTROS'];

export interface PagamentoVenda {
  id: number;
  forma: FormaPagamento;
  valor: number;
  valorRecebido: number | null;
  troco: number | null;
  usuario: string;
  dataPagamento: string;
}

export interface ItemDaVenda {
  produtoId: number;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export interface ComandaDaVenda {
  id: number;
  status: StatusPedido;
  cliente: string | null;
  observacao: string | null;
  dataCriacao: string | null;
  valorTotal: number;
  itens: ItemDaVenda[];
}

/** Espelha o VendaDto do backend, com os itens das comandas já com o nome do produto. */
export interface Venda {
  id: number;
  tipo: TipoVenda;
  mesaId: number | null;
  numeroMesa: number | null;
  status: StatusVenda;
  nomeCliente: string | null;
  observacao: string | null;
  usuarioAbertura: string;
  dataAbertura: string;
  usuarioFechamento: string | null;
  dataFechamento: string | null;
  valorTotal: number;
  valorPago: number;
  valorRestante: number;
  caixaId: number | null;
  motivoCancelamento: string | null;
  comandas: ComandaDaVenda[];
  pagamentos: PagamentoVenda[];
}

/** Espelha o VendaResumoDto (listas). */
export interface VendaResumo {
  id: number;
  tipo: TipoVenda;
  mesaId: number | null;
  numeroMesa: number | null;
  status: StatusVenda;
  nomeCliente: string | null;
  usuarioAbertura: string;
  dataAbertura: string;
  usuarioFechamento: string | null;
  dataFechamento: string | null;
  valorTotal: number;
}

export interface OcupacaoMesa {
  mesaId: number;
  numero: number;
  ocupada: boolean;
  vendaId: number | null;
  nomeCliente: string | null;
  quantidadeComandas: number;
  valorParcial: number;
}

export interface TotalFormaPagamento {
  forma: FormaPagamento;
  total: number;
}

export interface TotalDia {
  dia: string;
  quantidade: number;
  total: number;
}

/** Faturamento do período: vendas finalizadas pela data de fechamento. */
export interface ResumoVendas {
  totalFaturado: number;
  quantidadeVendas: number;
  ticketMedio: number;
  quantidadeCanceladas: number;
  porFormaPagamento: TotalFormaPagamento[];
  porDia: TotalDia[];
}

export interface FiltroVendas {
  status?: StatusVenda | null;
  mesaId?: number | null;
  usuario?: string;
  inicio?: string;
  fim?: string;
}

export interface PagamentoPayload {
  forma: FormaPagamento;
  valor: number;
  /** Só em dinheiro: quanto o cliente entregou (o troco é calculado pela API). */
  valorRecebido?: number | null;
}

export interface CancelamentoPayload {
  motivo: string;
  /** Devolve ao estoque os itens que ainda não foram usados; exige a senha do gerente. */
  devolverEstoque: boolean;
  senhaGerente?: string | null;
}

interface ApiItem {
  produtoId: number;
  quantidade: number;
  valorUnitario: number | null;
}

interface ApiComanda {
  id: number;
  status: StatusPedido;
  cliente: string | null;
  observacao: string | null;
  dataCriacao: string | null;
  valorTotal: number | null;
  itens: ApiItem[] | null;
}

interface ApiVenda extends Omit<Venda, 'comandas'> {
  comandas: ApiComanda[];
}

const API_URL = `${environment.apiUrl}/vendas`;

/** Vendas: filtros opcionais viram parâmetros da URL, ignorando valores vazios. */
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
 * Endpoints /vendas do backend. A venda é a conta da mesa (ou da retirada): agrupa as comandas, recebe os
 * pagamentos e só libera a mesa ao ser finalizada ou cancelada. Finalizar exige caixa aberto.
 * Histórico, resumo e cancelamento são restritos a Administrador e Gerente.
 */
@Injectable({ providedIn: 'root' })
export class VendaService {
  constructor(
    private http: HttpClient,
    private produtoService: ProdutoService,
  ) {}

  /** Todas as mesas ativas com a situação (livre ou ocupada) e o valor parcial da conta. */
  ocupacaoMesas(): Observable<OcupacaoMesa[]> {
    return this.http.get<OcupacaoMesa[]>(`${API_URL}/ocupacao-mesas`);
  }

  /** Vendas abertas (mesas e retiradas), da mais antiga para a mais nova. */
  abertas(): Observable<VendaResumo[]> {
    return this.http.get<VendaResumo[]>(`${API_URL}/abertas`);
  }

  buscarPorId(id: number): Observable<Venda> {
    return this.comNomes(this.http.get<ApiVenda>(`${API_URL}/${id}`));
  }

  listar(filtro: FiltroVendas, pagina: number, tamanho: number): Observable<Pagina<VendaResumo>> {
    const params = parametros({
      status: filtro.status,
      mesaId: filtro.mesaId,
      usuario: filtro.usuario,
      inicio: filtro.inicio,
      fim: filtro.fim,
      pagina,
      tamanho,
    });
    return this.http.get<Pagina<VendaResumo>>(API_URL, { params });
  }

  resumir(inicio: string, fim: string): Observable<ResumoVendas> {
    return this.http.get<ResumoVendas>(`${API_URL}/resumo`, { params: parametros({ inicio, fim }) });
  }

  atualizar(id: number, nomeCliente: string | null, observacao: string | null): Observable<Venda> {
    return this.comNomes(this.http.patch<ApiVenda>(`${API_URL}/${id}`, { nomeCliente, observacao }));
  }

  registrarPagamento(id: number, pagamento: PagamentoPayload): Observable<Venda> {
    return this.comNomes(this.http.post<ApiVenda>(`${API_URL}/${id}/pagamentos`, pagamento));
  }

  removerPagamento(id: number, pagamentoId: number): Observable<Venda> {
    return this.comNomes(this.http.delete<ApiVenda>(`${API_URL}/${id}/pagamentos/${pagamentoId}`));
  }

  finalizar(id: number): Observable<Venda> {
    return this.comNomes(this.http.post<ApiVenda>(`${API_URL}/${id}/finalizar`, {}));
  }

  cancelar(id: number, cancelamento: CancelamentoPayload): Observable<Venda> {
    return this.comNomes(this.http.post<ApiVenda>(`${API_URL}/${id}/cancelar`, cancelamento));
  }

  /** O backend devolve só o id do produto: busca os produtos uma vez para mostrar os nomes. */
  private comNomes(venda$: Observable<ApiVenda>): Observable<Venda> {
    return forkJoin({
      venda: venda$,
      produtos: this.produtoService.listar().pipe(catchError(() => of([] as Produto[]))),
    }).pipe(map(({ venda, produtos }) => this.mapear(venda, produtos)));
  }

  private mapear(venda: ApiVenda, produtos: Produto[]): Venda {
    return {
      ...venda,
      comandas: venda.comandas.map((comanda) => {
        const itens = (comanda.itens ?? []).map((item): ItemDaVenda => {
          const valorUnitario = Number(item.valorUnitario ?? 0);
          return {
            produtoId: item.produtoId,
            nome: produtos.find((p) => p.id === item.produtoId)?.nome ?? `Produto #${item.produtoId}`,
            quantidade: item.quantidade,
            valorUnitario,
            subtotal: valorUnitario * item.quantidade,
          };
        });
        return {
          id: comanda.id,
          status: comanda.status,
          cliente: comanda.cliente,
          observacao: comanda.observacao,
          dataCriacao: comanda.dataCriacao,
          valorTotal: itens.reduce((soma, item) => soma + item.subtotal, 0),
          itens,
        };
      }),
    };
  }
}
