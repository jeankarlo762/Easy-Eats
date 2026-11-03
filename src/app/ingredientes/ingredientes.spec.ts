import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ingredientes } from './ingredientes';
import { providersTeste } from '../testing/providers-teste';

describe('Ingredientes', () => {
  let component: Ingredientes;
  let fixture: ComponentFixture<Ingredientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingredientes],
      providers: [providersTeste],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingredientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exige nome, unidade de medida e quantidades não negativas', () => {
    expect(component.form.valid).toBe(false);

    component.form.setValue({
      nome: 'Queijo cheddar',
      unidadeMedida: 'KG',
      custo: 39.9,
      categoriaId: null,
      quantidadeEstoque: -1,
      estoqueMinimo: 0,
    });
    expect(component.form.valid).toBe(false);

    component.form.controls.quantidadeEstoque.setValue(5);
    expect(component.form.valid).toBe(true);
  });
});
