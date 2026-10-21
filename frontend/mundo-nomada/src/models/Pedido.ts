export interface Pedido {
  id: number;
  user_id: number;
  fecha: string;
  total: number;
  estado: string;
  // Datos de factura y envío (los pedidos antiguos pueden no tenerlos)
  subtotal?: number | null;
  iva?: number | null;
  envio?: number | null;
  /** true en los pedidos hechos con precios con IVA incluido (los antiguos, sin IVA) */
  precios_con_iva?: boolean | null;
  paid_at?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  shipping_name?: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_province?: string | null;
  shipping_phone?: string | null;
  shipping_email?: string | null;
}
