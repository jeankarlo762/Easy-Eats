import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { PedidoService, RelatorioCozinha as RelatorioCozinhaDto } from '../pedido.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-relatorio-cozinha',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './relatorio-cozinha.html',
  styleUrl: './relatorio-cozinha.scss',
})
export class RelatorioCozinha implements OnInit {
  private pedidoService = inject(PedidoService);

  carregando = true;
  erro: string | null = null;
  relatorio: RelatorioCozinhaDto | null = null;

  ngOnInit() {
    this.carregando = true;

    this.pedidoService.relatorioCozinha().subscribe({
      next: (relatorio) => {
        this.relatorio = relatorio;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o relatório da cozinha.');
        this.carregando = false;
      },
    });
  }

  get itensMaisPreparados() {
    return this.relatorio?.itensMaisPreparados ?? [];
  }

  get tempoPorHorario() {
    return this.relatorio?.tempoPorHorario ?? [];
  }

  get maiorTempo(): number {
    const valores = this.tempoPorHorario.map((t) => t.minutos);
    return valores.length ? Math.max(...valores, 1) : 1;
  }

  get maiorQuantidadeItem(): number {
    const valores = this.itensMaisPreparados.map((i) => i.quantidade);
    return valores.length ? Math.max(...valores, 1) : 1;
  }
}
