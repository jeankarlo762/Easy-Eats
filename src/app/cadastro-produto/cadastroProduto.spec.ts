import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroProdutoComponent } from './cadastroProduto';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersTeste } from '../testing/providers-teste';
import { Produto } from './produto.service';

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

  it('ao editar um produto PREPARADO, recupera e regrava a ficha técnica', () => {
    const http = TestBed.inject(HttpTestingController);
    const produto: Produto = {
      id: 7,
      nome: 'X-Burger',
      descricao: null,
      preco: 25,
      custo: null,
      flAtivo: true,
      natureza: 'PREPARADO',
      categoria: { id: 1, nome: 'Lanches' },
    };

    component.editar(produto);
    http
      .expectOne((r) => r.url.endsWith('/produtos/7/ficha-tecnica') && r.method === 'GET')
      .flush([{ id: 1, produtoId: 7, ingredienteId: 3, quantidadeUtilizada: 2 }]);

    expect(component.fichaTecnica).toEqual([{ ingredienteId: 3, quantidadeUtilizada: 2 }]);

    component.fichaTecnica[0].quantidadeUtilizada = 3;
    component.salvar();

    http.expectOne((r) => r.url.endsWith('/produtos/7') && r.method === 'PUT').flush(produto);
    const ficha = http.expectOne((r) => r.url.endsWith('/produtos/7/ficha-tecnica') && r.method === 'PUT');
    expect(ficha.request.body).toEqual([{ ingredienteId: 3, quantidadeUtilizada: 3 }]);
    ficha.flush([]);

    expect(component.editandoId).toBeNull();
  });

  it('não envia ficha técnica com ingrediente repetido', () => {
    component.form.setValue({
      nome: 'X-Salada',
      descricao: '',
      categoriaId: 1,
      natureza: 'PREPARADO',
      preco: 25,
      custo: null,
      flAtivo: true,
    });
    component.fichaTecnica = [
      { ingredienteId: 3, quantidadeUtilizada: 1 },
      { ingredienteId: 3, quantidadeUtilizada: 2 },
    ];

    component.salvar();

    expect(component.erro).toContain('mais de uma vez');
    expect(component.enviando).toBe(false);
  });
});
