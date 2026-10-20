import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersService, PedidoAdmin } from '../../services/orders.service';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-pedidos.component.html',
  styleUrl: './admin-pedidos.component.css'
})
export class AdminPedidosComponent implements OnInit {
  pedidos: PedidoAdmin[] = [];
  // Por defecto se muestran los pedidos cobrados que hay que preparar
  estado = 'pagado';
  loading = false;
  error = '';

  readonly estados = ['', 'pendiente', 'pagado', 'enviado', 'completado', 'cancelado'];

  constructor(private ordersService: OrdersService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.ordersService.getAllOrders(this.estado).subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  avanzar(pedido: PedidoAdmin, estado: 'enviado' | 'completado'): void {
    if (!confirm(`¿Marcar el pedido MN-${pedido.id} como ${estado}?`)) {
      return;
    }
    this.ordersService.updateOrderStatus(pedido.id, estado).subscribe({
      next: () => this.cargar(),
      error: (err: Error) => this.error = err.message
    });
  }
}
