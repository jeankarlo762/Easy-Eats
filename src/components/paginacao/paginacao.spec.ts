import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginacaoComponent } from './paginacao';

describe('PaginacaoComponent', () => {
  let fixture: ComponentFixture<PaginacaoComponent>;
  let emitidas: number[];

  async function criar(pagina: number, totalPaginas: number, total: number) {
    TestBed.configureTestingModule({ imports: [PaginacaoComponent] });
    fixture = TestBed.createComponent(PaginacaoComponent);
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('totalPaginas', totalPaginas);
    fixture.componentRef.setInput('total', total);
    emitidas = [];
    fixture.componentInstance.paginaChange.subscribe((p) => emitidas.push(p));
    await fixture.whenStable();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botao = (rotulo: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes(rotulo));

  it('mostra a página (começando em 1) e o total de registros', async () => {
    await criar(1, 4, 62);

    expect(texto()).toContain('Página 2 de 4');
    expect(texto()).toContain('62 registro(s)');
  });

  it('não renderiza nada quando não há registros', async () => {
    await criar(0, 0, 0);

    expect(texto().trim()).toBe('');
  });

  it('com uma única página não mostra os botões', async () => {
    await criar(0, 1, 5);

    expect(botao('Anterior')).toBeUndefined();
    expect(botao('Próxima')).toBeUndefined();
  });

  it('emite a página anterior e a próxima', async () => {
    await criar(1, 3, 40);

    (botao('Anterior') as HTMLButtonElement).click();
    (botao('Próxima') as HTMLButtonElement).click();

    expect(emitidas).toEqual([0, 2]);
  });

  it('na primeira página o botão Anterior fica desabilitado e na última o Próxima', async () => {
    await criar(0, 2, 30);
    expect((botao('Anterior') as HTMLButtonElement).disabled).toBe(true);
    expect((botao('Próxima') as HTMLButtonElement).disabled).toBe(false);

    TestBed.resetTestingModule();
    await criar(1, 2, 30);
    expect((botao('Próxima') as HTMLButtonElement).disabled).toBe(true);
  });
});
