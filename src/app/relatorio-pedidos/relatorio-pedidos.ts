import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { STATUS_PEDIDO, Venda, VendaService } from '../novo-pedido/venda.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

interface LinhaStatus {
  status: string;
  cor: string;
  quantidade: number;
  valor: number;
}

interface LinhaDia {
  dia: string;
  pedidos: number;
  valor: number;
}

const CORES_STATUS: Record<string, string> = {
  [STATUS_PEDIDO.AGUARDANDO]: 'azul',
  [STATUS_PEDIDO.PREPARANDO]: 'laranja',
  [STATUS_PEDIDO.PRONTO]: 'roxo',
  [STATUS_PEDIDO.ENTREGUE]: 'verde',
};

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

@Component({
  selector: 'app-relatorio-pedidos',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './relatorio-pedidos.html',
  styleUrl: './relatorio-pedidos.scss',
})
export class RelatorioPedidos implements OnInit {
  private vendaService = inject(VendaService);

  carregando = true;
  erro: string | null = null;
  vendas: Venda[] = [];

  ngOnInit() {
    this.carregando = true;

    this.vendaService.listar().subscribe({
      next: (vendas) => {
        this.vendas = vendas;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o relatório de pedidos.');
        this.carregando = false;
      },
    });
  }

  private totalVenda(venda: Venda): number {
    return (venda.itens ?? []).reduce((soma, item) => soma + (item.valor_total ?? 0), 0);
  }

  get totalPedidos(): number {
    return this.vendas.length;
  }

  get valorTotal(): number {
    return this.vendas.reduce((soma, v) => soma + this.totalVenda(v), 0);
  }

  get ticketMedio(): number {
    return this.totalPedidos > 0 ? this.valorTotal / this.totalPedidos : 0;
  }

  get porStatus(): LinhaStatus[] {
    const mapa = new Map<string, LinhaStatus>();
    for (const venda of this.vendas) {
      const status = venda.status;
      const linha = mapa.get(status) ?? { status, cor: CORES_STATUS[status] ?? 'azul', quantidade: 0, valor: 0 };
      linha.quantidade += 1;
      linha.valor += this.totalVenda(venda);
      mapa.set(status, linha);
    }
    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
  }

  get porDia(): LinhaDia[] {
    const mapa = new Map<number, LinhaDia>();
    for (const venda of this.vendas) {
      if (!venda.dt_criacao) continue;
      const diaSemana = new Date(venda.dt_criacao).getDay();
      const linha = mapa.get(diaSemana) ?? { dia: DIAS_SEMANA[diaSemana], pedidos: 0, valor: 0 };
      linha.pedidos += 1;
      linha.valor += this.totalVenda(venda);
      mapa.set(diaSemana, linha);
    }
    // Domingo (0) a Sábado (6), na ordem tradicional da semana
    return Array.from({ length: 7 }, (_, i) => mapa.get(i) ?? { dia: DIAS_SEMANA[i], pedidos: 0, valor: 0 });
  }

  get maiorValorDia(): number {
    const valores = this.porDia.map((d) => d.valor);
    return valores.length ? Math.max(...valores, 1) : 1;
  }
}
