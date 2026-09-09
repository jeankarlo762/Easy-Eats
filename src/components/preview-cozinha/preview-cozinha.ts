import { Component } from '@angular/core';

/**
 * Reprodução estática da Tela da Cozinha, usada como ilustração na landing
 * page. É puramente decorativa (aria-hidden no template de quem usa): não
 * consome a API nem reflete pedidos reais — serve para mostrar o formato do
 * painel a quem ainda não entrou no sistema.
 *
 * Vive separada da landing page porque é um bloco visual autocontido: mantém
 * o componente da landing focado em conteúdo e o CSS de cada um dentro do
 * orçamento por componente definido no angular.json.
 */
@Component({
  selector: 'app-preview-cozinha',
  standalone: true,
  imports: [],
  templateUrl: './preview-cozinha.html',
  styleUrl: './preview-cozinha.scss',
})
export class PreviewCozinha {}
