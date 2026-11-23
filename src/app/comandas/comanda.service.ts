import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Mesa, MesaService } from '../mesas/mesa.service';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import type { TipoVenda } from '../vendas/venda.service';

/** Mesmo enum do backend (com.easyeats.api.entity.StatusPedidoEnum). */
export type StatusPedido = 'ABERTO' | 'EM_PREPARO' | 'FINALIZADO' | 'CANCELADO';

export const STATUS_PEDIDO = {
  ABERTO: 'ABERTO',
  EM_PREPARO: 'EM_PREPARO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
} as const satisfies Record<StatusPedido, StatusPedido>;

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  ABERTO: 'Aguardando',
  EM_PREPARO: 'Em preparo',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export const TODOS_STATUS_PEDIDO: StatusPedido[] = ['ABERTO', 'EM_PREPARO', 'FINALIZADO', 'CANCELADO'];

/** Fluxo da cozinha: ABERTO → EM_PREPARO (baixa o estoque) → FINALIZADO. */
export const PROXIMO_STATUS: Partial<Record<StatusPedido, StatusPedido>> = {
  ABERTO: 'EM_PREPARO',
  EM_PREPARO: 'FINALIZADO',
};

export interface ItemComandaResumo {
  id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total: number | null;
  observacao?: string | null;
  composicaoRemovida?: { composicaoItem: { id: number; nome: string } }[] | null;
  adicionais?: { id: number; nome: string; preco: number; quantidade: number }[] | null;
  produto: Produto;
}

export interface Comanda {
  id: number;
  status: StatusPedido;
  valorTotal: number;
  dataCriacao: string | null;
  dataAlteracao: string | null;
  mesa: { id: number; numero: number | null } | null;
  nomeCliente: string | null;
  observacao: string | null;
  /** Venda (conta) a que a comanda pertence. */
  vendaId: number | null;
  tipoVenda: TipoVenda | null;
  itens: ItemComandaResumo[];
}

/** Resumo operacional das comandas do período. O faturamento real vem das vendas (VendaService). */
export interface ResumoComandas {
  totalProntas: number;
  ticketMedio: number;
  quantidadeProntas: number;
  canceladas: number;
}

/** Payload correspondente ao PedidoDto do backend Spring Boot. */
export interface ComandaPayload {
  status: StatusPedido;
  /** Obrigatório no atendimento de mesa; retirada e delivery não têm mesa. */
  mesaId: number | null;
  tipoVenda?: TipoVenda;
  /** Inclui a comanda numa retirada já aberta. */
  vendaId?: number | null;
  observacao?: string | null;
  cliente: string | null;
  itens: { produtoId: number; quantidade: number }[];
}

interface ApiItemPedido {
  id: number | null;
  pedidoId: number | null;
  produtoId: number;
  quantidade: number;
  valorUnitario: number | null;
}

interface ApiPedido {
  id: number | null;
  dataCriacao: string | null;
  dataAlteracao: string | null;
  mesaId: number | null;
  vendaId?: number | null;
  tipoVenda?: TipoVenda | null;
  cliente: string | null;
  observacao?: string | null;
  status: string;
  valorTotal: number | null;
  itens: ApiItemPedido[] | null;
}

const API_URL = `${environment.apiUrl}/pedido`;

/** Filtra pedidos cuja data de criação está entre `inicio` e `fim` (yyyy-MM-dd, inclusivo). */
export function filtrarPorPeriodo(pedidos: Comanda[], inicio: string, fim: string): Comanda[] {
  const dataInicio = new Date(`${inicio}T00:00:00`);
  const dataFim = new Date(`${fim}T23:59:59.999`);
  return pedidos.filter((pedido) => {
    if (!pedido.dataCriacao) return false;
    const data = new Date(pedido.dataCriacao);
    return data >= dataInicio && data <= dataFim;
  });
}

export function identificacaoPedido(pedido: Comanda): string {
  if (pedido.mesa) {
    return pedido.mesa.numero != null ? `Mesa ${pedido.mesa.numero}` : `Mesa #${pedido.mesa.id}`;
  }
  return pedido.nomeCliente || 'Sem mesa';
}

@Injectable({ providedIn: 'root' })
export class ComandaService {
  constructor(
    private http: HttpClient,
    private produtoService: ProdutoService,
    private mesaService: MesaService,
  ) {}

  /** GET /pedido — o backend responde 204 (corpo vazio) quando não há pedidos. */
  listar(): Observable<Comanda[]> {
    return this.http
      .get<ApiPedido[] | null>(API_URL)
      .pipe(switchMap((pedidos) => this.mapearLista(pedidos ?? [])));
  }

  buscarPorId(id: number): Observable<Comanda> {
    return this.http
      .get<ApiPedido>(`${API_URL}/${id}`)
      .pipe(switchMap((pedido) => this.mapearLista([pedido]).pipe(map((lista) => lista[0]))));
  }

  /**
   * GET /pedido?status=X. Para FINALIZADO/CANCELADO o backend devolve apenas
   * os 10 mais recentes do dia (paginável por `antesDe`).
   */
  listarPorStatus(status: StatusPedido, antesDe?: string): Observable<Comanda[]> {
    let params = new HttpParams().set('status', status);
    if (antesDe) {
      params = params.set('antesDe', antesDe);
    }

    return this.http
      .get<ApiPedido[] | null>(API_URL, { params })
      .pipe(switchMap((pedidos) => this.mapearLista(pedidos ?? [])));
  }

  criar(comanda: ComandaPayload): Observable<Comanda> {
    return this.http
      .post<ApiPedido>(API_URL, this.paraApi(null, comanda))
      .pipe(switchMap((pedido) => this.mapearLista([pedido]).pipe(map((lista) => lista[0]))));
  }

  alterar(id: number, comanda: ComandaPayload): Observable<Comanda> {
    return this.http
      .put<ApiPedido>(`${API_URL}/${id}`, this.paraApi(id, comanda))
      .pipe(switchMap((pedido) => this.mapearLista([pedido]).pipe(map((lista) => lista[0]))));
  }

  /** PATCH /pedido/{id}/status/{status}. Ao entrar em EM_PREPARO o backend baixa o estoque. */
  atualizarStatus(id: number, status: StatusPedido): Observable<Comanda> {
    return this.http
      .patch<ApiPedido>(`${API_URL}/${id}/status/${status}`, null)
      .pipe(switchMap((pedido) => this.mapearLista([pedido]).pipe(map((lista) => lista[0]))));
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }

  /** Resumo das comandas (FINALIZADO = pronta na cozinha). Não é faturamento: use o resumo de vendas. */
  static resumir(pedidos: Comanda[]): ResumoComandas {
    const finalizados = pedidos.filter((pedido) => pedido.status === 'FINALIZADO');
    const totalProntas = finalizados.reduce((total, pedido) => total + pedido.valorTotal, 0);

    return {
      totalProntas,
      quantidadeProntas: finalizados.length,
      ticketMedio: finalizados.length ? totalProntas / finalizados.length : 0,
      canceladas: pedidos.filter((pedido) => pedido.status === 'CANCELADO').length,
    };
  }

  private paraApi(id: number | null, comanda: ComandaPayload): ApiPedido {
    return {
      id,
      dataCriacao: null,
      dataAlteracao: null,
      mesaId: comanda.mesaId,
      vendaId: comanda.vendaId ?? null,
      tipoVenda: comanda.tipoVenda ?? null,
      cliente: comanda.cliente,
      observacao: comanda.observacao ?? null,
      status: comanda.status,
      valorTotal: null,
      itens: comanda.itens.map((item) => ({
        id: null,
        pedidoId: id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        valorUnitario: null,
      })),
    };
  }

  /** Busca produtos e mesas uma vez para enriquecer a lista inteira de pedidos. */
  private mapearLista(pedidos: ApiPedido[]): Observable<Comanda[]> {
    if (pedidos.length === 0) {
      return of([]);
    }

    return forkJoin({
      produtos: this.produtoService.listar().pipe(catchError(() => of([] as Produto[]))),
      mesas: this.mesaService.listar().pipe(catchError(() => of([] as Mesa[]))),
    }).pipe(map(({ produtos, mesas }) => pedidos.map((pedido) => this.mapearPedido(pedido, produtos, mesas))));
  }

  private mapearPedido(pedido: ApiPedido, produtos: Produto[], mesas: Mesa[]): Comanda {
    const mesa = pedido.mesaId == null ? undefined : mesas.find((m) => m.id === pedido.mesaId);

    const itens = (pedido.itens ?? []).map((item): ItemComandaResumo => {
      const valorUnitario = Number(item.valorUnitario ?? 0);
      const produto: Produto = produtos.find((p) => p.id === item.produtoId) ?? {
        id: item.produtoId,
        nome: `Produto #${item.produtoId}`,
        descricao: null,
        preco: valorUnitario,
        custo: null,
        flAtivo: false,
        natureza: null,
        categoria: null,
      };

      return {
        id: item.id ?? 0,
        quantidade: item.quantidade,
        preco_unitario: valorUnitario,
        valor_total: valorUnitario * item.quantidade,
        produto,
      };
    });

    return {
      id: pedido.id ?? 0,
      status: this.normalizarStatus(pedido.status),
      valorTotal: Number(pedido.valorTotal ?? itens.reduce((soma, item) => soma + (item.valor_total ?? 0), 0)),
      dataCriacao: pedido.dataCriacao,
      dataAlteracao: pedido.dataAlteracao,
      mesa:
        pedido.mesaId == null
          ? null
          : { id: pedido.mesaId, numero: mesa ? mesa.numero : null },
      nomeCliente: pedido.cliente,
      observacao: pedido.observacao ?? null,
      vendaId: pedido.vendaId ?? null,
      tipoVenda: pedido.tipoVenda ?? null,
      itens,
    };
  }

  private normalizarStatus(status: string): StatusPedido {
    const valor = (status ?? '').toUpperCase() as StatusPedido;
    return TODOS_STATUS_PEDIDO.includes(valor) ? valor : 'ABERTO';
  }
}
