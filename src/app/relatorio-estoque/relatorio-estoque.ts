import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { EstoqueService, ItemEstoque } from '../controle-estoque/estoque.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-relatorio-estoque',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, CarregandoComponent],
  templateUrl: './relatorio-estoque.html',
  styleUrl: './relatorio-estoque.scss',
})
export class RelatorioEstoque implements OnInit {
  private estoqueService = inject(EstoqueService);

  carregando = signal(true);
  erro = signal<string | null>(null);
  itens = signal<ItemEstoque[]>([]);

  private comEstoque = computed(() => this.itens().filter((item) => !!item.estoque));

  valorTotal = computed(() =>
    this.comEstoque().reduce((soma, item) => soma + item.estoque!.qtdAtual * item.ingrediente.custo, 0),
  );

  criticos = computed(() =>
    this.comEstoque()
      .filter((item) => item.estoque!.abaixoDoMinimo)
      .map((item) => ({
        nome: item.ingrediente.nome,
        unidade: item.ingrediente.unidadeMedida,
        atual: item.estoque!.qtdAtual,
        minimo: item.estoque!.qtdMinima,
        faltam: Math.max(0, item.estoque!.qtdMinima - item.estoque!.qtdAtual),
      }))
      .sort((a, b) => b.faltam - a.faltam),
  );

  semEstoque = computed(() => this.itens().filter((item) => !item.estoque).length);

  maiorValor = computed(() => {
    const linhas = this.comEstoque()
      .map((item) => ({ nome: item.ingrediente.nome, valor: item.estoque!.qtdAtual * item.ingrediente.custo }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
    const maior = Math.max(1, ...linhas.map((l) => l.valor));
    return linhas.map((l) => ({ ...l, percentual: (l.valor / maior) * 100 }));
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.estoqueService.listarItens().subscribe({
      next: (itens) => {
        this.itens.set(itens);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o estoque.'));
        this.carregando.set(false);
      },
    });
  }
}
