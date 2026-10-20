import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from "./componentes/menu/menu.component";
import { FooterComponent } from "./componentes/footer/footer.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  demoMode = window.__MUNDO_NOMADA_CONFIG__?.demoMode === true;
  title = 'mundo-nomada';

  // Enlace de accesibilidad: lleva el foco al contenido principal sin pasar por el menú
  saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    document.getElementById('contenido')?.focus();
  }
}
