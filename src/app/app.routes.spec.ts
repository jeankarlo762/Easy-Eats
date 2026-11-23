import { Route } from '@angular/router';
import { routes } from './app.routes';

function caminhos(lista: Route[], prefixo = ''): Map<string, Route> {
  const mapa = new Map<string, Route>();
  for (const rota of lista) {
    const caminho = [prefixo, rota.path ?? ''].filter(Boolean).join('/');
    if (rota.path) mapa.set(caminho, rota);
    if (rota.children) caminhos(rota.children, caminho).forEach((r, c) => mapa.set(c, r));
  }
  return mapa;
}

describe('app.routes', () => {
  const todas = caminhos(routes);

  // Destinos usados em routerLink/navigate pelas telas de venda e caixa.
  const destinosUsados = [
    'mesas',
    'novo-pedido',
    'conta/:id',
    'caixa',
    'caixa-historico',
    'caixa-relatorio/:id',
    'financeiro',
  ];

  it.each(destinosUsados)('registra a rota %s', (destino) => {
    expect(todas.has(destino)).toBe(true);
  });
});
