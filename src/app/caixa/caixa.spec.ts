import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Caixa, CaixaService, Pagina, MovimentacaoCaixa } from './caixa.service';
import { CaixaComponent } from './caixa';

const CAIXA_ABERTO: Caixa = {
  id: 5,
  status: 'ABERTO',
  fundoCaixa: 100,
  usuarioAbertura: 'ana',
  dataAbertura: '2026-03-10T09:00:00',
  observacaoAbertura: null,
  usuarioFechamento: null,
  dataFechamento: null,
  valorEsperado: null,
  valorContado: null,
  diferenca: null,
  observacaoFechamento: null,
  saldoAtual: 100,
};

const CAIXA_FECHADO: Caixa = {
  ...CAIXA_ABERTO,
  status: 'FECHADO',
  usuarioFechamento: 'gerente',
  dataFechamento: '2026-03-10T17:00:00',
  valorEsperado: 100,
  valorContado: 95,
  diferenca: -5,
  observacaoFechamento: 'Falta no troco',
};

const PAGINA_VAZIA: Pagina<MovimentacaoCaixa> = { itens: [], total: 0, pagina: 0, tamanho: 100, totalPaginas: 0 };

describe('CaixaComponent', () => {
  let fixture: ComponentFixture<CaixaComponent>;
  let component: CaixaComponent;
  let caixaService: {
    atual: ReturnType<typeof vi.fn>;
    abrir: ReturnType<typeof vi.fn>;
    lancar: ReturnType<typeof vi.fn>;
    fechar: ReturnType<typeof vi.fn>;
    listarMovimentacoes: ReturnType<typeof vi.fn>;
  };

  async function criar(opcoes: { gestao: boolean; atual: Caixa | null }) {
    caixaService = {
      atual: vi.fn().mockReturnValue(of(opcoes.atual)),
      abrir: vi.fn().mockReturnValue(of(CAIXA_ABERTO)),
      lancar: vi.fn().mockReturnValue(of({})),
      fechar: vi.fn().mockReturnValue(of(CAIXA_FECHADO)),
      listarMovimentacoes: vi.fn().mockReturnValue(of(PAGINA_VAZIA)),
    };
    TestBed.configureTestingModule({
      imports: [CaixaComponent],
      providers: [
        provideRouter([]),
        { provide: CaixaService, useValue: caixaService },
        { provide: AuthService, useValue: { temPerfil: () => opcoes.gestao } },
      ],
    });
    fixture = TestBed.createComponent(CaixaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botoes = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

  it('sem caixa aberto: oferece a abertura e não mostra fechar nem sangria', async () => {
    await criar({ gestao: true, atual: null });

    expect(texto()).toContain('Nenhum caixa aberto');
    expect(botoes().some((t) => t.includes('Fechar caixa'))).toBe(false);
    expect(botoes().some((t) => t.includes('Sangria'))).toBe(false);
  });

  it('abrir() envia o fundo e a observação e passa a mostrar o caixa aberto', async () => {
    await criar({ gestao: true, atual: null });
    component.formAbertura.setValue({ fundoCaixa: 100, observacao: ' Turno da manhã ' });

    component.abrir();
    await fixture.whenStable();

    expect(caixaService.abrir).toHaveBeenCalledWith(100, 'Turno da manhã');
    expect(component.caixa()?.id).toBe(5);
    expect(texto()).toContain('Fundo de caixa');
  });

  it('abrir() não chama a API com fundo vazio ou negativo', async () => {
    await criar({ gestao: true, atual: null });

    component.formAbertura.setValue({ fundoCaixa: null, observacao: '' });
    component.abrir();
    component.formAbertura.setValue({ fundoCaixa: -1, observacao: '' });
    component.abrir();

    expect(caixaService.abrir).not.toHaveBeenCalled();
  });

  it('gestão com caixa aberto: vê sangria e fechar, e a lista de lançamentos do turno é buscada', async () => {
    await criar({ gestao: true, atual: CAIXA_ABERTO });

    expect(botoes().some((t) => t.includes('Sangria'))).toBe(true);
    expect(botoes().some((t) => t.includes('Fechar caixa'))).toBe(true);
    expect(caixaService.listarMovimentacoes).toHaveBeenCalledWith({ caixaId: 5 }, 0, 100);
  });

  it('funcionário com caixa aberto: só suprimento, sem sangria, fechar nem consulta de lançamentos', async () => {
    await criar({ gestao: false, atual: CAIXA_ABERTO });

    expect(botoes().some((t) => t.includes('Suprimento'))).toBe(true);
    expect(botoes().some((t) => t.includes('Sangria'))).toBe(false);
    expect(botoes().some((t) => t.includes('Fechar caixa'))).toBe(false);
    expect(caixaService.listarMovimentacoes).not.toHaveBeenCalled();
    expect(texto()).toContain('Administrador ou Gerente');
  });

  it('sangria exige motivo: sem descrição não chama a API', async () => {
    await criar({ gestao: true, atual: CAIXA_ABERTO });
    component.abrirMovimento('SANGRIA');

    component.formMovimento.setValue({ valor: 20, descricao: '' });
    component.confirmarMovimento();
    expect(caixaService.lancar).not.toHaveBeenCalled();

    component.formMovimento.setValue({ valor: 20, descricao: 'Pagamento de fornecedor' });
    component.confirmarMovimento();
    expect(caixaService.lancar).toHaveBeenCalledWith(5, 'SANGRIA', 20, 'Pagamento de fornecedor');
  });

  it('suprimento aceita descrição vazia e envia null', async () => {
    await criar({ gestao: false, atual: CAIXA_ABERTO });
    component.abrirMovimento('SUPRIMENTO');

    component.formMovimento.setValue({ valor: 15.5, descricao: '' });
    component.confirmarMovimento();

    expect(caixaService.lancar).toHaveBeenCalledWith(5, 'SUPRIMENTO', 15.5, null);
    expect(component.modalMovimento()).toBeNull();
  });

  it('erro da API no lançamento fica no modal, que continua aberto', async () => {
    await criar({ gestao: true, atual: CAIXA_ABERTO });
    caixaService.lancar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { erro: 'Saldo insuficiente para a sangria' } })),
    );
    component.abrirMovimento('SANGRIA');
    component.formMovimento.setValue({ valor: 999, descricao: 'Cofre' });

    component.confirmarMovimento();

    expect(component.erroModal()).toBe('Saldo insuficiente para a sangria');
    expect(component.modalMovimento()).toBe('SANGRIA');
    expect(component.processando()).toBe(false);
  });

  it('fechamento com diferença sem justificativa mostra a mensagem da API e mantém o caixa aberto', async () => {
    await criar({ gestao: true, atual: CAIXA_ABERTO });
    caixaService.fechar.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 422, error: { erro: 'Informe a justificativa da diferença de R$ -5.00 no fechamento' } }),
      ),
    );
    component.abrirFechamento();
    component.formFechamento.setValue({ valorContado: 95, observacao: '' });

    component.confirmarFechamento();

    expect(caixaService.fechar).toHaveBeenCalledWith(5, 95, null);
    expect(component.erroModal()).toContain('justificativa da diferença');
    expect(component.modalFechamento()).toBe(true);
    expect(component.caixa()).not.toBeNull();
  });

  it('fechamento bem-sucedido mostra o resumo do caixa fechado e libera nova abertura', async () => {
    await criar({ gestao: true, atual: CAIXA_ABERTO });
    component.abrirFechamento();
    component.formFechamento.setValue({ valorContado: 95, observacao: 'Falta no troco' });

    component.confirmarFechamento();
    await fixture.whenStable();

    expect(caixaService.fechar).toHaveBeenCalledWith(5, 95, 'Falta no troco');
    expect(component.caixa()).toBeNull();
    expect(component.fechado()?.diferenca).toBe(-5);
    expect(texto()).toContain('Caixa #5 fechado');
    expect(texto()).toContain('Falta');
    expect(texto()).toContain('Abrir caixa');
  });

  it('rótulo e cor da diferença: zero é ok, positiva é sobra, negativa é falta', async () => {
    await criar({ gestao: true, atual: null });

    expect(component.rotuloDiferenca(0)).toBe('Sem diferença');
    expect(component.rotuloDiferenca(3)).toBe('Sobra');
    expect(component.rotuloDiferenca(-3)).toBe('Falta');
    expect(component.classeDiferenca(0)).toBe('sucesso');
    expect(component.classeDiferenca(3)).toBe('aviso');
    expect(component.classeDiferenca(-3)).toBe('erro');
  });
});
