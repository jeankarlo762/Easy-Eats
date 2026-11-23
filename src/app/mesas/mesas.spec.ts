import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { OcupacaoMesa, VendaResumo, VendaService } from '../vendas/venda.service';
import { MesaService } from './mesa.service';
import { Mesas } from './mesas';

const MESAS: OcupacaoMesa[] = [
  { mesaId: 1, numero: 1, ocupada: true, vendaId: 10, nomeCliente: 'Ana', quantidadeComandas: 2, valorParcial: 77.7 },
  { mesaId: 2, numero: 2, ocupada: false, vendaId: null, nomeCliente: null, quantidadeComandas: 0, valorParcial: 0 },
  { mesaId: 3, numero: 3, ocupada: false, vendaId: null, nomeCliente: null, quantidadeComandas: 0, valorParcial: 0 },
];

const ABERTAS: VendaResumo[] = [
  {
    id: 10, tipo: 'MESA', mesaId: 1, numeroMesa: 1, status: 'ABERTA', nomeCliente: 'Ana', usuarioAbertura: 'func',
    dataAbertura: '2026-03-10T12:00:00', usuarioFechamento: null, dataFechamento: null, valorTotal: 77.7,
  },
  {
    id: 11, tipo: 'RETIRADA', mesaId: null, numeroMesa: null, status: 'ABERTA', nomeCliente: 'Maria', usuarioAbertura: 'func',
    dataAbertura: '2026-03-10T12:30:00', usuarioFechamento: null, dataFechamento: null, valorTotal: 25.9,
  },
];

describe('Mesas', () => {
  let fixture: ComponentFixture<Mesas>;
  let component: Mesas;
  let vendaService: { ocupacaoMesas: ReturnType<typeof vi.fn>; abertas: ReturnType<typeof vi.fn> };
  let mesaService: { criar: ReturnType<typeof vi.fn>; atualizar: ReturnType<typeof vi.fn>; excluir: ReturnType<typeof vi.fn> };

  async function criar(gestao = true) {
    vendaService = {
      ocupacaoMesas: vi.fn().mockReturnValue(of(MESAS)),
      abertas: vi.fn().mockReturnValue(of(ABERTAS)),
    };
    mesaService = {
      criar: vi.fn().mockReturnValue(of({})),
      atualizar: vi.fn().mockReturnValue(of({})),
      excluir: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [Mesas],
      providers: [
        provideRouter([]),
        { provide: VendaService, useValue: vendaService },
        { provide: MesaService, useValue: mesaService },
        { provide: AuthService, useValue: { temPerfil: () => gestao } },
      ],
    });
    fixture = TestBed.createComponent(Mesas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('mostra a ocupação vinda do backend e a contagem de mesas livres e ocupadas', async () => {
    await criar();

    expect(component.totalOcupadas()).toBe(1);
    expect(component.totalLivres()).toBe(2);
    expect(texto()).toContain('Ocupada');
    expect(texto()).toContain('2 comanda(s)');
    expect(texto()).toContain('Ana');
  });

  it('só a mesa ocupada tem o atalho para a conta', async () => {
    await criar();

    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('a[href="/conta/10"]');
    expect(links.length).toBe(1);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('a[href^="/conta/"]').length).toBe(2); // mesa + retirada
  });

  it('lista as retiradas em aberto, sem misturar as vendas de mesa', async () => {
    await criar();

    expect(component.retiradas().map((r) => r.nomeCliente)).toEqual(['Maria']);
    expect(texto()).toContain('Retiradas em aberto');
    expect(texto()).toContain('Maria');
  });

  it('sem retiradas abertas o painel não aparece', async () => {
    vendaService = { ocupacaoMesas: vi.fn().mockReturnValue(of(MESAS)), abertas: vi.fn().mockReturnValue(of([ABERTAS[0]])) };
    TestBed.configureTestingModule({
      imports: [Mesas],
      providers: [
        provideRouter([]),
        { provide: VendaService, useValue: vendaService },
        { provide: MesaService, useValue: {} },
        { provide: AuthService, useValue: { temPerfil: () => false } },
      ],
    });
    fixture = TestBed.createComponent(Mesas);
    await fixture.whenStable();

    expect(((fixture.nativeElement as HTMLElement).textContent ?? '')).not.toContain('Retiradas em aberto');
  });

  it('mesa com conta aberta não pode ser excluída', async () => {
    await criar();

    component.excluir(MESAS[0]);

    expect(mesaService.excluir).not.toHaveBeenCalled();
    expect(component.erro()).toContain('conta aberta');
  });

  it('mesa livre é excluída depois da confirmação e a lista é recarregada', async () => {
    await criar();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.excluir(MESAS[1]);

    expect(mesaService.excluir).toHaveBeenCalledWith(2);
    expect(vendaService.ocupacaoMesas).toHaveBeenCalledTimes(2);
  });

  it('número de mesa inválido não chama a API', async () => {
    await criar();
    component.numero = 0;

    component.salvar();

    expect(mesaService.criar).not.toHaveBeenCalled();
    expect(component.erro()).toContain('maior que zero');
  });

  it('cadastra e edita mesas pelo id vindo da ocupação', async () => {
    await criar();
    component.numero = 9;
    component.salvar();
    expect(mesaService.criar).toHaveBeenCalledWith(9);

    component.editar(MESAS[2]);
    component.numero = 30;
    component.salvar();
    expect(mesaService.atualizar).toHaveBeenCalledWith(3, 30);
  });

  it('novo pedido leva a mesa e nova retirada abre o atendimento de retirada', async () => {
    await criar();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.novoPedido(MESAS[1]);
    component.novaRetirada();

    expect(navegar).toHaveBeenNthCalledWith(1, ['/novo-pedido'], { queryParams: { mesa: 2 } });
    expect(navegar).toHaveBeenNthCalledWith(2, ['/novo-pedido'], { queryParams: { tipo: 'retirada' } });
  });

  it('erro ao carregar mostra a mensagem e sai do carregamento', async () => {
    vendaService = { ocupacaoMesas: vi.fn().mockReturnValue(throwError(() => new Error('falhou'))), abertas: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      imports: [Mesas],
      providers: [
        provideRouter([]),
        { provide: VendaService, useValue: vendaService },
        { provide: MesaService, useValue: {} },
        { provide: AuthService, useValue: { temPerfil: () => false } },
      ],
    });
    fixture = TestBed.createComponent(Mesas);
    component = fixture.componentInstance;
    await fixture.whenStable();

    expect(component.erro()).toBe('Não foi possível carregar as mesas.');
    expect(component.carregando()).toBe(false);
  });
});
