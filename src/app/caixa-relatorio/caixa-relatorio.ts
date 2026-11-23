import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { RelatorioFechamento, TIPO_MOVIMENTACAO_LABEL, CaixaService, ehSaida } from '../caixa/caixa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-caixa-relatorio',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, CarregandoComponent],
  templateUrl: './caixa-relatorio.html',
  styleUrl: './caixa-relatorio.scss',
})
export class CaixaRelatorio implements OnInit {
  private caixaService = inject(CaixaService);
  private route = inject(ActivatedRoute);

  readonly tipoLabel = TIPO_MOVIMENTACAO_LABEL;
  readonly ehSaida = ehSaida;

  relatorio = signal<RelatorioFechamento | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.erro.set('Caixa inválido.');
      this.carregando.set(false);
      return;
    }
    this.caixaService.relatorioFechamento(id).subscribe({
      next: (relatorio) => {
        this.relatorio.set(relatorio);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o relatório de fechamento.'));
        this.carregando.set(false);
      },
    });
  }

  imprimir(): void {
    window.print();
  }

  rotuloDiferenca(diferenca: number | null): string {
    if (!diferenca) {
      return 'Sem diferença';
    }
    return diferenca > 0 ? 'Sobra' : 'Falta';
  }

  /** Verde sem diferença, amarelo com sobra, vermelho com falta. */
  classeDiferenca(diferenca: number | null): string {
    if (!diferenca) {
      return 'sucesso';
    }
    return diferenca > 0 ? 'aviso' : 'erro';
  }
}
