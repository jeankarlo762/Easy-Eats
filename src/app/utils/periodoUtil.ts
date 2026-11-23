export type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | 'periodo';

export interface Periodo {
  inicio: string;
  fim: string;
}

export class PeriodoUtil {
  /**
   * Resolve um filtro de período (hoje / últimos 7 dias / últimos 30 dias /
   * intervalo customizado) em datas ISO (`yyyy-MM-dd`) prontas para os
   * endpoints de relatório do backend.
   *
   * @param filtro Filtro selecionado na UI.
   * @param custom Datas de início/fim quando `filtro === 'periodo'`.
   */
  static resolver = (filtro: FiltroPeriodo, custom?: Periodo): Periodo => {
    const hoje = new Date();
    const fim = PeriodoUtil.paraIso(hoje);

    if (filtro === 'periodo' && custom) {
      return custom;
    }

    const dias = filtro === 'semana' ? 6 : filtro === 'mes' ? 29 : 0;
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - dias);

    return { inicio: PeriodoUtil.paraIso(inicio), fim };
  };

  /** Data local em yyyy-MM-dd (toISOString usaria UTC e trocaria o dia à noite). */
  static paraIso = (data: Date): string => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };
}
