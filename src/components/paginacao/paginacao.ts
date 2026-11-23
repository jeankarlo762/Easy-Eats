import { Component, input, output } from '@angular/core';

/**
 * Navegação de páginas padrão para listagens paginadas pelo backend.
 * `pagina` começa em 0 (igual ao PaginaDto da API). Emite `paginaChange` com a nova página.
 */
@Component({
  selector: 'app-paginacao',
  standalone: true,
  templateUrl: './paginacao.html',
  styleUrl: './paginacao.scss',
})
export class PaginacaoComponent {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly total = input.required<number>();
  readonly desabilitado = input(false);
  readonly paginaChange = output<number>();

  anterior(): void {
    if (this.pagina() > 0) {
      this.paginaChange.emit(this.pagina() - 1);
    }
  }

  proxima(): void {
    if (this.pagina() + 1 < this.totalPaginas()) {
      this.paginaChange.emit(this.pagina() + 1);
    }
  }
}
