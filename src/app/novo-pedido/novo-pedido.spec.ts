import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Produto, ProdutoService } from '../cadastro-produto/produto.service';
import { CaixaService } from '../caixa/caixa.service';
import { Comanda, ComandaService } from '../comandas/comanda.service';
import { MesaService } from '../mesas/mesa.service';
import { VendaService } from '../vendas/venda.service';
import { NovoPedido } from './novo-pedido';

const PRODUTO: Produto = {
  id: 5,
  nome: 'X-Burger',
  descricao: null,
  preco: 25.9,
  custo: null,
  flAtivo: true,
  natureza: null,
  categoria: { id: 1, nome: 'Lanches' } as Produto['categoria'],
};

function comanda(sobrescrever: Partial<Comanda> = {}): Comanda {
  return {
    id: 30,
    status: 'ABERTO',
    valorTotal: 51.8,
    dataCriacao: null,
    dataAlteracao: null,
    mesa: null,
    nomeCliente: null,
    observacao: null,
    vendaId: 9,
    tipoVenda: 'MESA',
    itens: [],
    ...sobrescrever,
  };
}

describe('NovoPedido', () => {
  let fixture: ComponentFixture<NovoPedido>;
  let component: NovoPedido;
  let comandaService: { criar: ReturnType<typeof vi.fn> };
  let vendaService: { registrarPagamento: ReturnType<typeof vi.fn>; finalizar: ReturnType<typeof vi.fn> };
  let caixaService: { atual: ReturnType<typeof vi.fn> };

  async function criar(parametros: Record<string, string> = {}, caixaAberto = true) {
    comandaService = { criar: vi.fn().mockReturnValue(of(comanda())) };
    vendaService = { registrarPagamento: vi.fn().mockReturnValue(of({})), finalizar: vi.fn().mockReturnValue(of({})) };
    caixaService = { atual: vi.fn().mockReturnValue(of(caixaAberto ? { id: 1 } : null)) };
    TestBed.configureTestingModule({
      imports: [NovoPedido],
      providers: [
        provideRouter([]),
        { provide: ProdutoService, useValue: { listar: () => of([PRODUTO]) } },
        { provide: MesaService, useValue: { listar: () => of([{ id: 2, numero: 2, ativa: true }]) } },
        { provide: ComandaService, useValue: comandaService },
        { provide: VendaService, useValue: vendaService },
        { provide: CaixaService, useValue: caixaService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } },
      ],
    });
    fixture = TestBed.createComponent(NovoPedido);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  /** Coloca 2 X-Burger no carrinho (R$ 51,80) e abre o modal de finalização. */
  function prepararModal() {
    component.adicionarAoCarrinho(PRODUTO);
    component.adicionarAoCarrinho(PRODUTO);
    component.abrirModal();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('should create', async () => {
    await criar();
    expect(component).toBeTruthy();
  });

  it('o modal só abre com itens no carrinho', async () => {
    await criar();

    component.abrirModal();
    expect(component.modalAberto()).toBe(false);

    prepararModal();
    expect(component.modalAberto()).toBe(true);
    expect(component.total()).toBeCloseTo(51.8);
  });

  it('modal oferece mesa, retirada e delivery marcado como em breve e indisponível', async () => {
    await criar();
    prepararModal();
    await fixture.whenStable();

    expect(texto()).toContain('Mesa');
    expect(texto()).toContain('Retirada');
    expect(texto()).toContain('Delivery');
    expect(texto()).toContain('Em breve');
    const delivery = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Delivery'));
    expect(delivery?.disabled).toBe(true);

    component.selecionarAtendimento('DELIVERY');
    expect(component.tipoAtendimento()).toBe('MESA');
  });

  it('atendimento de mesa exige a mesa; retirada exige o nome do cliente', async () => {
    await criar();
    prepararModal();

    expect(component.pendenciaDoModal()).toBe('Selecione a mesa.');
    component.mesaSelecionada.set(2);
    expect(component.pendenciaDoModal()).toBeNull();

    component.selecionarAtendimento('RETIRADA');
    expect(component.pendenciaDoModal()).toBe('Informe o nome do cliente da retirada.');
    component.cliente.set('  Maria ');
    expect(component.pendenciaDoModal()).toBeNull();
  });

  it('mesa sem pagamento: cria a comanda com mesa e observação e não registra pagamento', async () => {
    await criar();
    prepararModal();
    component.mesaSelecionada.set(2);
    component.cliente.set(' João ');
    component.observacao.set(' sem cebola ');

    component.confirmarPedido();

    expect(comandaService.criar).toHaveBeenCalledWith({
      status: 'ABERTO',
      tipoVenda: 'MESA',
      mesaId: 2,
      vendaId: null,
      cliente: 'João',
      observacao: 'sem cebola',
      itens: [{ produtoId: 5, quantidade: 2 }],
    });
    expect(vendaService.registrarPagamento).not.toHaveBeenCalled();
    expect(component.carrinho()).toEqual([]);
    expect(component.modalAberto()).toBe(false);
    expect(component.confirmacao()?.mensagem).toContain('Pedido #30');
    expect(component.confirmacao()?.vendaId).toBe(9);
  });

  it('mesa com forma de pagamento: registra o valor da comanda na conta, sem finalizar a venda', async () => {
    await criar();
    prepararModal();
    component.mesaSelecionada.set(2);
    component.selecionarForma('PIX');

    component.confirmarPedido();

    expect(vendaService.registrarPagamento).toHaveBeenCalledWith(9, { forma: 'PIX', valor: 51.8, valorRecebido: null });
    expect(vendaService.finalizar).not.toHaveBeenCalled();
    expect(component.confirmacao()?.mensagem).toContain('conta da mesa continua aberta');
  });

  it('retirada paga na hora: cria, registra o pagamento e finaliza a venda', async () => {
    await criar();
    prepararModal();
    component.selecionarAtendimento('RETIRADA');
    component.cliente.set('Maria');
    component.selecionarForma('DINHEIRO');
    component.valorRecebido.set(100);

    expect(component.troco()).toBeCloseTo(48.2);
    component.confirmarPedido();

    expect(comandaService.criar).toHaveBeenCalledWith(expect.objectContaining({ tipoVenda: 'RETIRADA', mesaId: null, cliente: 'Maria' }));
    expect(vendaService.registrarPagamento).toHaveBeenCalledWith(9, { forma: 'DINHEIRO', valor: 51.8, valorRecebido: 100 });
    expect(vendaService.finalizar).toHaveBeenCalledWith(9);
    expect(component.confirmacao()?.mensagem).toContain('pago e finalizado');
  });

  it('retirada para pagar na retirada: cria a comanda e deixa a venda em aberto', async () => {
    await criar();
    prepararModal();
    component.selecionarAtendimento('RETIRADA');
    component.cliente.set('Maria');

    component.confirmarPedido();

    expect(vendaService.registrarPagamento).not.toHaveBeenCalled();
    expect(vendaService.finalizar).not.toHaveBeenCalled();
    expect(component.confirmacao()?.aviso).toBe(false);
  });

  it('retirada paga na hora com o caixa fechado fica bloqueada, mas pagar depois continua liberado', async () => {
    await criar({}, false);
    prepararModal();
    component.selecionarAtendimento('RETIRADA');
    component.cliente.set('Maria');

    component.selecionarForma('PIX');
    expect(component.caixaFechado()).toBe(true);
    expect(component.podeConfirmar()).toBe(false);
    expect(component.pendenciaDoModal()).toContain('Abra o caixa');

    component.selecionarForma(null);
    expect(component.podeConfirmar()).toBe(true);
  });

  it('pagamento na mesa não depende do caixa', async () => {
    await criar({}, false);
    prepararModal();
    component.mesaSelecionada.set(2);
    component.selecionarForma('PIX');

    expect(component.caixaFechado()).toBe(false);
    expect(component.podeConfirmar()).toBe(true);
  });

  it('falha no pagamento depois de criar a comanda: avisa, limpa o carrinho e indica a conta', async () => {
    await criar();
    vendaService.finalizar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { erro: 'Abra o caixa antes de finalizar a venda' } })),
    );
    prepararModal();
    component.selecionarAtendimento('RETIRADA');
    component.cliente.set('Maria');
    component.selecionarForma('PIX');

    component.confirmarPedido();

    expect(component.carrinho()).toEqual([]);
    expect(component.confirmacao()?.aviso).toBe(true);
    expect(component.confirmacao()?.mensagem).toContain('Abra o caixa antes de finalizar a venda');
    expect(component.confirmacao()?.vendaId).toBe(9);
  });

  it('erro ao criar a comanda mostra a mensagem da API e mantém o carrinho', async () => {
    await criar();
    comandaService.criar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { erro: 'Estoque insuficiente de Pão' } })),
    );
    prepararModal();
    component.mesaSelecionada.set(2);

    component.confirmarPedido();

    expect(component.erro()).toBe('Estoque insuficiente de Pão');
    expect(component.carrinho().length).toBe(1);
    expect(component.enviando()).toBe(false);
  });

  it('?mesa=ID já escolhe a mesa; ?tipo=retirada&venda=ID inclui o pedido na retirada aberta, sem pagamento', async () => {
    await criar({ mesa: '2' });
    expect(component.mesaSelecionada()).toBe(2);

    TestBed.resetTestingModule();
    await criar({ tipo: 'retirada', venda: '14', cliente: 'Maria' });
    expect(component.tipoAtendimento()).toBe('RETIRADA');
    expect(component.vendaDaRetirada()).toBe(14);
    expect(component.cliente()).toBe('Maria');

    prepararModal();
    component.selecionarAtendimento('MESA');
    expect(component.tipoAtendimento()).toBe('RETIRADA');

    component.confirmarPedido();
    expect(comandaService.criar).toHaveBeenCalledWith(expect.objectContaining({ vendaId: 14, tipoVenda: 'RETIRADA' }));
  });
});
