import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { Ingredientes } from './ingredientes';
import { providersTeste } from '../testing/providers-teste';
import { Estoque } from '../controle-estoque/estoque.service';

const QUEIJO: Estoque = {
  id: 1,
  produto: { id: 10, nome: 'Queijo', preco: 0.8, custo: 0.8, natureza: 'INSUMO', unidadeMedida: 'UN', categoria: null },
  quantidadeAtual: 120,
  estoqueMinimo: 30,
  dtUltimaMovimentacao: null,
};

describe('Ingredientes', () => {
  let component: Ingredientes;
  let fixture: ComponentFixture<Ingredientes>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingredientes],
      providers: [providersTeste],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingredientes);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/estoque/ingredientes')).flush([QUEIJO]);
  });

  it('lista nome, unidade e quantidade em estoque', () => {
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Queijo');
    expect(texto).toContain('un');
    expect(texto).toContain('120');
  });

  it('exige nome e unidade de medida', () => {
    expect(component.form.valid).toBe(false);
    component.form.patchValue({ nome: 'Pão', unidadeMedida: 'UN' });
    expect(component.form.valid).toBe(true);
  });

  it('ao editar, envia PUT e bloqueia o saldo (que só muda por movimentação)', () => {
    component.editar(QUEIJO);
    expect(component.form.controls.quantidadeAtual.disabled).toBe(true);

    component.form.patchValue({ nome: 'Queijo Cheddar', estoqueMinimo: 40 });
    component.salvar();

    const req = http.expectOne((r) => r.url.endsWith('/estoque/ingredientes/10'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.nome).toBe('Queijo Cheddar');
    expect(req.request.body.estoqueMinimo).toBe(40);
    req.flush({ ...QUEIJO, estoqueMinimo: 40, produto: { ...QUEIJO.produto, nome: 'Queijo Cheddar' } });

    expect(component.ingredientes[0].produto.nome).toBe('Queijo Cheddar');
    expect(component.editandoId).toBeNull();
  });
});
