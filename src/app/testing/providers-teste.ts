import { Provider, EnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

/**
 * Providers mínimos que os testes de componente precisam.
 *
 * Os specs gerados pelo CLI declaravam só `imports: [Componente]`. Como quase
 * todas as telas injetam HttpClient (direta ou indiretamente, via AuthService)
 * e/ou Router/ActivatedRoute, o TestBed estourava NullInjectorError assim que o
 * componente era criado. `provideHttpClientTesting` ainda garante que nenhuma
 * requisição real saia durante o ngOnInit.
 */
export const providersTeste: (Provider | EnvironmentProviders)[] = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
];
