import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Pedido } from '../../models/Pedido';
import { OrderItem } from '../../models/OrderItem';
import { apiBaseUrl } from '../config/api.config';

interface ApiResponse<T> {
  resultado: string;
  orders?: T[];
  items?: T[];
  error?: string;
  mensaje?: string;
}

export interface DatosEnvio {
  nombre: string;
  apellidos: string;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  email: string;
}

export interface PedidoCheckout {
  id: number;
  fecha: string;
  estado: string;
  subtotal: number;
  iva: number;
  envio: number;
  total: number;
  shipping_name: string;
  shipping_address: string;
  shipping_postal_code: string;
  shipping_city: string;
  shipping_province: string;
  shipping_phone: string;
  shipping_email: string;
}

export interface EstadoCheckout {
  resultado: string;
  pedido: PedidoCheckout;
  items: { producto_id: number; nombre: string; cantidad: number; precio_unitario: number }[];
}

export interface PedidoAdmin extends PedidoCheckout {
  paid_at: string | null;
  payment_intent: string | null;
  user_email: string;
  items: { nombre: string; cantidad: number; precio_unitario: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private apiUrl = apiBaseUrl;

  constructor(private http: HttpClient) { }

  /**
   * Los pedidos se crean en checkout/createCheckoutSession.php y solo el
   * webhook de Stripe los marca como pagados.
   */

  // Obtener todos los pedidos del usuario autenticado
  getOrdersByUser(): Observable<Pedido[]> {
    return this.http.get<ApiResponse<Pedido>>(`${this.apiUrl}orders/getOrdersByUser.php`, { withCredentials: true })
      .pipe(
        map(response => {
          console.log('Respuesta de getOrdersByUser:', response);
          if (response.resultado === 'OK' && response.orders) {
            return response.orders;
          } else if (response.resultado === 'ERROR') {
            console.warn('Error en getOrdersByUser:', response.mensaje || 'Error desconocido');
            return [];
          } else {
            console.warn('Respuesta inesperada en getOrdersByUser:', response);
            return [];
          }
        }),
        catchError(error => {
          console.error('Error en getOrdersByUser:', error);
          return this.handleError(error);
        })
      );
  }

  // Obtener los ítems de un pedido específico
  getOrderItems(orderId: number): Observable<OrderItem[]> {
    return this.http.get<ApiResponse<OrderItem>>(`${this.apiUrl}order_items/getOrderItems.php?order_id=${orderId}`, { withCredentials: true })
      .pipe(
        map(response => {
          console.log('Respuesta de getOrderItems:', response);
          if (response.resultado === 'OK' && response.items) {
            return response.items;
          } else if (response.resultado === 'ERROR') {
            console.warn('Error en getOrderItems:', response.mensaje || 'Error desconocido');
            return [];
          } else {
            console.warn('Respuesta inesperada en getOrderItems:', response);
            return [];
          }
        }),
        catchError(error => {
          console.error('Error en getOrderItems:', error);
          return this.handleError(error);
        })
      );
  }

  // Crea el pedido en el servidor y devuelve la URL de pago de Stripe
  createCheckoutSession(datosEnvio: DatosEnvio): Observable<string> {
    return this.http.post<{ resultado: string; url: string }>(
      `${this.apiUrl}checkout/createCheckoutSession.php`, datosEnvio, { withCredentials: true }
    ).pipe(map(response => response.url), catchError(error => this.handleError(error)));
  }

  // Estado del pedido al volver de Stripe
  getCheckoutStatus(sessionId: string): Observable<EstadoCheckout> {
    return this.http.get<EstadoCheckout>(
      `${this.apiUrl}checkout/getCheckoutStatus.php?session_id=${encodeURIComponent(sessionId)}`, { withCredentials: true }
    ).pipe(catchError(error => this.handleError(error)));
  }

  // Administración: todos los pedidos, opcionalmente filtrados por estado
  getAllOrders(estado = ''): Observable<PedidoAdmin[]> {
    return this.http.get<{ resultado: string; orders: PedidoAdmin[] }>(
      `${this.apiUrl}orders/getAllOrders.php?estado=${encodeURIComponent(estado)}`, { withCredentials: true }
    ).pipe(map(response => response.orders), catchError(error => this.handleError(error)));
  }

  // Administración: marcar un pedido como enviado o completado
  updateOrderStatus(id: number, estado: 'enviado' | 'completado'): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}orders/updateOrderStatus.php`, { id, estado }, { withCredentials: true }
    ).pipe(catchError(error => this.handleError(error)));
  }

  // Manejador de errores
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ha ocurrido un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Código de error: ${error.status}, Mensaje: ${error.message}`;
      
      // Si hay un mensaje de error específico en la respuesta
      if (error.error) {
        if (error.error.error) {
          errorMessage = error.error.error;
        } else if (error.error.mensaje) {
          errorMessage = error.error.mensaje;
        } else if (typeof error.error === 'string') {
          try {
            const parsed = JSON.parse(error.error);
            errorMessage = parsed.mensaje || parsed.error || errorMessage;
          } catch (e) {
            errorMessage = error.error;
          }
        }
      }
    }
    
    console.error('Error detallado:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
