import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ResumoVendas, VendaResumo, VendaService } from '../vendas/venda.service';
import { Financeiro } from './financeiro';

const RESUMO: ResumoVendas = {
  totalFaturado: 200,
  quantidadeVendas: 4,
  ticketMedio: 50,
  quantidadeCanceladas: 1,
  porFormaPagamento: [
    { forma: 'DINHEIRO', total: 50 },
    { forma: 'PIX', total: 150 },
  ],
  porDia: [{ dia: '2026-03-10', quantidade: 4, total: 200 }],
};

const VENDA: VendaResumo = {
  id: 3,
  tipo: 'RETIRADA',
  mesaId: null,
  numeroMesa: null,
  status: 'FINALIZADA',
  nomeCliente: 'Maria',
  usuarioAbertura: 'func',
  dataAbertura: '2026-03-10T12:00:00',
  usuarioFechamento: 'func',
  dataFechamento: '2026-03-10T12:30:00',
  valorTotal: 50,
};

describe('Financeiro', () => {
  let fixture: ComponentFixture<Financeiro>;
  let component: Financeiro;
  let vendaService: { resumir: ReturnType<typeof vi.fn>; listar: ReturnType<typeof vi.fn>; abertas: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vendaService = {
      resumir: vi.fn().mockReturnValue(of(RESUMO)),
      listar: vi.fn().mockReturnValue(of({ itens: [VENDA], total: 25, pagina: 0, tamanho: 10, totalPaginas: 3 })),
      abertas: vi.fn().mockReturnValue(of([{ ...VENDA, status: 'ABERTA', valorTotal: 30 }, { ...VENDA, id: 4, status: 'ABERTA', valorTotal: 12.5 }])),
    };
    TestBed.configureTestingModule({
      imports: [Financeiro],
      providers: [provideRouter([]), { provide: VendaService, useValue: vendaService }],
    });
    fixture = TestBed.createComponent(Financeiro);
    component = fixture.componentInstance;
    await fixture.whenStable();
    vendaService.resumir.mockClear();
    vendaService.listar.mockClear();
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('ao montar, o filtro de período dispara a primeira carga (resumo, vendas finalizadas e abertas)', () => {
    expect(component.periodo()).not.toBeNull();
    expect(component.resumo()?.totalFaturado).toBe(200);
  });

  it('consulta o resumo e só as vendas finalizadas do período, na primeira página', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });

    expect(vendaService.resumir).toHaveBeenCalledWith('2026-03-01', '2026-03-31');
    expect(vendaService.listar).toHaveBeenCalledWith(
      { status: 'FINALIZADA', inicio: '2026-03-01', fim: '2026-03-31' },
      0,
      10,
    );
  });

  it('soma o valor das contas ainda abertas, independente do período', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });

    expect(component.emAberto()).toBe(42.5);
  });

  it('trocar de página busca só a lista, sem refazer o resumo', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    vendaService.resumir.mockClear();

    component.irParaPagina(2);

    expect(vendaService.listar).toHaveBeenLastCalledWith(expect.anything(), 2, 10);
    expect(vendaService.resumir).not.toHaveBeenCalled();
  });

  it('calcula a participação de cada forma de pagamento e protege contra faturamento zero', () => {
    expect(component.percentual(50)).toBe(25);
    expect(component.percentual(150)).toBe(75);

    component.resumo.set({ ...RESUMO, totalFaturado: 0 });
    expect(component.percentual(10)).toBe(0);
  });

  it('identifica o atendimento: mesa pelo número, retirada pelo nome do cliente', () => {
    expect(component.identificacao({ ...VENDA, tipo: 'MESA', numeroMesa: 4 })).toBe('Mesa 4');
    expect(component.identificacao(VENDA)).toBe('Retirada · Maria');
  });

  it('mostra o faturamento, as formas de pagamento e o link para a conta de cada venda', async () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    await fixture.whenStable();

    expect(texto()).toContain('Faturamento');
    expect(texto()).toContain('Pix');
    expect(texto()).toContain('Retirada · Maria');
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/conta/3"]')).not.toBeNull();
  });

  it('erro da API aparece na tela', async () => {
    vendaService.resumir.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { erro: 'Operação permitida apenas para Administrador ou Gerente' } })),
    );

    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });

    expect(component.erro()).toBe('Operação permitida apenas para Administrador ou Gerente');
    expect(component.carregando()).toBe(false);
  });
});
