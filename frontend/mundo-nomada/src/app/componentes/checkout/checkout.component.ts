import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { AuthService } from '../../services/auth.service';
import { OrdersService, EstadoCheckout } from '../../services/orders.service';
import { Carrito } from '../../../models/Carrito';
import { Producto } from '../../../models/Producto';
import { tallaVisible } from '../../../models/Variante';
import { User } from '../../../models/Users';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PdfService, DatosFactura, facturaDesdePedido } from '../../services/pdf.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  carrito: Carrito[] = [];
  total: number = 0;
  subtotal: number = 0;
  iva: number = 0;
  envio: number = 0;
  totalConIvaYEnvio: number = 0;
  loading: boolean = false;
  redirigiendo: boolean = false;
  error: string = '';
  feedbackMessage: string = ''; // Mensaje de feedback para el usuario
  currentUser: User | null = null;

  // Variables para el recibo (al volver de Stripe)
  orderCompleted: boolean = false;
  pagoPendiente: boolean = false;
  orderId: string = '';
  orderData: any = null;
  numeroFactura: string | null = null;
  private factura: DatosFactura | null = null;

  // Resumen del pedido: abierto en escritorio, plegado en móvil
  resumenAbierto: boolean = window.innerWidth >= 992;

  // Formulario de datos de envío
  shippingForm: FormGroup;
  formSubmitted: boolean = false;

  // Suscripciones
  private subscriptions: Subscription[] = [];
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tallaVisible = tallaVisible;

  constructor(
    private carritoService: CarritoService,
    private authService: AuthService,
    private ordersService: OrdersService,
    private router: Router,
    private route: ActivatedRoute,
    private pdfService: PdfService,
    private fb: FormBuilder
  ) {
    // Inicializar formulario de envío
    this.shippingForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      codigoPostal: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      ciudad: ['', [Validators.required]],
      provincia: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const sessionId = params.get('session_id');
    if (params.get('cancelado')) {
      this.error = 'Has cancelado el pago. No se ha cobrado nada y tu carrito sigue disponible.';
    }

    this.subscriptions.push(
      this.authService.getCurrentUserObservable().subscribe((user: User | null) => {
        this.currentUser = user;
        if (!user) {
          this.carrito = [];
          return;
        }
        if (sessionId) {
          this.cargarEstadoPago(sessionId, 0);
          return;
        }
        this.loadCarrito(user.id);
        this.shippingForm.patchValue({
          nombre: this.shippingForm.value.nombre || user.name?.split(' ')[0] || '',
          apellidos: this.shippingForm.value.apellidos || user.name?.split(' ').slice(1).join(' ') || '',
          email: this.shippingForm.value.email || user.email || ''
        });
        this.rellenarConUltimoPedido();
      })
    );
  }

  // Aviso de que el formulario se ha rellenado con datos de una compra anterior
  datosPrevios = false;

  /**
   * Rellena los campos vacíos con los datos de envío del último pedido del
   * usuario. Solo completa lo que está vacío y todo sigue siendo editable.
   */
  private rellenarConUltimoPedido(): void {
    this.ordersService.getOrdersByUser().subscribe({
      next: (pedidos) => {
        const ultimo = pedidos.find((p) => !!p.shipping_name && !!p.shipping_address);
        if (!ultimo) {
          return;
        }
        const [nombre, ...apellidos] = (ultimo.shipping_name || '').trim().split(/\s+/);
        const previos: Record<string, string> = {
          nombre: nombre || '',
          apellidos: apellidos.join(' '),
          direccion: ultimo.shipping_address || '',
          codigoPostal: ultimo.shipping_postal_code || '',
          ciudad: ultimo.shipping_city || '',
          provincia: ultimo.shipping_province || '',
          telefono: (ultimo.shipping_phone || '').replace(/\D/g, '').slice(-9),
        };
        const cambios: Record<string, string> = {};
        for (const [campo, valor] of Object.entries(previos)) {
          const control = this.shippingForm.get(campo);
          if (valor && control && !control.dirty && (!control.value || campo === 'nombre')) {
            cambios[campo] = valor;
          }
        }
        if (Object.keys(cambios).length > 0) {
          this.shippingForm.patchValue(cambios);
          this.datosPrevios = true;
        }
      },
      // Sin pedidos anteriores o sin conexión: el formulario queda como estaba
      error: () => {},
    });
  }

  // Getters para facilitar el acceso a los campos del formulario en la plantilla
  get f() { return this.shippingForm.controls; }

  // Método para verificar si el formulario es válido
  isFormValid(): boolean {
    return this.shippingForm.valid;
  }

  loadCarrito(userId: number): void {
    this.loading = true;
    this.carritoService.getCart(userId).subscribe({
      next: (data) => {
        this.carrito = data;
        this.subtotal = this.carrito.reduce(
          (acc, item) => acc + (item.producto?.precio || 0) * item.cantidad,
          0
        );
        // Importes orientativos: el servidor los recalcula antes de cobrar
        const totales = this.carritoService.calcularTotalesPedido(this.subtotal);
        this.subtotal = totales.subtotal;
        this.iva = totales.iva;
        this.envio = totales.envio;
        this.totalConIvaYEnvio = totales.totalConIvaYEnvio;
        this.total = this.subtotal;
        this.loading = false;
        this.checkStock();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Ocurrió un error al cargar el carrito';
        this.loading = false;
      }
    });
  }

  // Avisa si hay productos sin stock suficiente
  checkStock(): boolean {
    const outOfStockItems = this.carrito.filter(item => !item.producto || item.producto.stock < item.cantidad);
    if (outOfStockItems.length > 0) {
      this.error = 'Algunos productos en tu carrito ya no tienen suficiente stock: ' +
                   outOfStockItems.map(item => item.producto?.nombre).join(', ') +
                   '. Ajusta las cantidades en el carrito antes de pagar.';
      return false;
    }
    return true;
  }

  /**
   * Crea el pedido en el servidor y redirige a la página de pago de Stripe.
   */
  pagar(): void {
    this.formSubmitted = true;
    if (!this.isFormValid()) {
      this.error = 'Por favor, completa todos los campos de envío obligatorios';
      return;
    }
    if (!this.checkStock()) {
      return;
    }

    this.error = '';
    this.redirigiendo = true;
    this.ordersService.createCheckoutSession(this.shippingForm.value).subscribe({
      next: (url) => {
        window.location.href = url;
      },
      error: (err: Error) => {
        this.redirigiendo = false;
        this.error = err.message || 'No se pudo iniciar el pago. Inténtalo de nuevo.';
      }
    });
  }

  /**
   * Consulta el pedido al volver de Stripe. El webhook puede tardar unos
   * segundos en confirmar el pago, así que se reintenta mientras esté pendiente.
   */
  private cargarEstadoPago(sessionId: string, intento: number): void {
    this.loading = intento === 0;
    this.ordersService.getCheckoutStatus(sessionId).subscribe({
      next: (respuesta) => {
        this.loading = false;
        this.mostrarRecibo(respuesta);
        if (respuesta.pedido.estado === 'pendiente' && intento < 15) {
          this.pollTimer = setTimeout(() => this.cargarEstadoPago(sessionId, intento + 1), 2000);
        }
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message || 'No se pudo consultar el pedido.';
      }
    });
  }

  private mostrarRecibo({ pedido, items }: EstadoCheckout): void {
    this.orderId = `MN-${pedido.id}`;
    this.pagoPendiente = pedido.estado === 'pendiente';
    this.orderCompleted = ['pagado', 'enviado', 'completado'].includes(pedido.estado);
    if (pedido.estado === 'cancelado') {
      this.error = 'Este pago no se completó. No se ha cobrado nada.';
    }
    this.numeroFactura = pedido.invoice_number ?? null;
    this.factura = facturaDesdePedido(pedido, items);
    const [nombre, ...apellidos] = (pedido.shipping_name || '').split(' ');
    this.orderData = {
      items: items.map(item => new Carrito(0, this.currentUser?.id ?? 0, item.producto_id, item.cantidad,
        new Producto(item.producto_id, item.nombre, Number(item.precio_unitario), '', 0, 0, ''))),
      total: Number(pedido.subtotal),
      user: this.currentUser,
      iva: Number(pedido.iva),
      envio: Number(pedido.envio),
      totalConIvaYEnvio: Number(pedido.total),
      date: new Date(pedido.fecha),
      datosEnvio: {
        nombre,
        apellidos: apellidos.join(' '),
        direccion: pedido.shipping_address,
        codigoPostal: pedido.shipping_postal_code,
        ciudad: pedido.shipping_city,
        provincia: pedido.shipping_province,
        telefono: pedido.shipping_phone,
        email: pedido.shipping_email
      }
    };
  }

  /**
   * Genera el PDF del recibo después de una compra exitosa
   */
  downloadReceipt(): void {
    if (!this.factura) {
      this.error = 'No hay datos de pedido disponibles para descargar';
      return;
    }
    this.pdfService.generarFactura(this.factura).then(() => {
      this.feedbackMessage = this.numeroFactura ? 'Factura descargada correctamente' : 'Justificante descargado correctamente';
    }).catch((error) => {
      this.error = 'Error al generar el PDF: ' + error;
      console.error('Error al generar PDF:', error);
    });
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
  }
}
