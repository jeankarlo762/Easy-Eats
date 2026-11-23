import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CaixaService, ehSaida } from './caixa.service';

const API = `${environment.apiUrl}/caixa`;

describe('CaixaService', () => {
  let service: CaixaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CaixaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('atual() devolve null quando a API responde 204 (sem caixa aberto)', () => {
    let resultado: unknown = 'nao-chamou';
    service.atual().subscribe((caixa) => (resultado = caixa));

    const req = http.expectOne(`${API}/atual`);
    expect(req.request.method).toBe('GET');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(resultado).toBeNull();
  });

  it('abrir() envia fundo e observação e nunca o usuário', () => {
    service.abrir(100, 'Turno da manhã').subscribe();

    const req = http.expectOne(`${API}/abrir`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fundoCaixa: 100, observacao: 'Turno da manhã' });
    req.flush({});
  });

  it('lancar() envia tipo, valor e descrição para o caixa informado', () => {
    service.lancar(7, 'SANGRIA', 30.5, 'Fornecedor').subscribe();

    const req = http.expectOne(`${API}/7/movimentacoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tipo: 'SANGRIA', valor: 30.5, descricao: 'Fornecedor' });
    req.flush({});
  });

  it('fechar() envia o valor contado e a justificativa', () => {
    service.fechar(7, 95, 'Falta no troco').subscribe();

    const req = http.expectOne(`${API}/7/fechar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ valorContado: 95, observacao: 'Falta no troco' });
    req.flush({});
  });

  it('listar() envia só os filtros preenchidos, com a paginação', () => {
    service.listar({ inicio: '2026-03-01', fim: '2026-03-31', usuario: '  ', status: 'FECHADO' }, 2, 15).subscribe();

    const req = http.expectOne((r) => r.url === API);
    expect(req.request.params.get('inicio')).toBe('2026-03-01');
    expect(req.request.params.get('fim')).toBe('2026-03-31');
    expect(req.request.params.get('status')).toBe('FECHADO');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamanho')).toBe('15');
    expect(req.request.params.has('usuario')).toBe(false);
    req.flush({ itens: [], total: 0, pagina: 2, tamanho: 15, totalPaginas: 0 });
  });

  it('listar() sem status não envia o parâmetro', () => {
    service.listar({ status: null }, 0, 10).subscribe();

    const req = http.expectOne((r) => r.url === API);
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ itens: [], total: 0, pagina: 0, tamanho: 10, totalPaginas: 0 });
  });

  it('listarMovimentacoes() aplica tipo, usuário, caixa e período', () => {
    service
      .listarMovimentacoes({ inicio: '2026-03-10', fim: '2026-03-10', tipo: 'SANGRIA', usuario: 'ana', caixaId: 4 }, 0, 20)
      .subscribe();

    const req = http.expectOne((r) => r.url === `${API}/movimentacoes`);
    expect(req.request.params.get('tipo')).toBe('SANGRIA');
    expect(req.request.params.get('usuario')).toBe('ana');
    expect(req.request.params.get('caixaId')).toBe('4');
    expect(req.request.params.get('inicio')).toBe('2026-03-10');
    expect(req.request.params.get('tamanho')).toBe('20');
    req.flush({ itens: [], total: 0, pagina: 0, tamanho: 20, totalPaginas: 0 });
  });

  it('resumirMovimentacoes() usa os mesmos filtros, sem paginação', () => {
    service.resumirMovimentacoes({ tipo: null, usuario: 'ana', caixaId: null }).subscribe();

    const req = http.expectOne((r) => r.url === `${API}/movimentacoes/resumo`);
    expect(req.request.params.get('usuario')).toBe('ana');
    expect(req.request.params.has('tipo')).toBe(false);
    expect(req.request.params.has('caixaId')).toBe(false);
    expect(req.request.params.has('pagina')).toBe(false);
    req.flush({ totalEntradas: 0, totalSaidas: 0, saldo: 0 });
  });

  it('relatorioFechamento() consulta o relatório do caixa', () => {
    service.relatorioFechamento(9).subscribe();

    const req = http.expectOne(`${API}/9/relatorio-fechamento`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});

describe('ehSaida', () => {
  it('só a sangria retira dinheiro do caixa', () => {
    expect(ehSaida('SANGRIA')).toBe(true);
    expect(ehSaida('SUPRIMENTO')).toBe(false);
    expect(ehSaida('FUNDO_INICIAL')).toBe(false);
  });
});
