import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';

// Explícito porque bootstrapApplication, no Angular 21, assume zoneless por
// padrão quando nada é informado — e os componentes deste app atualizam
// estado dentro de callbacks de subscribe() manuais (sem signals nem async
// pipe), que a detecção de mudanças zoneless não observa sozinha. Sem isto,
// telas como Novo Pedido ficam presas no spinner de carregamento mesmo com
// a resposta da API já chegando.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(FormsModule)
  ]
};