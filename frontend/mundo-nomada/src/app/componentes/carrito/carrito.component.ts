import { Component, OnInit, OnDestroy } from '@angular/core';
import { CarritoService } from '../../services/carrito.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Carrito } from '../../../models/Carrito';
import { tallaVisible } from '../../../models/Variante';
import { User } from '../../../models/Users';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-carrito',
  imports: [CommonModule, RouterLink],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css'],
})
export class CarritoComponent implements OnInit, OnDestroy {
  carrito: Carrito[] = [];
  currentUser: User | null = null;
  loading: boolean = false;
  error: string = '';
  total: number = 0;
  subtotal: number = 0;
  iva: number = 0;
  envio: number = 0;
  totalConIvaYEnvio: number = 0;
  envioGratisMinimo: number = 60; // Mínimo para envío gratis
  costoEnvioNormal: number = 3.5; // Costo de envío cuando no se alcanza el mínimo
  ivaPorcentaje: number = 21; // IVA para productos de moda (21%)

  // Propiedad para controlar el intervalo de actualización
  private refreshIntervalId: any = null;

  // Propiedad para notificaciones: type puede ser 'success', 'warning', 'danger', etc.
  notification: { message: string; type: string } | null = null;

  private subscription: Subscription = new Subscription();

  constructor(private carritoService: CarritoService, private authService: AuthService) {}

  readonly tallaVisible = tallaVisible;
  porLinea = (_: number, item: Carrito) => item.id;

  ngOnInit(): void {
    this.subscription.add(this.authService.getCurrentUserObservable().subscribe((user) => {
      this.currentUser = user;
      const userId = user ? user.id : 0;
      this.loadCarrito(userId);
      this.loadTotal(userId);

      // Actualización más frecuente para invitados (10 segundos) y normal para usuarios (30 segundos).
      // Se para el temporizador anterior para no acumularlos al cambiar de sesión,
      // y no se consulta mientras la pestaña está en segundo plano.
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
      }
      const refreshInterval = !user ? 10000 : 30000;
      this.refreshIntervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.refreshCart(userId);
        }
      }, refreshInterval);
    }));
    
    // Subscribirse a la notificación de finalización de compra de invitado
    this.subscription.add(
      this.carritoService.guestPurchaseCompleted$.subscribe(() => {
        console.log('Carrito: Recibida notificación de compra completada');
        // Detener la actualización automática
        this.stopCartRefresh();
        // Limpiar carrito en la vista
        this.carrito = [];
        // Recalcular totales
        this.calcularTotales();
      })
    );
  }
  
  refreshCart(userId: number): void {
    // Invitados: se comprueba el stock de cada talla en el servidor
    if (userId === 0 && this.carrito.length > 0) {
      this.carritoService.actualizarCarritoInvitado(this.carrito).subscribe({
        next: ({ items, cambiado }) => {
          if (!cambiado) return;
          this.carrito = items;
          this.loadTotal(userId);
          this.notification = {
            message: items.length === 0
              ? 'El carrito se ha vaciado porque los productos ya no están disponibles.'
              : 'El inventario ha cambiado. Se ha actualizado su carrito.',
            type: 'warning'
          };
          setTimeout(() => this.notification = null, 3000);
        },
        error: (err) => console.error('Error al actualizar el carrito con datos recientes:', err)
      });
    } else {
      // Para usuarios registrados, usar el método normal
      this.carritoService.getCart(userId).subscribe({
        next: (data) => {
          // Verificar si hay cambios en el carrito
          const stockChanged = this.detectStockChanges(this.carrito, data);
          this.carrito = data;
          
          // Recalcular total si hubo cambios
          if (stockChanged) {
            this.loadTotal(userId);
            this.notification = {
              message: 'El inventario ha cambiado. Se ha actualizado su carrito.',
              type: 'warning'
            };
            setTimeout(() => this.notification = null, 3000);
          }
          
          console.log('Carrito actualizado automáticamente:', this.carrito);
        },
        error: (err) => {
          console.error('Error al actualizar el carrito automáticamente:', err);
        }
      });
    }
  }

  // Detiene la actualización automática del carrito
  public stopCartRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      console.log('Actualización automática del carrito detenida');
    }
  }

  // Detecta cambios de stock o líneas que desaparecen (cada talla es una línea)
  detectStockChanges(oldCart: Carrito[], newCart: Carrito[]): boolean {
    if (!oldCart || !newCart) return false;
    const anteriores = new Map(oldCart.map((item) => [item.id, item.producto?.stock]));
    if (oldCart.some((item) => !newCart.some((nuevo) => nuevo.id === item.id))) {
      return true;
    }
    return newCart.some((item) => anteriores.has(item.id) && anteriores.get(item.id) !== item.producto?.stock);
  }

  loadCarrito(userId: number): void {
    this.loading = true;
    this.carritoService.getCart(userId).subscribe({
      next: (data) => {
        this.carrito = data;
        this.loading = false;
        this.checkStock();
      },
      error: (err) => {
        console.error(err);
        this.notification = { message: 'Ocurrió un error al cargar el carrito.', type: 'danger' };
        this.loading = false;
        setTimeout(() => this.notification = null, 2000);
      }
    });
  }

  loadTotal(userId: number): void {
    this.carritoService.getTotal(userId).subscribe({
      next: (data) => {
        // PostgreSQL devuelve el importe como texto ("49.80"): sin convertirlo,
        // subtotal + iva + envío concatenaría cadenas en lugar de sumar
        this.subtotal = Number(data) || 0;
        this.calcularTotales();
      },
      error: (err) => {
        console.error(err);
        this.notification = { message: 'Ocurrió un error al cargar el total.', type: 'danger' };
        setTimeout(() => this.notification = null, 2000);
      },
    });
  }

  // Método para calcular todos los totales: IVA, envío y total final
  calcularTotales(): void {
    // Calcular el IVA (21% del subtotal)
    this.iva = this.subtotal * (this.ivaPorcentaje / 100);
    
    // Determinar si aplica costo de envío
    this.envio = this.subtotal >= this.envioGratisMinimo ? 0 : this.costoEnvioNormal;
    
    // Calcular el total final (subtotal + IVA + envío)
    this.totalConIvaYEnvio = this.subtotal + this.iva + this.envio;
    
    // Mantener el total actual para compatibilidad con el código existente
    this.total = this.subtotal;
  }

  // Verifica si hay productos con stock 0 y muestra un mensaje
  checkStock(): void {
    const outOfStockItems = this.carrito.filter(item => item.producto?.stock === 0);
    if (outOfStockItems.length > 0) {
      this.notification = {
        message: 'Algunos productos en tu carrito ya no están disponibles. Alguien debio comprarlo y no quedan mas ud.',
        type: 'warning',
      };
      setTimeout(() => this.notification = null, 3000);
      this.carrito = this.carrito.filter(item => item.producto && item.producto.stock > 0);
      // Actualizar el carrito en localStorage
      if (!this.currentUser) {
        this.carritoService.saveLocalCart(this.carrito);
      }
    }
  }

  // Incrementa la cantidad y actualiza el carrito
  increment(item: Carrito): void {
    if (item.producto && item.cantidad < item.producto.stock) {
      item.cantidad++;
      this.updateItem(item);
    } else {
      this.notification = {
        message: 'No quedan más unidades disponibles para este producto.',
        type: 'warning',
      };
      setTimeout(() => this.notification = null, 1500);
    }
  }
  
  // Decrementa la cantidad y actualiza el carrito
  decrement(item: Carrito): void {
    if (item.cantidad > 1) {
      item.cantidad--;
      this.updateItem(item);
    }
  }

  // Actualiza la cantidad en el carrito (backend o localStorage)
  updateItem(item: Carrito): void {
    this.carritoService.updateCart(item).subscribe({
      next: () => {
        const userId = this.currentUser ? this.currentUser.id : 0;
        this.loadTotal(userId);
        this.notification = { message: 'Cantidad actualizada.', type: 'success' };
        setTimeout(() => this.notification = null, 1500);
      },
      error: (err) => {
        console.error(err);
        this.notification = { message: 'Ocurrió un error al actualizar la cantidad.', type: 'danger' };
        setTimeout(() => this.notification = null, 2000);
      },
    });
  }

  // Elimina el producto del carrito
  removeItem(item: Carrito): void {
    const userId = this.currentUser ? this.currentUser.id : 0;
    this.carritoService.removeItem(item.id, userId).subscribe({
      next: () => {
        this.carrito = this.carrito.filter((c) => c.id !== item.id);
        this.loadTotal(userId);
        this.notification = { message: 'Producto eliminado del carrito.', type: 'success' };
        setTimeout(() => this.notification = null, 1500);
      },
      error: (err) => {
        console.error(err);
        this.notification = { message: 'Ocurrió un error al eliminar el producto.', type: 'danger' };
        setTimeout(() => this.notification = null, 2000);
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }
}
