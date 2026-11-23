import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CaixaService, MovimentacaoCaixa, Pagina } from '../caixa/caixa.service';
import { GestaoFinanceira } from './gestao-financeira';

const MOVIMENTACAO: MovimentacaoCaixa = {
  id: 1,
  caixaId: 3,
  vendaId: null,
  tipo: 'SANGRIA',
  valor: 40,
  descricao: 'Fornecedor',
  usuario: 'gerente',
  dataMovimentacao: '2026-03-10T10:00:00',
};

const PAGINA: Pagina<MovimentacaoCaixa> = { itens: [MOVIMENTACAO], total: 45, pagina: 0, tamanho: 20, totalPaginas: 3 };

describe('GestaoFinanceira (lançamentos do caixa)', () => {
  let fixture: ComponentFixture<GestaoFinanceira>;
  let component: GestaoFinanceira;
  let caixaService: {
    listarMovimentacoes: ReturnType<typeof vi.fn>;
    resumirMovimentacoes: ReturnType<typeof vi.fn>;
  };
  let consultasIniciais: number;

  beforeEach(async () => {
    caixaService = {
      listarMovimentacoes: vi.fn().mockReturnValue(of(PAGINA)),
      resumirMovimentacoes: vi.fn().mockReturnValue(of({ totalEntradas: 100, totalSaidas: 40, saldo: 60 })),
    };
    TestBed.configureTestingModule({
      imports: [GestaoFinanceira],
      providers: [{ provide: CaixaService, useValue: caixaService }],
    });
    fixture = TestBed.createComponent(GestaoFinanceira);
    component = fixture.componentInstance;
    await fixture.whenStable();
    consultasIniciais = caixaService.listarMovimentacoes.mock.calls.length;
    caixaService.listarMovimentacoes.mockClear();
    caixaService.resumirMovimentacoes.mockClear();
  });

  it('ao receber o período busca a lista e os totais com o mesmo filtro', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });

    const filtroEsperado = { inicio: '2026-03-01', fim: '2026-03-31', tipo: null, usuario: '', caixaId: null };
    expect(caixaService.listarMovimentacoes).toHaveBeenCalledWith(filtroEsperado, 0, 20);
    expect(caixaService.resumirMovimentacoes).toHaveBeenCalledWith(filtroEsperado);
    expect(component.pagina()?.total).toBe(45);
    expect(component.resumo()?.saldo).toBe(60);
    expect(component.carregando()).toBe(false);
  });

  it('o filtro de tipo e os campos de usuário e caixa entram na consulta', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    component.usuario.set('gerente');
    component.caixaId.set(3);

    component.selecionarTipo('SANGRIA');

    expect(caixaService.listarMovimentacoes).toHaveBeenLastCalledWith(
      { inicio: '2026-03-01', fim: '2026-03-31', tipo: 'SANGRIA', usuario: 'gerente', caixaId: 3 },
      0,
      20,
    );
  });

  it('o tipo "Todos" não envia filtro de tipo', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    component.selecionarTipo('SUPRIMENTO');
    component.selecionarTipo('TODOS');

    expect(caixaService.listarMovimentacoes).toHaveBeenLastCalledWith(expect.objectContaining({ tipo: null }), 0, 20);
  });

  it('trocar de página busca só a lista, sem refazer os totais', () => {
    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });
    caixaService.resumirMovimentacoes.mockClear();

    component.irParaPagina(2);

    expect(caixaService.listarMovimentacoes).toHaveBeenLastCalledWith(expect.anything(), 2, 20);
    expect(caixaService.resumirMovimentacoes).not.toHaveBeenCalled();
  });

  it('ao montar, o filtro de período emite o intervalo inicial e dispara a primeira consulta', () => {
    expect(consultasIniciais).toBe(1);
    expect(component.periodo()).not.toBeNull();
  });

  it('mostra a mensagem da API quando a consulta falha', () => {
    caixaService.listarMovimentacoes.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { erro: 'Operação permitida apenas para Administrador ou Gerente' } })),
    );

    component.aplicarPeriodo({ inicio: '2026-03-01', fim: '2026-03-31' });

    expect(component.erro()).toBe('Operação permitida apenas para Administrador ou Gerente');
    expect(component.carregando()).toBe(false);
  });
});
