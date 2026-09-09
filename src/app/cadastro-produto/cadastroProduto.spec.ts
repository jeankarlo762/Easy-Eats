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
});
