import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from "./componentes/menu/menu.component";
import { FooterComponent } from "./componentes/footer/footer.component";
import { ScrollSuaveService } from './services/scroll-suave.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  demoMode = window.__MUNDO_NOMADA_CONFIG__?.demoMode === true;
  title = 'mundo-nomada';

  constructor() {
    // Desplazamiento suave con ratón y trackpad (solo con el estilo de vidrio)
    inject(ScrollSuaveService).iniciar();
  }

  // Enlace de accesibilidad: lleva el foco al contenido principal sin pasar por el menú
  saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    document.getElementById('contenido')?.focus();
  }
}
