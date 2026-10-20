import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';

// Precios y fechas con formato español (24,90 €)
registerLocaleData(localeEs);

export const appConfig : ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // Cada página nueva empieza arriba y la transición entre páginas es suave
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({
        skipInitialTransition: true,
        // El navegador cancela la transición si cambia el tamaño de la pantalla
        // (barra de direcciones del móvil, giro): no es un error de la página
        onViewTransitionCreated: ({ transition }) => {
          transition.ready.catch(() => {});
          transition.finished.catch(() => {});
        }
      })
    ),
    provideHttpClient(withFetch()),
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};
