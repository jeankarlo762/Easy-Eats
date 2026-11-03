import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import {
  CardapioPublico,
  CardapioPublicoService,
  PedidoPublicoCriado,
  ProdutoPublico,
} from './cardapio-publico.service';

interface ItemCarrinho {
  produto: ProdutoPublico;
  qtd: number;
  observacao: string;
}

/**
 * Página aberta pelo QR Code gerado no Novo Pedido. Pública (fora do
 * authGuard): o cliente monta o pedido no próprio celular e ele cai direto
 * na fila da cozinha com origem QRCODE.
 */
@Component({
  selector: 'app-cardapio-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, CarregandoComponent],
  templateUrl: './cardapio-publico.html',
  styleUrls: ['./cardapio-publico.scss'],
})
export class CardapioPublicoPage implements OnInit {
  private service = inject(CardapioPublicoService);
  private route = inject(ActivatedRoute);

  private slug = '';
  private mesaId: number | null = null;

  cardapio: CardapioPublico | null = null;
  categorias: string[] = ['Todos'];
  categoriaSelecionada = 'Todos';

  carrinho: ItemCarrinho[] = [];
  nomeCliente = '';

  carregando = true;
  enviando = false;
  erro: string | null = null;
  pedidoCriado: PedidoPublicoCriado | null = null;

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.mesaId = Number(this.route.snapshot.queryParamMap.get('mesa')) || null;
    this.carregar();
  }

  private carregar() {
    this.carregando = true;
    this.erro = null;
    this.service.buscarCardapio(this.slug, this.mesaId).subscribe({
      next: (cardapio) => {
        this.cardapio = cardapio;
        const nomes = new Set(
          cardapio.produtos.map((p) => p.categoria).filter((nome): nome is string => !!nome),
        );
        this.categorias = ['Todos', ...nomes];
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o cardápio.');
        this.carregando = false;
      },
    });
  }

  produtosFiltrados(): ProdutoPublico[] {
    const produtos = this.cardapio?.produtos ?? [];
    if (this.categoriaSelecionada === 'Todos') return produtos;
    return produtos.filter((p) => p.categoria === this.categoriaSelecionada);
  }

  qtdNoCarrinho(produto: ProdutoPublico): number {
    return this.carrinho.find((item) => item.produto.id === produto.id)?.qtd ?? 0;
  }

  adicionar(produto: ProdutoPublico) {
    const existente = this.carrinho.find((item) => item.produto.id === produto.id);
    if (existente) {
      existente.qtd++;
    } else {
      this.carrinho.push({ produto, qtd: 1, observacao: '' });
    }
  }

  diminuir(index: number) {
    if (this.carrinho[index].qtd > 1) {
      this.carrinho[index].qtd--;
    } else {
      this.carrinho.splice(index, 1);
    }
  }

  totalItens(): number {
    return this.carrinho.reduce((soma, item) => soma + item.qtd, 0);
  }

  total(): number {
    return this.carrinho.reduce((soma, item) => soma + item.produto.preco * item.qtd, 0);
  }

  get temMesa(): boolean {
    return !!this.cardapio?.mesa;
  }

  podeEnviar(): boolean {
    if (this.carrinho.length === 0) return false;
    return this.temMesa || !!this.nomeCliente.trim();
  }

  enviarPedido() {
    if (!this.podeEnviar() || this.enviando) return;

    this.enviando = true;
    this.erro = null;

    this.service
      .criarPedido(this.slug, {
        nomeCliente: this.nomeCliente.trim() || null,
        mesaId: this.cardapio?.mesa?.id ?? null,
        itens: this.carrinho.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.qtd,
          observacao: item.observacao.trim() || null,
        })),
      })
      .subscribe({
        next: (pedido) => {
          this.enviando = false;
          this.pedidoCriado = pedido;
          this.carrinho = [];
        },
        error: (erro) => {
          this.enviando = false;
          this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível enviar o pedido. Tente novamente.');
        },
      });
  }

  novoPedido() {
    this.pedidoCriado = null;
  }
}
