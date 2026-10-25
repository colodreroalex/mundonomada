import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersService, PedidoAdmin } from '../../services/orders.service';
import { PdfService, facturaDesdePedido } from '../../services/pdf.service';
import { Grafica, ResumenPedidos, construirGrafica, resumirPedidos } from './grafica-pedidos';

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

  // Resumen y gráfica de los pedidos mostrados (se calculan en el navegador)
  readonly anchoGrafica = 600;
  readonly altoGrafica = 180;
  resumen: ResumenPedidos = resumirPedidos([]);
  grafica: Grafica | null = null;
  puntoActivo: number | null = null;

  constructor(private ordersService: OrdersService, private pdfService: PdfService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.ordersService.getAllOrders(this.estado).subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.resumen = resumirPedidos(pedidos);
        this.grafica = construirGrafica(pedidos, this.anchoGrafica, this.altoGrafica);
        this.puntoActivo = null;
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

  /** Con el ratón: el tramo más cercano a la posición horizontal. */
  senalarGrafica(evento: MouseEvent): void {
    if (!this.grafica) {
      return;
    }
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const proporcion = Math.min(1, Math.max(0, (evento.clientX - caja.left) / caja.width));
    this.puntoActivo = Math.round(proporcion * (this.grafica.tramos.length - 1));
  }

  /** Con el teclado: flechas para recorrer los tramos, Inicio/Fin para los extremos. */
  moverPunto(evento: KeyboardEvent): void {
    if (!this.grafica) {
      return;
    }
    const ultimo = this.grafica.tramos.length - 1;
    const actual = this.puntoActivo ?? ultimo;
    const destinos: Record<string, number> = {
      ArrowLeft: Math.max(0, actual - 1),
      ArrowRight: Math.min(ultimo, actual + 1),
      Home: 0,
      End: ultimo,
    };
    if (evento.key in destinos) {
      evento.preventDefault();
      this.puntoActivo = destinos[evento.key];
    }
  }

  /** Posición del globo en % para que siga al punto aunque la gráfica cambie de tamaño. */
  posicionGlobo(indice: number): { left: string; top: string; transform: string } {
    const tramo = this.grafica!.tramos[indice];
    const x = (tramo.x / this.anchoGrafica) * 100;
    const desplazamiento = x < 15 ? '-12%' : x > 85 ? '-88%' : '-50%';
    return {
      left: `${x}%`,
      top: `${(tramo.y / this.altoGrafica) * 100}%`,
      transform: `translate(${desplazamiento}, calc(-100% - 14px))`,
    };
  }

  descargarFactura(pedido: PedidoAdmin): void {
    this.pdfService.generarFactura(facturaDesdePedido(pedido, pedido.items))
      .catch((err: Error) => (this.error = 'No se pudo generar la factura: ' + err.message));
  }
}
