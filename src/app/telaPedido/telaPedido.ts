import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Produto {
  id: number;
  nome: string;
  preco: number;
  categoria: string;
  icone: string;
  quantidade?: number;
}

@Component({
  selector: 'app-tela-pedido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './telaPedido.html',
  styleUrl: './telaPedido.scss'
})
export class TelaPedido {
  categorias = ['Todos', 'Lanches', 'Acompanhamentos', 'Bebidas'];
  categoriaSelecionada = 'Todos';

  produtos: Produto[] = [
    { id: 1, nome: 'Hambúrguer Clássico', preco: 22.00, categoria: 'Lanches', icone: '🍔' },
    { id: 2, nome: 'X-Bacon', preco: 28.00, categoria: 'Lanches', icone: '🥓' },
    { id: 3, nome: 'X-Salada', preco: 25.00, categoria: 'Lanches', icone: '🥗' },
    { id: 4, nome: 'Hot Dog', preco: 15.00, categoria: 'Lanches', icone: '🌭' },
    { id: 5, nome: 'Batata Frita', preco: 12.00, categoria: 'Acompanhamentos', icone: '🍟' },
    { id: 6, nome: 'Onion Rings', preco: 14.00, categoria: 'Acompanhamentos', icone: '🧅' },
    { id: 7, nome: 'Nuggets', preco: 16.00, categoria: 'Acompanhamentos', icone: '🍗' },
    { id: 8, nome: 'Coca-Cola', preco: 7.00, categoria: 'Bebidas', icone: '🥤' },
    { id: 9, nome: 'Guaraná', preco: 7.00, categoria: 'Bebidas', icone: '🧃' },
    { id: 10, nome: 'Água', preco: 4.00, categoria: 'Bebidas', icone: '💧' },
    { id: 11, nome: 'Suco Natural', preco: 10.00, categoria: 'Bebidas', icone: '🍊' },
    { id: 12, nome: 'Milk Shake', preco: 18.00, categoria: 'Bebidas', icone: '🥛' },
  ];

  carrinho: Produto[] = [];

  get produtosFiltrados() {
    if (this.categoriaSelecionada === 'Todos') return this.produtos;
    return this.produtos.filter(p => p.categoria === this.categoriaSelecionada);
  }

  adicionarAoCarrinho(produto: Produto) {
    const item = this.carrinho.find(p => p.id === produto.id);
    if (item) {
      item.quantidade!++;
    } else {
      this.carrinho.push({ ...produto, quantidade: 1 });
    }
  }

  removerDoCarrinho(index: number) {
    if (this.carrinho[index].quantidade! > 1) {
      this.carrinho[index].quantidade!--;
    } else {
      this.carrinho.splice(index, 1);
    }
  }

  get totalPedido() {
    return this.carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade!), 0);
  }

  get totalItens() {
    return this.carrinho.reduce((acc, item) => acc + item.quantidade!, 0);
  }

  getQuantidadeNoCarrinho(id: number): number {
    return this.carrinho.find(p => p.id === id)?.quantidade || 0;
  }
}