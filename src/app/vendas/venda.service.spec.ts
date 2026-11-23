import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProdutoService } from '../cadastro-produto/produto.service';
import { Venda, VendaService } from './venda.service';

const API = `${environment.apiUrl}/vendas`;

const VENDA_API = {
  id: 7,
  tipo: 'MESA',
  mesaId: 2,
  numeroMesa: 2,
  status: 'ABERTA',
  nomeCliente: 'Ana',
  observacao: null,
  usuarioAbertura: 'gerente',
  dataAbertura: '2026-03-10T12:00:00',
  usuarioFechamento: null,
  dataFechamento: null,
  valorTotal: 51.8,
  valorPago: 0,
  valorRestante: 51.8,
  caixaId: null,
  motivoCancelamento: null,
  pagamentos: [],
  comandas: [
    {
      id: 11,
      status: 'EM_PREPARO',
      cliente: 'Ana',
      observacao: 'Sem cebola',
      dataCriacao: '2026-03-10T12:01:00',
      valorTotal: 51.8,
      itens: [
        { produtoId: 5, quantidade: 2, valorUnitario: 25.9 },
        { produtoId: 99, quantidade: 1, valorUnitario: 0 },
      ],
    },
  ],
};

describe('VendaService', () => {
  let service: VendaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProdutoService, useValue: { listar: () => of([{ id: 5, nome: 'X-Burger' }]) } },
      ],
    });
    service = TestBed.inject(VendaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ocupacaoMesas() e abertas() consultam os endpoints de operação', () => {
    service.ocupacaoMesas().subscribe();
    service.abertas().subscribe();

    http.expectOne(`${API}/ocupacao-mesas`).flush([]);
    http.expectOne(`${API}/abertas`).flush([]);
  });

  it('buscarPorId() traz o nome dos produtos e calcula subtotal e total de cada comanda', () => {
    let venda: Venda | undefined;
    service.buscarPorId(7).subscribe((v) => (venda = v));

    http.expectOne(`${API}/7`).flush(VENDA_API);

    const comanda = venda!.comandas[0];
    expect(comanda.itens[0].nome).toBe('X-Burger');
    expect(comanda.itens[0].subtotal).toBeCloseTo(51.8);
    expect(comanda.itens[1].nome).toBe('Produto #99');
    expect(comanda.valorTotal).toBeCloseTo(51.8);
  });

  it('listar() envia só os filtros preenchidos e a paginação', () => {
    service.listar({ status: 'FINALIZADA', inicio: '2026-03-01', fim: '2026-03-31', usuario: '  ', mesaId: null }, 1, 10).subscribe();

    const req = http.expectOne((r) => r.url === API);
    expect(req.request.params.get('status')).toBe('FINALIZADA');
    expect(req.request.params.get('inicio')).toBe('2026-03-01');
    expect(req.request.params.get('fim')).toBe('2026-03-31');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamanho')).toBe('10');
    expect(req.request.params.has('usuario')).toBe(false);
    expect(req.request.params.has('mesaId')).toBe(false);
    req.flush({ itens: [], total: 0, pagina: 1, tamanho: 10, totalPaginas: 0 });
  });

  it('resumir() consulta o resumo do período', () => {
    service.resumir('2026-03-01', '2026-03-31').subscribe();

    const req = http.expectOne((r) => r.url === `${API}/resumo`);
    expect(req.request.params.get('inicio')).toBe('2026-03-01');
    expect(req.request.params.get('fim')).toBe('2026-03-31');
    req.flush({});
  });

  it('registrarPagamento() envia forma, valor e valor recebido', () => {
    service.registrarPagamento(7, { forma: 'DINHEIRO', valor: 20, valorRecebido: 50 }).subscribe();

    const req = http.expectOne(`${API}/7/pagamentos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ forma: 'DINHEIRO', valor: 20, valorRecebido: 50 });
    req.flush(VENDA_API);
  });

  it('removerPagamento() e finalizar() usam as rotas da venda', () => {
    service.removerPagamento(7, 3).subscribe();
    service.finalizar(7).subscribe();

    const remover = http.expectOne(`${API}/7/pagamentos/3`);
    expect(remover.request.method).toBe('DELETE');
    remover.flush(VENDA_API);
    const finalizar = http.expectOne(`${API}/7/finalizar`);
    expect(finalizar.request.method).toBe('POST');
    finalizar.flush(VENDA_API);
  });

  it('cancelar() envia motivo, a opção de devolver estoque e a senha do gerente', () => {
    service.cancelar(7, { motivo: 'Cliente desistiu', devolverEstoque: true, senhaGerente: 'segredo' }).subscribe();

    const req = http.expectOne(`${API}/7/cancelar`);
    expect(req.request.body).toEqual({ motivo: 'Cliente desistiu', devolverEstoque: true, senhaGerente: 'segredo' });
    req.flush(VENDA_API);
  });

  it('atualizar() altera cliente e observação', () => {
    service.atualizar(7, 'Maria', 'Sem gelo').subscribe();

    const req = http.expectOne(`${API}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nomeCliente: 'Maria', observacao: 'Sem gelo' });
    req.flush(VENDA_API);
  });
});
