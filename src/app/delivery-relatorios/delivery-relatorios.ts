import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { EntregaService, RelatorioDelivery } from '../delivery-dashboard/entrega.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-delivery-relatorios',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './delivery-relatorios.html',
  styleUrl: './delivery-relatorios.scss',
})
export class DeliveryRelatorios implements OnInit {
  private entregaService = inject(EntregaService);

  carregando = true;
  erro: string | null = null;
  relatorio: RelatorioDelivery | null = null;

  ngOnInit() {
    this.carregando = true;

    this.entregaService.relatorio().subscribe({
      next: (relatorio) => {
        this.relatorio = relatorio;
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o relatório de delivery.');
        this.carregando = false;
      },
    });
  }

  get porDia() {
    return this.relatorio?.porDiaSemana ?? [];
  }

  get ranking() {
    return this.relatorio?.ranking ?? [];
  }

  get maiorEntregasDia(): number {
    const valores = this.porDia.map((d) => d.entregas);
    return valores.length ? Math.max(...valores, 1) : 1;
  }
}
