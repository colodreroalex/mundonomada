import { Injectable, signal } from '@angular/core';

type Tema = 'light' | 'dark';

/**
 * Tema claro/oscuro. Por defecto sigue al dispositivo; si el visitante pulsa
 * el botón sol/luna, su elección se guarda en este navegador (clave mn-tema).
 * El script de index.html aplica el tema antes de que se pinte la página.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private static readonly CLAVE = 'mn-tema';
  private readonly consulta = window.matchMedia('(prefers-color-scheme: dark)');

  readonly tema = signal<Tema>(this.temaActual());

  constructor() {
    // Con una elección guardada, el color de la barra del navegador debe coincidir
    if (this.leerGuardado()) {
      this.aplicar(this.temaActual());
    }

    // Si no hay elección guardada, seguir los cambios del dispositivo
    this.consulta.addEventListener?.('change', () => {
      if (!this.leerGuardado()) {
        this.aplicar(this.consulta.matches ? 'dark' : 'light');
      }
    });
  }

  alternar(): void {
    const nuevo: Tema = this.tema() === 'dark' ? 'light' : 'dark';
    try {
      // Si coincide con el del dispositivo no hace falta recordarlo
      const delDispositivo: Tema = this.consulta.matches ? 'dark' : 'light';
      if (nuevo === delDispositivo) {
        localStorage.removeItem(TemaService.CLAVE);
      } else {
        localStorage.setItem(TemaService.CLAVE, nuevo);
      }
    } catch {
      // Sin almacenamiento (modo privado): el cambio dura hasta recargar
    }
    this.aplicar(nuevo);
  }

  private aplicar(tema: Tema): void {
    document.documentElement.setAttribute('data-bs-theme', tema);
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) =>
      meta.setAttribute('content', tema === 'dark' ? '#141010' : '#f6f1eb')
    );
    this.tema.set(tema);
  }

  private temaActual(): Tema {
    return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
  }

  private leerGuardado(): string | null {
    try {
      return localStorage.getItem(TemaService.CLAVE);
    } catch {
      return null;
    }
  }
}
