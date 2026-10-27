import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('monta a ficha técnica com ingredientes do estoque sem repetir ingrediente', () => {
    component.ingredientes = [
      { id: 10, nome: 'Pão', unidadeMedida: 'UN', custo: 1.5, categoriaId: null, categoriaNome: null, quantidadeEstoque: 50, estoqueMinimo: 5 },
      { id: 11, nome: 'Queijo', unidadeMedida: 'G', custo: 0.04, categoriaId: null, categoriaNome: null, quantidadeEstoque: 900, estoqueMinimo: 100 },
    ];

    component.novoIngredienteId = 10;
    component.novaQuantidadeUtilizada = 2;
    component.adicionarIngredienteNaFicha();

    component.novoIngredienteId = 11;
    component.novaQuantidadeUtilizada = 50;
    component.adicionarIngredienteNaFicha();

    expect(component.fichaTecnica.map((l) => [l.ingredienteId, l.quantidadeUtilizada])).toEqual([
      [10, 2],
      [11, 50],
    ]);
    expect(component.ingredientesParaAdicionar).toEqual([]);
    expect(component.custoFichaTecnica).toBeCloseTo(5);

    component.removerIngredienteDaFicha(10);
    expect(component.fichaTecnica.map((l) => l.ingredienteId)).toEqual([11]);
    expect(component.ingredientesParaAdicionar.map((i) => i.id)).toEqual([10]);
  });

  it('não adiciona ingrediente sem quantidade utilizada válida', () => {
    component.ingredientes = [
      { id: 10, nome: 'Pão', unidadeMedida: 'UN', custo: 1.5, categoriaId: null, categoriaNome: null, quantidadeEstoque: 50, estoqueMinimo: 5 },
    ];
    component.novoIngredienteId = 10;
    component.novaQuantidadeUtilizada = 0;
    component.adicionarIngredienteNaFicha();

    expect(component.fichaTecnica).toEqual([]);
    expect(component.erroFicha).toBeTruthy();
  });
});
