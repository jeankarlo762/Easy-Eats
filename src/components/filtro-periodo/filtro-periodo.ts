import { Component, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltroPeriodo, Periodo, PeriodoUtil } from '../../app/utils/periodoUtil';

/**
 * Filtro padrão de período (Hoje / 7 dias / 30 dias / Período personalizado).
 * Emite `periodoChange` com as datas yyyy-MM-dd já resolvidas.
 */
@Component({
  selector: 'app-filtro-periodo',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './filtro-periodo.html',
  styleUrl: './filtro-periodo.scss',
})
export class FiltroPeriodoComponent implements OnInit {
  readonly periodoChange = output<Periodo>();

  readonly opcoes: { valor: FiltroPeriodo; label: string }[] = [
    { valor: 'hoje', label: 'Hoje' },
    { valor: 'semana', label: '7 dias' },
    { valor: 'mes', label: '30 dias' },
    { valor: 'periodo', label: 'Período' },
  ];

  filtro = signal<FiltroPeriodo>('hoje');
  inicio = PeriodoUtil.paraIso(new Date());
  fim = PeriodoUtil.paraIso(new Date());

  ngOnInit(): void {
    this.emitir();
  }

  selecionar(filtro: FiltroPeriodo): void {
    this.filtro.set(filtro);
    if (filtro !== 'periodo') {
      this.emitir();
    }
  }

  aplicar(): void {
    this.emitir();
  }

  private emitir(): void {
    this.periodoChange.emit(PeriodoUtil.resolver(this.filtro(), { inicio: this.inicio, fim: this.fim }));
  }
}
