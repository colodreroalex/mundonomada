import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../../models/Users';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../services/categorias.service';
import { Categoria } from '../../../models/Categoria';
import { CarritoService } from '../../services/carrito.service';
import { TemaService } from '../../services/tema.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  // Propiedad para almacenar las categorías obtenidas de la base de datos
  categorias: Categoria[] = [];
  // Contador de productos en el carrito
  cantidadProductosCarrito: number = 0;
  contadorAnimado = false;

  // Estado visual de la cabecera y los menús
  panelAbierto = false;
  catalogoPanelAbierto = true;
  catalogoEscritorioAbierto = false;
  usuarioEscritorioAbierto = false;
  conScroll = false;

  @ViewChild('botonMenu') botonMenu?: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  private intervaloCarrito?: ReturnType<typeof setInterval>;
  private subscripciones: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private categoriasService: CategoriasService,
    private carritoService: CarritoService,
    private elementRef: ElementRef<HTMLElement>,
    public temaService: TemaService
  ) {
    // Suscribirse al observable para actualizar el estado del usuario
    this.subscripciones.push(
      this.authService.getCurrentUserObservable().subscribe((user) => {
        this.currentUser = user;
        // Actualizar el contador del carrito cuando cambia el usuario
        this.actualizarContadorCarrito();
      })
    );
  }

  ngOnInit(): void {
    this.getCategorias();
    this.actualizarContadorCarrito();

    // El contador se actualiza cuando el carrito cambia, no consultando sin parar
    this.subscripciones.push(
      this.carritoService.cambios$.subscribe(() => this.actualizarContadorCarrito())
    );

    // Red de seguridad (otra pestaña, pago confirmado por Stripe): una consulta
    // por minuto y solo si la pestaña está visible
    this.intervaloCarrito = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.actualizarContadorCarrito();
      }
    }, 60000);

    // Cualquier navegación cierra los menús abiertos y refresca el contador
    this.subscripciones.push(
      this.router.events
        .pipe(filter((evento) => evento instanceof NavigationEnd))
        .subscribe(() => {
          this.cerrarTodo(false);
          this.actualizarContadorCarrito();
        })
    );
  }

  @HostListener('document:visibilitychange')
  alVolverALaPestana(): void {
    if (document.visibilityState === 'visible') {
      this.actualizarContadorCarrito();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.intervaloCarrito);
    this.subscripciones.forEach((s) => s.unsubscribe());
    document.body.classList.remove('sin-scroll');
  }

  // Método para obtener las categorías desde el servicio
  getCategorias(): void {
    this.categoriasService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
      },
      error: (err) => {
        console.error('Error al obtener las categorías', err);
      },
    });
  }

  // Método para actualizar el contador de productos en el carrito
  actualizarContadorCarrito(): void {
    const userId = this.currentUser ? this.currentUser.id : 0;
    this.carritoService.getCart(userId).subscribe({
      next: (carrito) => {
        // Calcular la cantidad total de productos (suma de cantidades)
        const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
        if (cantidad !== this.cantidadProductosCarrito) {
          this.animarContador();
        }
        this.cantidadProductosCarrito = cantidad;
      },
      error: (err) => {
        console.error('Error al obtener productos del carrito', err);
      },
    });
  }

  private animarContador(): void {
    this.contadorAnimado = false;
    setTimeout(() => (this.contadorAnimado = true));
    setTimeout(() => (this.contadorAnimado = false), 450);
  }

  // ---------- Panel lateral (móvil y tablet) ----------
  abrirPanel(): void {
    this.panelAbierto = true;
    document.body.classList.add('sin-scroll');
    setTimeout(() => this.panel?.nativeElement.querySelector<HTMLElement>('.panel-cerrar')?.focus(), 50);
  }

  cerrarPanel(devolverFoco = true): void {
    if (!this.panelAbierto) {
      return;
    }
    this.panelAbierto = false;
    document.body.classList.remove('sin-scroll');
    if (devolverFoco) {
      this.botonMenu?.nativeElement.focus();
    }
  }

  // ---------- Menús de escritorio ----------
  toggleCatalogoEscritorio(): void {
    this.catalogoEscritorioAbierto = !this.catalogoEscritorioAbierto;
    this.usuarioEscritorioAbierto = false;
  }

  toggleUsuarioEscritorio(): void {
    this.usuarioEscritorioAbierto = !this.usuarioEscritorioAbierto;
    this.catalogoEscritorioAbierto = false;
  }

  private cerrarTodo(devolverFoco: boolean): void {
    this.catalogoEscritorioAbierto = false;
    this.usuarioEscritorioAbierto = false;
    this.cerrarPanel(devolverFoco);
  }

  @HostListener('document:keydown.escape')
  alPulsarEscape(): void {
    this.cerrarTodo(true);
  }

  @HostListener('document:click', ['$event'])
  alHacerClick(evento: MouseEvent): void {
    const objetivo = evento.target as Node;
    const desplegables = this.elementRef.nativeElement.querySelectorAll('.desplegable');
    if (![...desplegables].some((d) => d.contains(objetivo))) {
      this.catalogoEscritorioAbierto = false;
      this.usuarioEscritorioAbierto = false;
    }
  }

  @HostListener('window:scroll')
  alHacerScroll(): void {
    this.conScroll = window.scrollY > 8;
  }

  @HostListener('window:resize')
  alRedimensionar(): void {
    if (window.innerWidth >= 992) {
      this.cerrarPanel(false);
    }
  }

  // Mantiene el foco dentro del panel mientras está abierto
  atraparFoco(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab' || !this.panel) {
      return;
    }
    const enfocables = this.panel.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (enfocables.length === 0) {
      return;
    }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      ultimo.focus();
      evento.preventDefault();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      primero.focus();
      evento.preventDefault();
    }
  }

  // La API PostgreSQL devuelve "nombre" en minúscula; el modelo espera "Nombre"
  nombreCategoria(categoria: Categoria): string {
    return categoria.Nombre ?? (categoria as unknown as { nombre?: string }).nombre ?? '';
  }

  descripcionCategoria(categoria: Categoria): string {
    return categoria.Descripcion ?? (categoria as unknown as { descripcion?: string }).descripcion ?? '';
  }

  inicial(nombre: string): string {
    return (nombre || '?').trim().charAt(0).toUpperCase();
  }

  logout(): void {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.logout().subscribe({
        next: () => {
          // Redirigir al usuario a la página de login tras cerrar sesión
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Error al cerrar sesión', error);
        },
      });
    }
  }
}
