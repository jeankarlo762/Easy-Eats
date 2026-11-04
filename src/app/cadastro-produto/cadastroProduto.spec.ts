import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { CadastroProdutoComponent } from './cadastroProduto';
import { providersTeste } from '../testing/providers-teste';

describe('CadastroProdutoComponent', () => {
  let component: CadastroProdutoComponent;
  let fixture: ComponentFixture<CadastroProdutoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroProdutoComponent],
      providers: [providersTeste],
    }).compileComponents();

    fixture = TestBed.createComponent(CadastroProdutoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('na sub-aba Produtos não oferece a natureza Insumo', () => {
    expect(component.ehInsumo).toBe(false);
    expect(component.naturezas.map((n) => n.valor)).not.toContain('INSUMO');
  });

  it('exige nome, categoria, natureza e preço antes de enviar', () => {
    expect(component.form.valid).toBe(false);

    component.form.setValue({
      nome: 'X-Salada',
      descricao: '',
      categoriaId: 1,
      natureza: 'PREPARADO',
      preco: 25,
      custo: null,
      flAtivo: true,
    });

    expect(component.form.valid).toBe(true);
  });
});

describe('CadastroProdutoComponent (sub-aba Insumos)', () => {
  it('fixa a natureza em INSUMO e só oferece essa opção', async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroProdutoComponent],
      providers: [
        providersTeste,
        { provide: ActivatedRoute, useValue: { snapshot: { data: { tipoCadastro: 'INSUMO' } } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CadastroProdutoComponent);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    expect(component.ehInsumo).toBe(true);
    expect(component.naturezas.map((n) => n.valor)).toEqual(['INSUMO']);
    expect(component.form.controls.natureza.value).toBe('INSUMO');
  });
});
