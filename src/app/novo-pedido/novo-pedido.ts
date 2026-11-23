import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { CaixaService } from '../caixa/caixa.service';
import { Comanda, ComandaService } from '../comandas/comanda.service';
import { Mesa, MesaService } from '../mesas/mesa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { FORMAS_PAGAMENTO, FORMA_PAGAMENTO_LABEL, FormaPagamento, TipoVenda, VendaService } from '../vendas/venda.service';

const ICONE_POR_CATEGORIA: Record<string, string> = {
  Lanches: 'bi-egg-fried',
  Acompanhamentos: 'bi-basket3',
  Bebidas: 'bi-cup-straw',
  Sobremesas: 'bi-cake2',
};

interface ItemCarrinho {
  produto: Produto;
  qtd: number;
}

/** Resultado exibido depois de enviar o pedido. */
interface Confirmacao {
  mensagem: string;
  vendaId: number | null;
  aviso: boolean;
}

/** Arredonda para centavos: o backend aceita no máximo 2 casas decimais. */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

@Component({
  selector: 'app-novo-pedido',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, RouterLink, CarregandoComponent],
  templateUrl: './novo-pedido.html',
  styleUrls: ['./novo-pedido.scss'],
})
export class NovoPedido implements OnInit {
  private produtoService = inject(ProdutoService);
  private mesaService = inject(MesaService);
  private comandaService = inject(ComandaService);
  private vendaService = inject(VendaService);
  private caixaService = inject(CaixaService);
  private route = inject(ActivatedRoute);

  readonly formasPagamento = FORMAS_PAGAMENTO;
  readonly formaLabel = FORMA_PAGAMENTO_LABEL;

  busca = signal('');
  categoriaSelecionada = signal('Todos');
  produtos = signal<Produto[]>([]);
  mesas = signal<Mesa[]>([]);
  carrinho = signal<ItemCarrinho[]>([]);
  carregando = signal(true);
  enviando = signal(false);
  erro = signal<string | null>(null);
  confirmacao = signal<Confirmacao | null>(null);

  // dados do modal de finalização
  modalAberto = signal(false);
  tipoAtendimento = signal<TipoVenda>('MESA');
  mesaSelecionada = signal<number | null>(null);
  cliente = signal('');
  observacao = signal('');
  /** null = pagar depois (na conta da mesa ou na retirada). */
  formaPagamento = signal<FormaPagamento | null>(null);
  valorRecebido = signal<number | null>(null);
  /** Retirada já aberta em que este pedido será incluído (vem da conta). */
  vendaDaRetirada = signal<number | null>(null);
  /** null enquanto não se sabe; usado para avisar quando o pagamento imediato exige caixa aberto. */
  caixaAberto = signal<boolean | null>(null);

  categorias = computed(() => {
    const nomes = new Set(
      this.produtos()
        .map((produto) => produto.categoria?.nome)
        .filter((nome): nome is string => !!nome),
    );
    return ['Todos', ...nomes];
  });

  produtosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const categoria = this.categoriaSelecionada();
    return this.produtos().filter(
      (produto) =>
        (categoria === 'Todos' || produto.categoria?.nome === categoria) &&
        (!termo || produto.nome.toLowerCase().includes(termo)),
    );
  });

  total = computed(() => this.carrinho().reduce((soma, item) => soma + item.produto.preco * item.qtd, 0));
  quantidadeItens = computed(() => this.carrinho().reduce((soma, item) => soma + item.qtd, 0));

  /** Retirada paga na hora exige caixa aberto, porque a venda é finalizada em seguida. */
  pagaAgoraNaRetirada = computed(() => this.tipoAtendimento() === 'RETIRADA' && this.formaPagamento() !== null);
  caixaFechado = computed(() => this.pagaAgoraNaRetirada() && this.caixaAberto() === false);

  troco = computed(() => {
    const recebido = this.valorRecebido();
    if (this.formaPagamento() !== 'DINHEIRO' || recebido === null) {
      return 0;
    }
    return Math.max(0, centavos(recebido - this.total()));
  });

  /** O que falta para o modal poder confirmar, ou null quando está tudo certo. */
  pendenciaDoModal = computed<string | null>(() => {
    const tipo = this.tipoAtendimento();
    if (tipo === 'DELIVERY') {
      return 'O delivery estará disponível em breve.';
    }
    if (tipo === 'MESA' && this.mesaSelecionada() === null) {
      return 'Selecione a mesa.';
    }
    if (tipo === 'RETIRADA' && !this.cliente().trim()) {
      return 'Informe o nome do cliente da retirada.';
    }
    if (this.caixaFechado()) {
      return 'Abra o caixa para receber o pagamento agora, ou escolha pagar depois.';
    }
    return null;
  });

  podeConfirmar = computed(() => this.pendenciaDoModal() === null && !this.enviando());

  ngOnInit(): void {
    forkJoin({
      produtos: this.produtoService.listar(),
      mesas: this.mesaService.listar(),
    }).subscribe({
      next: ({ produtos, mesas }) => {
        this.produtos.set(produtos);
        this.mesas.set(mesas);
        this.aplicarParametrosDaRota(mesas);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar produtos e mesas.'));
        this.carregando.set(false);
      },
    });
  }

  /** ?mesa=ID abre direto na mesa; ?tipo=retirada (e opcionalmente &venda=ID&cliente=Nome) na retirada. */
  private aplicarParametrosDaRota(mesas: Mesa[]): void {
    const parametros = this.route.snapshot.queryParamMap;
    const mesaDaRota = Number(parametros.get('mesa'));
    if (mesaDaRota && mesas.some((mesa) => mesa.id === mesaDaRota)) {
      this.mesaSelecionada.set(mesaDaRota);
    }
    if (parametros.get('tipo') === 'retirada') {
      this.tipoAtendimento.set('RETIRADA');
      const vendaId = Number(parametros.get('venda'));
      this.vendaDaRetirada.set(vendaId > 0 ? vendaId : null);
      this.cliente.set(parametros.get('cliente') ?? '');
    }
  }

  iconeCategoria(nomeCategoria?: string | null): string {
    return (nomeCategoria && ICONE_POR_CATEGORIA[nomeCategoria]) || 'bi-basket3';
  }

  semPreco(produto: Produto): boolean {
    return !(produto.preco > 0);
  }

  quantidadeNoCarrinho(produto: Produto): number {
    return this.carrinho().find((item) => item.produto.id === produto.id)?.qtd ?? 0;
  }

  adicionarAoCarrinho(produto: Produto): void {
    if (this.semPreco(produto)) return;
    this.carrinho.update((itens) => {
      const existente = itens.find((item) => item.produto.id === produto.id);
      return existente
        ? itens.map((item) => (item === existente ? { ...item, qtd: item.qtd + 1 } : item))
        : [...itens, { produto, qtd: 1 }];
    });
  }

  alterarQtd(item: ItemCarrinho, delta: number): void {
    this.carrinho.update((itens) =>
      itens
        .map((atual) => (atual === item ? { ...atual, qtd: atual.qtd + delta } : atual))
        .filter((atual) => atual.qtd > 0),
    );
  }

  remover(item: ItemCarrinho): void {
    this.carrinho.update((itens) => itens.filter((atual) => atual !== item));
  }

  limparCarrinho(): void {
    this.carrinho.set([]);
  }

  // ------------------------------------------------------------------ modal de finalização

  abrirModal(): void {
    if (this.carrinho().length === 0) return;
    this.erro.set(null);
    this.modalAberto.set(true);
    this.consultarCaixa();
  }

  fecharModal(): void {
    if (!this.enviando()) {
      this.modalAberto.set(false);
    }
  }

  selecionarAtendimento(tipo: TipoVenda): void {
    if (tipo === 'DELIVERY' || this.vendaDaRetirada() !== null) return;
    this.tipoAtendimento.set(tipo);
    this.valorRecebido.set(null);
  }

  selecionarForma(forma: FormaPagamento | null): void {
    this.formaPagamento.set(forma);
    this.valorRecebido.set(null);
  }

  /** Só interessa saber se o caixa está aberto quando a retirada vai ser paga na hora. */
  private consultarCaixa(): void {
    this.caixaService.atual().subscribe({
      next: (caixa) => this.caixaAberto.set(caixa !== null),
      error: () => this.caixaAberto.set(null),
    });
  }

  confirmarPedido(): void {
    if (!this.podeConfirmar()) return;
    const tipo = this.tipoAtendimento();
    this.enviando.set(true);
    this.erro.set(null);
    this.comandaService
      .criar({
        status: 'ABERTO',
        tipoVenda: tipo,
        mesaId: tipo === 'MESA' ? this.mesaSelecionada() : null,
        vendaId: this.vendaDaRetirada(),
        cliente: this.cliente().trim() || null,
        observacao: this.observacao().trim() || null,
        itens: this.carrinho().map((item) => ({ produtoId: item.produto.id, quantidade: item.qtd })),
      })
      .subscribe({
        next: (comanda) => this.depoisDeCriar(comanda),
        error: (erro) => {
          this.enviando.set(false);
          this.erro.set(
            MensagemErroApiUtil.extrair(
              erro,
              'Não foi possível criar o pedido. Confira a mesa, o estoque dos ingredientes e tente novamente.',
            ),
          );
          this.modalAberto.set(false);
        },
      });
  }

  /**
   * A comanda já foi criada. Se uma forma de pagamento foi escolhida, registra o pagamento do valor da
   * comanda; na retirada a venda é finalizada em seguida (a mesa só libera ao finalizar a conta).
   */
  private depoisDeCriar(comanda: Comanda): void {
    const forma = this.formaPagamento();
    const vendaId = comanda.vendaId;
    if (!forma || vendaId === null) {
      this.concluir(comanda, 'enviado para a cozinha');
      return;
    }
    const recebido = this.valorRecebido();
    const pagamento$ = this.vendaService.registrarPagamento(vendaId, {
      forma,
      valor: centavos(comanda.valorTotal),
      valorRecebido: forma === 'DINHEIRO' && recebido !== null ? centavos(recebido) : null,
    });
    const retirada = this.tipoAtendimento() === 'RETIRADA';
    (retirada ? pagamento$.pipe(switchMap(() => this.vendaService.finalizar(vendaId))) : pagamento$).subscribe({
      next: () =>
        this.concluir(
          comanda,
          retirada ? 'enviado para a cozinha, pago e finalizado' : 'enviado para a cozinha e pago (a conta da mesa continua aberta)',
        ),
      error: (erro) =>
        this.concluir(
          comanda,
          `enviado para a cozinha, mas o pagamento não foi concluído: ${MensagemErroApiUtil.extrair(erro, 'erro ao registrar o pagamento')}. Conclua na conta`,
          true,
        ),
    });
  }

  private concluir(comanda: Comanda, situacao: string, aviso = false): void {
    this.enviando.set(false);
    this.modalAberto.set(false);
    this.carrinho.set([]);
    this.observacao.set('');
    this.formaPagamento.set(null);
    this.valorRecebido.set(null);
    if (this.vendaDaRetirada() === null) {
      this.cliente.set('');
    }
    if (this.tipoAtendimento() === 'MESA') {
      this.mesaSelecionada.set(null);
    }
    this.confirmacao.set({ mensagem: `Pedido #${comanda.id} ${situacao}.`, vendaId: comanda.vendaId, aviso });
    setTimeout(() => this.confirmacao.set(null), aviso ? 12000 : 7000);
  }
}
