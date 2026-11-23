import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Venda, VendaService } from '../vendas/venda.service';
import { Conta } from './conta';

function criarVenda(sobrescrever: Partial<Venda> = {}): Venda {
  return {
    id: 7,
    tipo: 'MESA',
    mesaId: 2,
    numeroMesa: 2,
    status: 'ABERTA',
    nomeCliente: 'Ana',
    observacao: null,
    usuarioAbertura: 'func',
    dataAbertura: '2026-03-10T12:00:00',
    usuarioFechamento: null,
    dataFechamento: null,
    valorTotal: 51.8,
    valorPago: 0,
    valorRestante: 51.8,
    caixaId: null,
    motivoCancelamento: null,
    comandas: [
      {
        id: 11,
        status: 'EM_PREPARO',
        cliente: 'Ana',
        observacao: 'Sem cebola',
        dataCriacao: '2026-03-10T12:01:00',
        valorTotal: 51.8,
        itens: [{ produtoId: 5, nome: 'X-Burger', quantidade: 2, valorUnitario: 25.9, subtotal: 51.8 }],
      },
    ],
    pagamentos: [],
    ...sobrescrever,
  };
}

describe('Conta', () => {
  let fixture: ComponentFixture<Conta>;
  let component: Conta;
  let vendaService: {
    buscarPorId: ReturnType<typeof vi.fn>;
    registrarPagamento: ReturnType<typeof vi.fn>;
    removerPagamento: ReturnType<typeof vi.fn>;
    finalizar: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
  };

  async function criar(opcoes: { gestao: boolean; venda?: Venda; id?: string }) {
    const venda = opcoes.venda ?? criarVenda();
    vendaService = {
      buscarPorId: vi.fn().mockReturnValue(of(venda)),
      registrarPagamento: vi.fn().mockReturnValue(of(venda)),
      removerPagamento: vi.fn().mockReturnValue(of(venda)),
      finalizar: vi.fn().mockReturnValue(of(criarVenda({ status: 'FINALIZADA' }))),
      cancelar: vi.fn().mockReturnValue(of(criarVenda({ status: 'CANCELADA' }))),
    };
    TestBed.configureTestingModule({
      imports: [Conta],
      providers: [
        provideRouter([]),
        { provide: VendaService, useValue: vendaService },
        { provide: AuthService, useValue: { temPerfil: () => opcoes.gestao } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: opcoes.id ?? '7' }) } } },
      ],
    });
    fixture = TestBed.createComponent(Conta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botoes = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

  it('carrega a conta, mostra comandas, itens e o total, e sugere o valor restante como pagamento', async () => {
    await criar({ gestao: false });

    expect(vendaService.buscarPorId).toHaveBeenCalledWith(7);
    expect(texto()).toContain('Conta da mesa 2');
    expect(texto()).toContain('2x X-Burger');
    expect(texto()).toContain('Sem cebola');
    expect(component.valorPagamento()).toBe(51.8);
  });

  it('id inválido na rota: mostra erro e não consulta a API', async () => {
    await criar({ gestao: false, id: 'abc' });

    expect(vendaService.buscarPorId).not.toHaveBeenCalled();
    expect(component.erro()).toBe('Conta inválida.');
  });

  it('registra o pagamento em centavos e inclui o valor recebido só em dinheiro', async () => {
    await criar({ gestao: false });
    component.forma.set('DINHEIRO');
    component.valorPagamento.set(20.005);
    component.valorRecebido.set(50);

    component.registrarPagamento();

    expect(vendaService.registrarPagamento).toHaveBeenCalledWith(7, { forma: 'DINHEIRO', valor: 20.01, valorRecebido: 50 });

    // depois de registrar, a tela sugere de novo o valor restante: digita o valor outra vez
    component.forma.set('PIX');
    component.valorPagamento.set(20.005);
    component.registrarPagamento();
    expect(vendaService.registrarPagamento).toHaveBeenLastCalledWith(7, { forma: 'PIX', valor: 20.01, valorRecebido: null });
  });

  it('não registra pagamento sem valor ou com valor zero', async () => {
    await criar({ gestao: false });

    component.valorPagamento.set(null);
    component.registrarPagamento();
    component.valorPagamento.set(0);
    component.registrarPagamento();

    expect(vendaService.registrarPagamento).not.toHaveBeenCalled();
    expect(component.erro()).toContain('maior que zero');
  });

  it('calcula o troco do pagamento em dinheiro', async () => {
    await criar({ gestao: false });
    component.forma.set('DINHEIRO');
    component.valorPagamento.set(25.9);
    component.valorRecebido.set(50);

    expect(component.troco()).toBe(24.1);

    component.forma.set('PIX');
    expect(component.troco()).toBe(0);
  });

  it('só permite finalizar com o restante zerado e comandas ativas', async () => {
    await criar({ gestao: false, venda: criarVenda({ valorPago: 20, valorRestante: 31.8 }) });
    expect(component.podeFinalizar()).toBe(false);

    TestBed.resetTestingModule();
    await criar({ gestao: false, venda: criarVenda({ valorPago: 51.8, valorRestante: 0 }) });
    expect(component.podeFinalizar()).toBe(true);

    TestBed.resetTestingModule();
    const semComandasAtivas = criarVenda({ valorRestante: 0 });
    semComandasAtivas.comandas[0].status = 'CANCELADO';
    await criar({ gestao: false, venda: semComandasAtivas });
    expect(component.podeFinalizar()).toBe(false);
  });

  it('finalizar chama a API e atualiza a conta; falta de caixa oferece o atalho para abrir', async () => {
    await criar({ gestao: false, venda: criarVenda({ valorPago: 51.8, valorRestante: 0 }) });

    component.finalizar();
    await fixture.whenStable();
    expect(vendaService.finalizar).toHaveBeenCalledWith(7);
    expect(component.venda()?.status).toBe('FINALIZADA');

    vendaService.finalizar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { erro: 'Abra o caixa antes de finalizar a venda' } })),
    );
    component.venda.set(criarVenda({ valorPago: 51.8, valorRestante: 0 }));
    component.finalizar();

    expect(component.erro()).toBe('Abra o caixa antes de finalizar a venda');
    expect(component.precisaAbrirCaixa()).toBe(true);
  });

  it('venda finalizada não oferece pagamento nem cancelamento', async () => {
    await criar({ gestao: true, venda: criarVenda({ status: 'FINALIZADA', usuarioFechamento: 'func', dataFechamento: '2026-03-10T13:00:00', caixaId: 3 }) });

    expect(botoes().some((t) => t.includes('Cancelar venda'))).toBe(false);
    expect(botoes().some((t) => t.includes('Finalizar venda'))).toBe(false);
    expect(texto()).toContain('Finalizada por func');
  });

  it('só a gestão vê o botão de cancelar a venda', async () => {
    await criar({ gestao: false });
    expect(botoes().some((t) => t.includes('Cancelar venda'))).toBe(false);

    TestBed.resetTestingModule();
    await criar({ gestao: true });
    expect(botoes().some((t) => t.includes('Cancelar venda'))).toBe(true);
  });

  it('cancelar exige o motivo', async () => {
    await criar({ gestao: true });
    component.abrirCancelamento();

    component.confirmarCancelamento();

    expect(vendaService.cancelar).not.toHaveBeenCalled();
    expect(component.erroModal()).toBe('Informe o motivo do cancelamento.');
  });

  it('devolver estoque exige a senha do gerente e a envia só quando a opção está marcada', async () => {
    await criar({ gestao: true });
    component.abrirCancelamento();
    component.motivo.set('Cliente desistiu');
    component.devolverEstoque.set(true);

    component.confirmarCancelamento();
    expect(vendaService.cancelar).not.toHaveBeenCalled();
    expect(component.erroModal()).toBe('Informe a senha do gerente para devolver o estoque.');

    component.senhaGerente.set('segredo');
    component.confirmarCancelamento();
    expect(vendaService.cancelar).toHaveBeenCalledWith(7, {
      motivo: 'Cliente desistiu',
      devolverEstoque: true,
      senhaGerente: 'segredo',
    });
    expect(component.modalCancelamento()).toBe(false);
    expect(component.venda()?.status).toBe('CANCELADA');
  });

  it('sem marcar a devolução, a senha não é enviada mesmo que tenha sido digitada', async () => {
    await criar({ gestao: true });
    component.abrirCancelamento();
    component.motivo.set('Erro de lançamento');
    component.senhaGerente.set('segredo');

    component.confirmarCancelamento();

    expect(vendaService.cancelar).toHaveBeenCalledWith(7, {
      motivo: 'Erro de lançamento',
      devolverEstoque: false,
      senhaGerente: null,
    });
  });

  it('senha incorreta devolvida pela API fica no modal, que continua aberto', async () => {
    await criar({ gestao: true });
    vendaService.cancelar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { erro: 'Senha do gerente incorreta' } })),
    );
    component.abrirCancelamento();
    component.motivo.set('Cliente desistiu');
    component.devolverEstoque.set(true);
    component.senhaGerente.set('errada');

    component.confirmarCancelamento();

    expect(component.erroModal()).toBe('Senha do gerente incorreta');
    expect(component.modalCancelamento()).toBe(true);
    expect(component.venda()?.status).toBe('ABERTA');
  });

  it('o atalho de novo pedido leva a mesa ou a retirada da conta', async () => {
    await criar({ gestao: false });
    expect(component.novoPedidoParams(criarVenda())).toEqual({ mesa: 2 });
    expect(component.novoPedidoParams(criarVenda({ tipo: 'RETIRADA', mesaId: null, nomeCliente: 'Maria' }))).toEqual({
      tipo: 'retirada',
      venda: 7,
      cliente: 'Maria',
    });
  });

  it('título da conta: mesa ou retirada com o nome do cliente', async () => {
    await criar({ gestao: false });

    expect(component.titulo(criarVenda())).toBe('Conta da mesa 2');
    expect(component.titulo(criarVenda({ tipo: 'RETIRADA', numeroMesa: null, nomeCliente: 'Maria' }))).toBe('Retirada de Maria');
  });
});
