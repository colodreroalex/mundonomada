import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  anio = new Date().getFullYear();
  // En escritorio las columnas se muestran abiertas; en móvil son acordeones
  escritorio = window.innerWidth >= 768;

  @HostListener('window:resize')
  alRedimensionar(): void {
    this.escritorio = window.innerWidth >= 768;
  }
}
