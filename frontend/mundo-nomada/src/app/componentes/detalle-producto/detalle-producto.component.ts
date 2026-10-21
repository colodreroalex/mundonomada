import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Producto } from '../../../models/Producto';
import { Variante, tallaVisible } from '../../../models/Variante';
import { ProductosService } from '../../services/productos.service';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { Carrito } from '../../../models/Carrito';
import { User } from '../../../models/Users';
import { Location } from '@angular/common';

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detalle-producto.component.html',
  styleUrls: ['./detalle-producto.component.css'],
})
export class DetalleProductoComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  producto: Producto | null = null;
  /** Talla elegida por la clienta (se elige sola si el producto tiene una única talla) */
  tallaElegida: Variante | null = null;
  /** Resalta el selector cuando se intenta comprar sin elegir talla */
  avisoTalla = false;
  currentUser: User | null = null;
  loading: boolean = false;
  anadiendo = false;
  error: string = '';
  // Propiedad para notificaciones: type puede ser 'success', 'warning', 'danger', etc.
  notification: { message: string; type: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private productosService: ProductosService,
    private authService: AuthService,
    private carritoService: CarritoService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cargarProducto(+idParam);
    }

    this.authService.getCurrentUserObservable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => (this.currentUser = user),
      error: (err) => console.error(err),
    });
  }

  cargarProducto(productoID: number): void {
    this.loading = true;
    this.productosService.seleccionarPorID(productoID).subscribe({
      next: (producto: any) => {
        this.ponerProducto(producto ? this.carritoService.productoDesdeApi(producto) : null);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Ocurrió un error al cargar el producto';
        this.loading = false;
      },
    });
  }

  /** Guarda el producto y mantiene la talla elegida con su stock actualizado. */
  private ponerProducto(producto: Producto | null): void {
    this.producto = producto;
    if (!producto) {
      this.tallaElegida = null;
      return;
    }
    const anterior = this.tallaElegida?.id;
    this.tallaElegida = producto.variantes.find((v) => v.id === anterior) ?? null;
    if (!this.tallaElegida && producto.variantes.length === 1) {
      this.tallaElegida = producto.variantes[0];
    }
  }

  /** Solo se muestra el selector cuando hay tallas de verdad (no "Única") */
  get tieneTallas(): boolean {
    return !!this.producto && (this.producto.variantes.length > 1 || tallaVisible(this.producto.variantes[0]?.talla) !== null);
  }

  /** Stock que se muestra: el de la talla elegida o el total del producto */
  get stockVisible(): number {
    return this.tallaElegida ? this.tallaElegida.stock : this.producto?.stock ?? 0;
  }

  elegirTalla(variante: Variante): void {
    if (variante.stock <= 0) return;
    this.tallaElegida = variante;
    this.avisoTalla = false;
  }

  // Método para volver a la página anterior
  goBack(): void {
    this.location.back();
  }

  private avisar(message: string, type: string, duracion = 1800): void {
    this.notification = { message, type };
    setTimeout(() => (this.notification = null), duracion);
  }

  addToCart(): void {
    const producto = this.producto;
    if (!producto) return;

    if (producto.stock <= 0) {
      this.avisar('El producto no tiene stock disponible.', 'warning');
      return;
    }
    if (!this.tallaElegida) {
      this.avisoTalla = true;
      this.avisar('Elige una talla antes de añadirlo al carrito.', 'warning');
      document.getElementById('selector-tallas')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (this.tallaElegida.stock <= 0) {
      this.avisar('Esa talla está agotada.', 'warning');
      return;
    }

    const userId = this.currentUser ? this.currentUser.id : 0;
    this.anadiendo = true;
    this.carritoService.getCart(userId).subscribe({
      next: (cartItems: Carrito[]) => {
        const variante = this.tallaElegida!;
        const enCarrito = cartItems.find((item) => item.variante_id === variante.id)?.cantidad ?? 0;
        if (enCarrito >= variante.stock) {
          this.anadiendo = false;
          this.avisar('Ya tienes en el carrito todas las unidades disponibles de esta talla.', 'warning');
          return;
        }

        const linea = new Carrito(0, userId, producto.ProductoID, 1, producto, variante.id ?? null, variante.talla);
        this.carritoService.addToCart(linea).subscribe({
          next: () => {
            this.anadiendo = false;
            const talla = tallaVisible(variante.talla);
            this.avisar(talla ? `Añadido al carrito (talla ${talla})` : 'Añadido al carrito', 'success');
          },
          error: (err) => {
            this.anadiendo = false;
            console.error(err);
            this.avisar(err?.mensaje || err?.error?.mensaje || 'Ocurrió un error al añadir el producto al carrito', 'danger', 2500);
            // El stock pudo cambiar: se recarga para mostrar las tallas actualizadas
            this.cargarProducto(producto.ProductoID);
          },
        });
      },
      error: (err) => {
        this.anadiendo = false;
        console.error(err);
        this.avisar('No se pudo consultar el carrito.', 'danger');
      },
    });
  }
}
