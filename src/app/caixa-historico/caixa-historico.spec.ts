import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Caixa, CaixaService, Pagina } from '../caixa/caixa.service';
import { CaixaHistorico } from './caixa-historico';

const FECHADO: Caixa = {
  id: 8,
  status: 'FECHADO',
  fundoCaixa: 100,
  usuarioAbertura: 'ana',
  dataAbertura: '2026-03-10T09:00:00',
  observacaoAbertura: null,
  usuarioFechamento: 'gerente',
  dataFechamento: '2026-03-10T17:00:00',
  valorEsperado: 100,
  valorContado: 105,
  diferenca: 5,
  observacaoFechamento: 'Gorjeta',
  saldoAtual: 100,
};

const ABERTO: Caixa = { ...FECHADO, id: 9, status: 'ABERTO', usuarioFechamento: null, dataFechamento: null, valorEsperado: null, valorContado: null, diferenca: null, observacaoFechamento: null };

const PAGINA: Pagina<Caixa> = { itens: [FECHADO, ABERTO], total: 2, pagina: 0, tamanho: 15, totalPaginas: 1 };

describe('CaixaHistorico', () => {
  let fixture: ComponentFixture<CaixaHistorico>;
  let component: CaixaHistorico;
  let caixaService: { listar: ReturnType<typeof vi.fn> };
  let consultasIniciais: number;

  beforeEach(async () => {
    caixaService = { listar: vi.fn().mockReturnValue(of(PAGINA)) };
    TestBed.configureTestingModule({
      imports: [CaixaHistorico],
      providers: [provideRouter([]), { provide: CaixaService, useValue: caixaService }],
    });
    fixture = TestBed.createComponent(CaixaHistorico);
    component = fixture.componentInstance;
    await fixture.whenStable();
    consultasIniciais = caixaService.listar.mock.calls.length;
    caixaService.listar.mockClear();
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('ao receber o período consulta a primeira página sem filtro de status', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });

    expect(caixaService.listar).toHaveBeenCalledWith(
      { inicio: '2026-03-01', fim: '2026-03-31', usuario: '', status: null },
      0,
      15,
    );
  });

  it('o filtro de status e o de usuário entram na consulta e voltam para a página 0', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    component.usuario.set('ana');

    component.selecionarStatus('FECHADO');

    expect(caixaService.listar).toHaveBeenLastCalledWith(
      { inicio: '2026-03-01', fim: '2026-03-31', usuario: 'ana', status: 'FECHADO' },
      0,
      15,
    );
  });

  it('trocar de página mantém os filtros atuais', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    component.selecionarStatus('ABERTO');

    component.carregar(3);

    expect(caixaService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ABERTO' }), 3, 15);
  });

  it('ao montar, o filtro de período emite o intervalo inicial e dispara a primeira consulta', () => {
    expect(consultasIniciais).toBe(1);
    expect(component.periodo()).not.toBeNull();
  });

  it('lista os caixas e só oferece o relatório dos fechados', async () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    await fixture.whenStable();

    expect(texto()).toContain('#8');
    expect(texto()).toContain('#9');
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('a[href*="caixa-relatorio"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toContain('/caixa-relatorio/8');
  });

  it('classifica a diferença: zero ok, sobra aviso, falta erro', () => {
    expect(component.classeDiferenca(0)).toBe('sucesso');
    expect(component.classeDiferenca(null)).toBe('sucesso');
    expect(component.classeDiferenca(5)).toBe('aviso');
    expect(component.classeDiferenca(-5)).toBe('erro');
  });
});
