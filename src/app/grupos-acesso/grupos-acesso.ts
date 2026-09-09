import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ITENS_COZINHEIRO, ITENS_GARCOM, ItemMenu, TODOS_ITENS } from '../../components/sidebar/menu-itens';

interface Permissao {
  modulo: string;
  concedida: boolean;
}

function rotasDoItem(item: ItemMenu): string[] {
  if (item.filhos && item.filhos.length) {
    return item.filhos.flatMap((filho) => rotasDoItem(filho));
  }
  return item.rota ? [item.rota] : [];
}

function rotasDaLista(itens: ItemMenu[]): Set<string> {
  return new Set(itens.flatMap((item) => rotasDoItem(item)));
}

/**
 * Deriva a matriz de acesso por perfil direto da navegação real (mesma
 * lista que a Sidebar usa para decidir o que cada perfil vê) — comparando
 * as rotas de cada módulo com as rotas que o perfil enxerga, em vez de
 * manter uma tabela de permissões desconectada do que o sistema realmente
 * aplica.
 */
function construirPermissoes(rotasDoPerfil: Set<string>): Permissao[] {
  return TODOS_ITENS.map((item) => ({
    modulo: item.label,
    concedida: rotasDoItem(item).some((rota) => rotasDoPerfil.has(rota)),
  }));
}

const ROTAS_ADMINISTRADOR = rotasDaLista(TODOS_ITENS.filter((item) => !item.perfis || item.perfis.includes('ADMINISTRADOR')));
const ROTAS_OPERADOR = rotasDaLista(TODOS_ITENS.filter((item) => !item.perfis));
const ROTAS_GARCOM = rotasDaLista(ITENS_GARCOM);
const ROTAS_COZINHEIRO = rotasDaLista(ITENS_COZINHEIRO);

@Component({
  selector: 'app-grupos-acesso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grupos-acesso.html',
  styleUrl: './grupos-acesso.scss',
})
export class GruposAcesso {
  permissoesAdministrador: Permissao[] = construirPermissoes(ROTAS_ADMINISTRADOR);
  permissoesOperador: Permissao[] = construirPermissoes(ROTAS_OPERADOR);
  permissoesGarcom: Permissao[] = construirPermissoes(ROTAS_GARCOM);
  permissoesCozinheiro: Permissao[] = construirPermissoes(ROTAS_COZINHEIRO);
}
