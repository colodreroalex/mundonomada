import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Carrito } from '../../models/Carrito';
import { map, Observable, switchMap, throwError, of, forkJoin, Subject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Producto } from '../../models/Producto';
import { Variante } from '../../models/Variante';
import { apiBaseUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  url = `${apiBaseUrl}carrito/`;
  private LOCAL_CART_KEY = 'guestCart';

  // Constantes para cálculos
  public readonly IVA_PORCENTAJE: number = 21;
  public readonly ENVIO_GRATIS_MINIMO: number = 60;
  public readonly COSTO_ENVIO_NORMAL: number = 3.5;

  // Subject para notificar cuando se completa una compra para usuario invitado
  private guestPurchaseCompleted = new Subject<void>();

  // Observable para suscribirse a la finalización de compra de invitado
  public guestPurchaseCompleted$ = this.guestPurchaseCompleted.asObservable();

  // Registro de productos comprados por usuarios invitados para evitar que reaparezcan
  private readonly GUEST_PURCHASED_KEY = 'guestPurchasedProducts';

  // Avisa cuando el carrito cambia, para que el contador del menú se actualice
  // al momento sin tener que preguntar al servidor cada pocos segundos
  private cambios = new Subject<void>();
  public cambios$ = this.cambios.asObservable();

  constructor(private http: HttpClient) {}

  addToCart(carrito: Carrito): Observable<any> {
    return this.addToCartInterno(carrito).pipe(tap(() => this.cambios.next()));
  }

  updateCart(item: Carrito): Observable<any> {
    return this.updateCartInterno(item).pipe(tap(() => this.cambios.next()));
  }

  removeItem(cartId: number, userId?: number): Observable<any> {
    return this.removeItemInterno(cartId, userId).pipe(tap(() => this.cambios.next()));
  }

  migrateGuestCart(userId: number): Observable<any> {
    return this.migrateGuestCartInterno(userId).pipe(tap(() => this.cambios.next()));
  }

  clearCart(userId: number = 0): Observable<any> {
    return this.clearCartInterno(userId).pipe(tap(() => this.cambios.next()));
  }

  /* Métodos para gestionar el carrito en localStorage (para usuarios invitados) */
  private getLocalCart(): Carrito[] {
    const cartStr = localStorage.getItem(this.LOCAL_CART_KEY);
    return cartStr ? JSON.parse(cartStr) : [];
  }

  public saveLocalCart(cart: Carrito[]): void {
    localStorage.setItem(this.LOCAL_CART_KEY, JSON.stringify(cart));
  }

  /**
   * Elimina completamente el carrito de localStorage
   * Este método es más definitivo que saveLocalCart([])
   */
  public removeLocalCart(): void {
    localStorage.removeItem(this.LOCAL_CART_KEY);
  }

  /**
   * Verifica el stock actualizado para un producto específico.
   * Esta función obtiene la información más reciente del servidor.
   */
  verificarStockActualizado(productoID: number): Observable<Producto> {
    return this.http.post<any>(`${this.url}getUpdatedProducts.php`, { ids: [productoID] }, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.resultado === 'OK' && response.products && response.products.length > 0) {
            return this.productoDesdeApi(response.products[0]);
          } else {
            // Si el producto ya no existe o no está disponible, lanzamos un error
            console.error('Producto no disponible en servidor:', productoID);
            throw new Error(response?.mensaje || 'Producto no disponible. Puede haber sido eliminado.');
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error en verificarStockActualizado:', error);
          return throwError(() => error);
        })
      );
  }

  /** Convierte un producto de la API (con sus tallas) en un Producto. */
  productoDesdeApi(p: any): Producto {
    const variantes: Variante[] = (p.variantes || []).map((v: any) => ({ id: Number(v.id), talla: v.talla, stock: Number(v.stock) || 0 }));
    return new Producto(p.ProductoID, p.nombre, p.precio, p.descripcion, Number(p.stock) || 0, p.categoriaID, p.imagen, p.color ?? null, variantes);
  }

  /**
   * Talla de una línea del carrito dentro de las tallas actuales del producto.
   * Las líneas antiguas sin talla solo valen si el producto tiene una única talla.
   */
  varianteDeLinea(producto: Producto, varianteId: number | null): Variante | undefined {
    if (varianteId == null) {
      return producto.variantes.length === 1 ? producto.variantes[0] : undefined;
    }
    return producto.variantes.find((v) => v.id === varianteId);
  }

  /**
   * Producto tal como se guarda en una línea del carrito: el stock es el de su
   * talla, que es el que limita cuántas unidades se pueden comprar.
   */
  private productoDeLinea(producto: Producto, variante: Variante): Producto {
    return { ...producto, stock: variante.stock, variantes: [] };
  }

  /**
   * Comprueba el carrito de invitado contra el stock actual de cada talla.
   * Quita las líneas cuyo producto o talla ya no existe o está agotado.
   */
  actualizarCarritoInvitado(items: Carrito[]): Observable<{ items: Carrito[]; cambiado: boolean }> {
    if (items.length === 0) {
      return of({ items, cambiado: false });
    }
    const ids = [...new Set(items.map((i) => i.producto_id))];
    return this.http.post<any>(`${this.url}getUpdatedProducts.php`, { ids }, { withCredentials: true }).pipe(
      map((response) => {
        const productos = new Map<number, Producto>();
        for (const p of response?.products || []) {
          const producto = this.productoDesdeApi(p);
          productos.set(producto.ProductoID, producto);
        }
        let cambiado = false;
        const actualizados: Carrito[] = [];
        for (const item of items) {
          const producto = productos.get(item.producto_id);
          const variante = producto && this.varianteDeLinea(producto, item.variante_id);
          if (!producto || !variante || variante.stock <= 0) {
            cambiado = true;
            continue;
          }
          if (item.producto?.stock !== variante.stock || item.variante_id !== variante.id || item.cantidad > variante.stock) {
            cambiado = true;
          }
          actualizados.push({
            ...item,
            variante_id: variante.id ?? null,
            talla: variante.talla,
            cantidad: Math.min(item.cantidad, variante.stock),
            producto: this.productoDeLinea(producto, variante),
          });
        }
        if (cambiado) {
          this.saveLocalCart(actualizados);
          this.cambios.next();
        }
        return { items: actualizados, cambiado };
      })
    );
  }

  /**
   * Añade un producto al carrito.
   * Si el user_id es 0 o nulo, se guarda en localStorage.
   */
  private addToCartInterno(carrito: Carrito): Observable<any> {
    // Para usuarios invitados, primero verificar stock actualizado
    if (!carrito.user_id || carrito.user_id === 0) {
      return this.verificarStockActualizado(carrito.producto_id).pipe(
        switchMap(productoActualizado => {
          const variante = this.varianteDeLinea(productoActualizado, carrito.variante_id);
          if (!variante) {
            return throwError(() => ({ mensaje: 'Elige una talla.' }));
          }
          const sinStock = { mensaje: 'No quedan suficientes unidades disponibles de esta talla.', stock: variante.stock };
          carrito.variante_id = variante.id ?? null;
          carrito.talla = variante.talla;
          carrito.producto = this.productoDeLinea(productoActualizado, variante);

          if (variante.stock < carrito.cantidad) {
            return throwError(() => sinStock);
          }

          // Cada talla es una línea distinta del carrito
          const guestCart = this.getLocalCart();
          const index = guestCart.findIndex((item) => item.variante_id === carrito.variante_id);

          if (index >= 0) {
            if (guestCart[index].cantidad + carrito.cantidad > variante.stock) {
              return throwError(() => sinStock);
            }
            guestCart[index].cantidad += carrito.cantidad;
            guestCart[index].producto = carrito.producto;
          } else {
            // Generamos un ID ficticio
            carrito.id = new Date().getTime();
            guestCart.push(carrito);
          }

          this.saveLocalCart(guestCart);
          return of({ resultado: 'OK', mensaje: 'Añadido al carrito local' });
        })
      );
    } else {
      // Usuario autenticado: usar backend
      return this.http.post<any>(`${this.url}addToCart.php`, {
        producto_id: carrito.producto_id,
        variante_id: carrito.variante_id,
        cantidad: carrito.cantidad,
      }, { withCredentials: true })
        .pipe(
          map(response => {
            if (response && response.resultado === 'OK') {
              return response;
            } else {
              throw new Error(response?.mensaje || 'Error al añadir al carrito');
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error en addToCart:', error);
            return throwError(() => error);
          })
        );
    }
  }

  /**
   * Obtiene el carrito.
   * Si userId es 0, lo obtiene de localStorage.
   */
  getCart(userId: number): Observable<Carrito[]> {
    if (!userId || userId === 0) {
      const guestCart = this.getLocalCart();
      // Ya no filtramos productos previamente comprados para permitir recompras

      return new Observable((observer) => {
        observer.next(guestCart);
        observer.complete();
      });
    } else {
      // Usuario autenticado: obtener carrito del backend
      return this.http
        .get<any>(`${this.url}getCarrito.php`, { withCredentials: true })
        .pipe(
          map((response) => {
            if (response && response.resultado === 'OK') {
              return response.datos;
            } else {
              throw new Error(response?.mensaje || 'Error al obtener el carrito');
            }
          }),
          map((items: any[]) => {
            return items
              .map((item) => {
                // El stock que llega es el de la talla de esta línea
                const producto: Producto = new Producto(
                  item.ProductoID,
                  item.nombre,
                  item.precio,
                  item.descripcion,
                  Number(item.stock) || 0,
                  item.categoriaID,
                  item.imagen,
                  item.color ?? null
                );
                return new Carrito(
                  item.cart_id,
                  userId,
                  item.ProductoID,
                  item.cantidad,
                  producto,
                  Number(item.variante_id),
                  item.talla
                );
              })
              .filter((item) => item.producto && item.producto.stock > 0);
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error en getCart:', error);
            return throwError(() => error);
          })
        );
    }
  }

  /**
   * Actualiza la cantidad de un producto en el carrito.
   * Si user_id es 0, se actualiza en localStorage.
   */
  private updateCartInterno(item: Carrito): Observable<any> {
    if (!item.user_id || item.user_id === 0) {
      let guestCart = this.getLocalCart();
      const index = guestCart.findIndex((cartItem) => cartItem.id === item.id);
      if (index >= 0) {
        // Verificar que la cantidad solicitada no supere el stock
        if (
          guestCart[index].producto &&
          item.cantidad > guestCart[index].producto.stock
        ) {
          return new Observable((observer) => {
            observer.error({
              mensaje: 'La cantidad solicitada supera el stock disponible.',
            });
            observer.complete();
          });
        }
        guestCart[index].cantidad = item.cantidad;
        this.saveLocalCart(guestCart);
        return new Observable((observer) => {
          observer.next({
            resultado: 'OK',
            mensaje: 'Actualizado en carrito local',
          });
          observer.complete();
        });
      } else {
        return new Observable((observer) => {
          observer.error({ mensaje: 'Item no encontrado en carrito local' });
        });
      }
    } else {
      return this.http.post<any>(`${this.url}updateCartItem.php`, {
        id: item.id,
        cantidad: item.cantidad,
      }, { withCredentials: true })
        .pipe(
          map(response => {
            if (response && response.resultado === 'OK') {
              return response;
            } else {
              throw new Error(response?.mensaje || 'Error al actualizar el carrito');
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error en updateCart:', error);
            return throwError(() => error);
          })
        );
    }
  }

  /**
   * Elimina un producto del carrito.
   * Para usuarios invitados se usa localStorage.
   * @param cartId ID del carrito o identificador del item.
   * @param userId (opcional) ID del usuario.
   */
  private removeItemInterno(cartId: number, userId?: number): Observable<any> {
    if (!userId || userId === 0) {
      let guestCart = this.getLocalCart();
      guestCart = guestCart.filter((item) => item.id !== cartId);
      this.saveLocalCart(guestCart);
      return new Observable((observer) => {
        observer.next({
          resultado: 'OK',
          mensaje: 'Eliminado del carrito local',
        });
        observer.complete();
      });
    } else {
      return this.http.post<any>(`${this.url}removeItemFromCart.php`, {
        id: cartId,
      }, { withCredentials: true })
        .pipe(
          map(response => {
            if (response && response.resultado === 'OK') {
              return response;
            } else {
              throw new Error(response?.mensaje || 'Error al eliminar item del carrito');
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error en removeItem:', error);
            return throwError(() => error);
          })
        );
    }
  }

  /**
   * Obtiene el total del carrito.
   * Para invitados se calcula a partir del carrito almacenado localmente.
   */
  getTotal(userId: number): Observable<number> {
    if (!userId || userId === 0) {
      const guestCart = this.getLocalCart();
      const total = guestCart.reduce((acc, item) => {
        const price = item.producto?.precio || 0;
        return acc + price * item.cantidad;
      }, 0);
      return new Observable((observer) => {
        observer.next(total);
        observer.complete();
      });
    } else {
      return this.http
        .get<any>(`${this.url}getTotalPrecioCarrito.php`, { withCredentials: true })
        .pipe(
          map((response) => {
            if (response && response.resultado === 'OK') {
              return response.total;
            } else {
              throw new Error(response?.mensaje || 'Error al obtener el total del carrito');
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error en getTotal:', error);
            return throwError(() => error);
          })
        );
    }
  }

  private migrateGuestCartInterno(userId: number): Observable<any> {
    const guestCart = this.getLocalCart();
    if (guestCart.length === 0) {
      return of({ resultado: 'OK', mensaje: 'No hay items para migrar.' });
    }

    // Para cada ítem del carrito, actualizamos el user_id y lo agregamos al backend
    const migrationObservables = guestCart.map((item) => {
      return this.http.post<any>(`${this.url}addToCart.php`, {
        producto_id: item.producto_id,
        variante_id: item.variante_id ?? null,
        cantidad: item.cantidad,
      }, { withCredentials: true });
    });

    return forkJoin(migrationObservables).pipe(
      tap(() => {
        // Limpieza completa de datos de invitado
        this.removeLocalCart(); // Usar removeLocalCart en lugar de saveLocalCart para eliminar completamente
        this.clearGuestPurchasedProducts(); // Limpiar registro de productos comprados
        localStorage.removeItem('lastCartSync'); // Eliminar cualquier timestamp de sincronización

        // Limpiar cualquier otro dato de localStorage relacionado con el carrito
        // que pueda estar causando problemas
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('cart') || key.includes('Cart') || key.includes('producto'))) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.error('Error al limpiar datos adicionales de localStorage:', e);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error en migrateGuestCart:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Limpia el carrito completamente (sin necesidad de un nuevo endpoint)
   * @param userId ID del usuario (si es 0, limpia el carrito local)
   * @returns Observable con el resultado de la operación
   */
  private clearCartInterno(userId: number = 0): Observable<any> {
    if (userId === 0) {
      // Para invitados, limpiar localStorage
      this.removeLocalCart();
      this.guestPurchaseCompleted.next(); // Notificar que se ha limpiado el carrito
      return of({ resultado: 'OK', mensaje: 'Carrito limpiado correctamente.' });
    } else {
      // Para usuarios registrados, usamos el API existente eliminando cada ítem
      return this.getCart(userId).pipe(
        switchMap(items => {
          if (items.length === 0) {
            return of({ resultado: 'OK', mensaje: 'Carrito ya está vacío.' });
          }

          // Crear observables para eliminar cada ítem del carrito
          const deleteObservables = items.map(item =>
            this.removeItem(item.id, userId)
          );

          // Ejecutar todas las eliminaciones en paralelo
          return forkJoin(deleteObservables).pipe(
            map(() => ({ resultado: 'OK', mensaje: 'Carrito limpiado correctamente.' })),
            catchError((error: HttpErrorResponse) => {
              console.error('Error al limpiar el carrito:', error);
              return throwError(() => error);
            })
          );
        })
      );
    }
  }

  /** IVA que va incluido en un importe con IVA (los precios de la tienda lo llevan) */
  calcularIVA(importe: number): number {
    return Math.round((importe - importe / (1 + this.IVA_PORCENTAJE / 100)) * 100) / 100;
  }

  /**
   * Calcula el coste de envío según el subtotal
   * @param subtotal Subtotal del pedido
   * @returns Coste de envío (0 si supera el mínimo para envío gratis)
   */
  calcularEnvio(subtotal: number): number {
    return subtotal >= this.ENVIO_GRATIS_MINIMO ? 0 : this.COSTO_ENVIO_NORMAL;
  }

  /**
   * Calcula los importes del pedido. Los precios llevan el IVA incluido:
   * total = productos + envío, e iva es la parte del total que corresponde al IVA.
   * @param subtotal Suma de los productos (IVA incluido, sin envío)
   * @returns Objeto con todos los importes calculados
   */
  calcularTotalesPedido(subtotal: number): {
    subtotal: number;
    iva: number;
    envio: number;
    totalConIvaYEnvio: number;
  } {
    const envio = this.calcularEnvio(subtotal);
    const totalConIvaYEnvio = subtotal + envio;
    const iva = this.calcularIVA(totalConIvaYEnvio);

    return {
      subtotal,
      iva,
      envio,
      totalConIvaYEnvio
    };
  }

  /**
   * Obtiene el listado de productos que ya han sido comprados por el usuario invitado
   * @returns Array de IDs de productos comprados
   */
  getGuestPurchasedProducts(): number[] {
    const purchasedProductsStr = localStorage.getItem(this.GUEST_PURCHASED_KEY);
    return purchasedProductsStr ? JSON.parse(purchasedProductsStr) : [];
  }

  /**
   * Guarda productos en el registro de comprados para evitar que reaparezcan en el carrito
   * @param productIds Array de IDs de productos a marcar como comprados
   */
  saveGuestPurchasedProducts(productIds: number[]): void {
    if (!productIds || productIds.length === 0) return;

    // Obtener los productos ya registrados y añadir los nuevos
    const currentPurchased = this.getGuestPurchasedProducts();
    const updatedPurchased = [...new Set([...currentPurchased, ...productIds])];

    // Guardar el listado actualizado en localStorage
    localStorage.setItem(this.GUEST_PURCHASED_KEY, JSON.stringify(updatedPurchased));
    console.log('Productos marcados como comprados:', updatedPurchased);
  }

  /**
   * Limpia el registro de productos comprados
   * Útil cuando un usuario invitado se registra o inicia sesión
   */
  clearGuestPurchasedProducts(): void {
    localStorage.removeItem(this.GUEST_PURCHASED_KEY);
  }
}
