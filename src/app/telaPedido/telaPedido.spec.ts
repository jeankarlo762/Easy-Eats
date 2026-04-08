import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TelaPedido } from './telaPedido'; 

describe('TelaPedidoComponent', () => {
  let component: TelaPedido;
  let fixture: ComponentFixture<TelaPedido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelaPedido]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TelaPedido);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve filtrar produtos por categoria', () => {
    component.categoriaSelecionada = 'Bebidas';
    const produtosFiltrados = component.produtosFiltrados;
    const todosSaoBebidas = produtosFiltrados.every(p => p.categoria === 'Bebidas');
    expect(todosSaoBebidas).toBe(true);
  });

  it('deve adicionar um produto ao carrinho', () => {
    const produto = component.produtos[0];
    component.adicionarAoCarrinho(produto);
    expect(component.carrinho.length).toBe(1);
    expect(component.carrinho[0].quantidade).toBe(1);
  });

  it('deve incrementar quantidade se o produto já estiver no carrinho', () => {
    const produto = component.produtos[0];
    component.adicionarAoCarrinho(produto);
    component.adicionarAoCarrinho(produto);
    expect(component.carrinho[0].quantidade).toBe(2);
  });

  it('deve calcular o total do pedido corretamente', () => {
    component.adicionarAoCarrinho(component.produtos[0]); 
    component.adicionarAoCarrinho(component.produtos[7]); 
    expect(component.totalPedido).toBe(29.00);
  });

  it('deve remover produto do carrinho ou diminuir quantidade', () => {
    const produto = component.produtos[0];
    component.adicionarAoCarrinho(produto);
    component.adicionarAoCarrinho(produto);
    
    component.removerDoCarrinho(0);
    expect(component.carrinho[0].quantidade).toBe(1);
    
    component.removerDoCarrinho(0);
    expect(component.carrinho.length).toBe(0);
  });
});