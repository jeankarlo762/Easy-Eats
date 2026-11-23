import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FormatarTelefoneUtil } from '../utils/formatarTelefoneUtil';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { FORMA_PAGAMENTO_LABEL, FormaPagamento } from '../vendas/venda.service';
import {
  CardapioPublico,
  CardapioPublicoService,
  EnderecoEntrega,
  PedidoCardapioCriado,
  ProdutoCardapio,
  TipoEntrega,
} from './cardapio-publico.service';

interface ItemSacola {
  produto: ProdutoCardapio;
  qtd: number;
}

type Etapa = 'cardapio' | 'checkout' | 'confirmado';

const CHAVE_CLIENTE = 'easyeats.cardapio.cliente';

/**
 * Página aberta pelo QR Code (rota pública /cardapio, fora do login). O cliente escolhe os produtos, informa
 * nome, telefone, endereço e forma de pagamento e envia: o pedido cai na cozinha como comanda aguardando e
 * aparece em Mesas (delivery e retiradas). A confirmação chega no WhatsApp do cliente.
 */
@Component({
  selector: 'app-cardapio-publico',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, CarregandoComponent],
  templateUrl: './cardapio-publico.html',
  styleUrls: ['./cardapio-publico.scss'],
})
export class CardapioPublicoPage implements OnInit {
  private service = inject(CardapioPublicoService);
  private title = inject(Title);

  readonly formaLabel = FORMA_PAGAMENTO_LABEL;

  cardapio = signal<CardapioPublico | null>(null);
  categoriaSelecionada = signal<number | null>(null);
  sacola = signal<ItemSacola[]>([]);
  etapa = signal<Etapa>('cardapio');
  carregando = signal(true);
  enviando = signal(false);
  erro = signal<string | null>(null);
  pedidoCriado = signal<PedidoCardapioCriado | null>(null);

  // dados do cliente
  nome = '';
  telefone = '';
  tipoEntrega: TipoEntrega = 'DELIVERY';
  endereco: EnderecoEntrega = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', referencia: '' };
  formaPagamento: FormaPagamento | null = null;
  trocoPara: number | null = null;
  observacao = '';

  categorias = computed(() => this.cardapio()?.categorias.filter((c) => c.produtos.length > 0) ?? []);

  produtosVisiveis = computed(() => {
    const selecionada = this.categoriaSelecionada();
    return this.categorias().filter((c) => selecionada === null || c.id === selecionada);
  });

  totalItens = computed(() => this.sacola().reduce((soma, item) => soma + item.qtd, 0));
  total = computed(() =>
    Math.round(this.sacola().reduce((soma, item) => soma + item.produto.preco * item.qtd, 0) * 100) / 100,
  );

  ngOnInit(): void {
    this.restaurarCliente();
    this.service.buscarCardapio().subscribe({
      next: (cardapio) => {
        this.cardapio.set(cardapio);
        this.title.setTitle(`Cardápio · ${cardapio.nomeEstabelecimento}`);
        if (!cardapio.aceitaDelivery) this.tipoEntrega = 'RETIRADA';
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o cardápio.'));
        this.carregando.set(false);
      },
    });
  }

  qtdNaSacola(produto: ProdutoCardapio): number {
    return this.sacola().find((item) => item.produto.id === produto.id)?.qtd ?? 0;
  }

  adicionar(produto: ProdutoCardapio): void {
    this.sacola.update((itens) => {
      const existente = itens.find((item) => item.produto.id === produto.id);
      if (existente) {
        return itens.map((item) => (item === existente ? { ...item, qtd: Math.min(item.qtd + 1, 50) } : item));
      }
      return [...itens, { produto, qtd: 1 }];
    });
  }

  diminuir(produto: ProdutoCardapio): void {
    this.sacola.update((itens) =>
      itens
        .map((item) => (item.produto.id === produto.id ? { ...item, qtd: item.qtd - 1 } : item))
        .filter((item) => item.qtd > 0),
    );
    if (this.sacola().length === 0 && this.etapa() === 'checkout') this.etapa.set('cardapio');
  }

  irParaCheckout(): void {
    this.erro.set(null);
    this.etapa.set('checkout');
    window.scrollTo({ top: 0 });
  }

  voltarAoCardapio(): void {
    this.erro.set(null);
    this.etapa.set('cardapio');
  }

  formatarTelefone(valor: string): void {
    this.telefone = FormatarTelefoneUtil.formatar(valor ?? '');
  }

  /** Mensagem do primeiro dado que falta, ou null se o pedido pode ser enviado. */
  pendencia(): string | null {
    if (this.sacola().length === 0) return 'Sua sacola está vazia.';
    if (!this.nome.trim()) return 'Informe seu nome.';
    const digitos = this.telefone.replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 11) return 'Informe seu WhatsApp com DDD.';
    if (this.tipoEntrega === 'DELIVERY') {
      if (!this.endereco.rua.trim() || !this.endereco.numero.trim() || !this.endereco.bairro.trim()) {
        return 'Informe rua, número e bairro da entrega.';
      }
    }
    if (!this.formaPagamento) return 'Escolha a forma de pagamento.';
    if (this.formaPagamento === 'DINHEIRO' && this.trocoPara != null && this.trocoPara > 0 && this.trocoPara < this.total()) {
      return 'O troco deve ser para um valor maior que o total.';
    }
    return null;
  }

  enviarPedido(): void {
    const pendencia = this.pendencia();
    if (pendencia) {
      this.erro.set(pendencia);
      return;
    }
    if (this.enviando()) return;

    this.enviando.set(true);
    this.erro.set(null);
    this.salvarCliente();

    const troco = this.formaPagamento === 'DINHEIRO' && this.trocoPara && this.trocoPara > 0 ? this.trocoPara : null;
    this.service
      .fazerPedido({
        nome: this.nome.trim(),
        telefone: this.telefone.replace(/\D/g, ''),
        tipoEntrega: this.tipoEntrega,
        endereco: this.tipoEntrega === 'DELIVERY' ? this.endereco : null,
        formaPagamento: this.formaPagamento!,
        trocoPara: troco,
        observacao: this.observacao.trim() || null,
        itens: this.sacola().map((item) => ({ produtoId: item.produto.id, quantidade: item.qtd })),
      })
      .subscribe({
        next: (pedido) => {
          this.enviando.set(false);
          this.pedidoCriado.set(pedido);
          this.sacola.set([]);
          this.observacao = '';
          this.trocoPara = null;
          this.etapa.set('confirmado');
          window.scrollTo({ top: 0 });
        },
        error: (erro) => {
          this.enviando.set(false);
          this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível enviar o pedido. Tente novamente.'));
        },
      });
  }

  novoPedido(): void {
    this.pedidoCriado.set(null);
    this.etapa.set('cardapio');
  }

  // Lembra nome, telefone e endereço neste aparelho para o próximo pedido
  private salvarCliente(): void {
    try {
      localStorage.setItem(
        CHAVE_CLIENTE,
        JSON.stringify({ nome: this.nome, telefone: this.telefone, endereco: this.endereco }),
      );
    } catch {
      /* armazenamento indisponível: ignora */
    }
  }

  private restaurarCliente(): void {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CLIENTE) ?? 'null');
      if (salvo) {
        this.nome = salvo.nome ?? '';
        this.telefone = salvo.telefone ?? '';
        this.endereco = { ...this.endereco, ...(salvo.endereco ?? {}) };
      }
    } catch {
      /* ignora */
    }
  }
}
