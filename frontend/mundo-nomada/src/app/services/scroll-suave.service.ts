import { Injectable, NgZone, inject } from '@angular/core';
import { Router, Scroll } from '@angular/router';
import Lenis from 'lenis';

/** Zonas que se desplazan de forma nativa: la página de fondo está bloqueada mientras se ven. */
const ZONAS_NATIVAS = '.panel-lateral, .panel-fondo, .dialogo, .dialogo-fondo';

/**
 * Desplazamiento suave con inercia (Lenis) para la rueda del ratón y el trackpad.
 *
 * - Solo con la capa de vidrio activa (data-estilo="vidrio"): ?estilo=clasico lo quita.
 * - Solo con ratón o trackpad: en el móvil el desplazamiento nativo ya es suave.
 * - Nunca si el sistema pide reducir el movimiento.
 * - Las zonas con desplazamiento propio (formularios, listas) siguen siendo nativas.
 */
@Injectable({ providedIn: 'root' })
export class ScrollSuaveService {
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private lenis: Lenis | null = null;

  iniciar(): void {
    if (this.lenis || !this.procede()) {
      return;
    }

    // Fuera de Angular: el bucle de animación no debe lanzar la detección de cambios en cada fotograma
    this.lenis = this.zone.runOutsideAngular(
      () =>
        new Lenis({
          autoRaf: true,
          lerp: 0.1,
          allowNestedScroll: true,
          stopInertiaOnNavigate: true,
          prevent: (nodo) => nodo.matches(ZONAS_NATIVAS),
        })
    );

    // Al cambiar de página el router sube arriba (o recupera la posición al volver atrás).
    // Lenis se lleva al mismo destino: si siguiera con la inercia de la página anterior,
    // dejaría la nueva a media altura. Los enlaces a anclas (#) los resuelve el navegador.
    this.router.events.subscribe((evento) => {
      if (evento instanceof Scroll && !evento.anchor) {
        const destino = evento.position ? evento.position[1] : 0;
        queueMicrotask(() => this.lenis?.scrollTo(destino, { force: true }));
      }
    });
  }

  private procede(): boolean {
    return (
      document.documentElement.getAttribute('data-estilo') === 'vidrio' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
