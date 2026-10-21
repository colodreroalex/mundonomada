import { Injectable } from '@angular/core';
import type { jsPDF as JsPDF } from 'jspdf';
import { DATOS_FISCALES, datosFiscalesCompletos } from '../config/datos-fiscales';

export interface LineaFactura {
  descripcion: string;
  cantidad: number;
  /** Precio unitario tal como se guardó en el pedido (con o sin IVA, ver preciosConIva) */
  precioUnitario: number;
}

export interface DatosFactura {
  /** Número correlativo asignado por el servidor (F2026-000001). Sin él no hay factura. */
  numeroFactura: string | null;
  /** Fecha de expedición: la del cobro */
  fecha: Date;
  /** Referencia del pedido (MN-12) */
  pedido: string;
  lineas: LineaFactura[];
  /**
   * true: las líneas llevan el IVA incluido (pedidos actuales).
   * false: pedidos anteriores, con las líneas sin IVA.
   */
  preciosConIva: boolean;
  /** Gastos de envío con IVA incluido, tal como se cobran */
  envio: number;
  /** Total cobrado (fuente: servidor) */
  total: number;
  cliente: {
    nombre: string;
    direccion?: string;
    codigoPostal?: string;
    ciudad?: string;
    provincia?: string;
    telefono?: string;
    email?: string;
  };
  formaPago?: string;
}

/** Pedido tal como lo devuelve la API (checkout, perfil o administración) */
export interface PedidoParaFactura {
  id: number;
  fecha: string;
  total: number | string;
  envio?: number | string | null;
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

/** Convierte un pedido y sus líneas de la API en los datos de la factura */
export function facturaDesdePedido(
  pedido: PedidoParaFactura,
  lineas: { nombre: string; cantidad: number; precio_unitario: number | string }[]
): DatosFactura {
  return {
    numeroFactura: pedido.invoice_number ?? null,
    fecha: new Date(pedido.invoice_date || pedido.paid_at || pedido.fecha),
    pedido: `MN-${pedido.id}`,
    lineas: lineas.map((l) => ({ descripcion: l.nombre, cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario) })),
    preciosConIva: !!pedido.precios_con_iva,
    envio: Number(pedido.envio ?? 0),
    total: Number(pedido.total),
    cliente: {
      nombre: pedido.shipping_name || '',
      direccion: pedido.shipping_address || undefined,
      codigoPostal: pedido.shipping_postal_code || undefined,
      ciudad: pedido.shipping_city || undefined,
      provincia: pedido.shipping_province || undefined,
      telefono: pedido.shipping_phone || undefined,
      email: pedido.shipping_email || undefined,
    },
  };
}

// Paleta de la web (RGB)
const GRANATE: [number, number, number] = [121, 21, 21];
const TEXTO: [number, number, number] = [51, 51, 51];
const SUAVE: [number, number, number] = [107, 98, 93];
const CREMA: [number, number, number] = [246, 241, 235];
const ARENA: [number, number, number] = [236, 227, 217];
const BORDE: [number, number, number] = [228, 218, 208];

const MARGEN = 18;
const ANCHO = 210;
const ALTO = 297;

@Injectable({ providedIn: 'root' })
export class PdfService {
  // Recursos que se descargan una sola vez, cuando se genera la primera factura
  private fuentes: { normal: string; negrita: string } | null = null;
  private logo: string | null = null;

  /**
   * Genera y descarga la factura simplificada (o el justificante de compra si
   * aún faltan los datos fiscales del vendedor).
   */
  async generarFactura(datos: DatosFactura): Promise<void> {
    // La librería de PDF solo se descarga cuando se genera un documento
    const [{ jsPDF }] = await Promise.all([import('jspdf'), this.cargarRecursos()]);
    // compress: la tipografía va incrustada y sin comprimir el PDF pesaría casi 1 MB
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const fuente = this.registrarFuentes(pdf);

    const esFactura = datosFiscalesCompletos() && !!datos.numeroFactura;
    const iva = DATOS_FISCALES.tipoIva;
    const importes = this.calcularImportes(datos, iva);

    let y = this.cabecera(pdf, fuente, datos, esFactura);
    y = this.bloquesEmisorCliente(pdf, fuente, datos, y + 8);
    y = this.tablaLineas(pdf, fuente, datos, importes.envioBase, y + 10);
    y = this.totales(pdf, fuente, importes, iva, y + 6);
    this.formaDePago(pdf, fuente, datos, y + 10);
    this.piePagina(pdf, fuente, esFactura);

    const nombre = esFactura ? `factura_${datos.numeroFactura}` : `justificante_${datos.pedido}`;
    pdf.save(`${nombre}.pdf`);
  }

  /**
   * Base imponible y cuota. El total es el que cobró el servidor y la cuota es
   * la diferencia, para que cuadre exacto.
   * - Pedidos actuales: precios con IVA incluido; la base es total ÷ 1,21.
   * - Pedidos anteriores: productos sin IVA y envío con IVA, que se desglosa.
   */
  private calcularImportes(datos: DatosFactura, iva: number) {
    const redondear = (n: number) => Math.round(n * 100) / 100;
    const total = redondear(datos.total);
    if (datos.preciosConIva) {
      const base = redondear(total / (1 + iva / 100));
      return { base, cuota: redondear(total - base), total, envioBase: datos.envio };
    }
    const baseProductos = redondear(datos.lineas.reduce((suma, l) => suma + redondear(l.precioUnitario * l.cantidad), 0));
    const envioBase = redondear(datos.envio / (1 + iva / 100));
    const base = redondear(baseProductos + envioBase);
    return { base, cuota: redondear(total - base), total, envioBase };
  }

  // ---------- Bloques del documento ----------

  private cabecera(pdf: JsPDF, fuente: string, datos: DatosFactura, esFactura: boolean): number {
    // Banda superior fina con el color de la marca
    pdf.setFillColor(...GRANATE);
    pdf.rect(0, 0, ANCHO, 4, 'F');

    // Logo y nombre comercial
    if (this.logo) {
      pdf.addImage(this.logo, 'PNG', MARGEN, 12, 30, 25);
    }
    pdf.setFont(fuente, 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...GRANATE);
    pdf.text(DATOS_FISCALES.nombreComercial.toUpperCase(), MARGEN, 43);
    pdf.setFont(fuente, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...SUAVE);
    pdf.text('Moda y complementos', MARGEN, 47.5);

    // Título y datos del documento a la derecha
    const derecha = ANCHO - MARGEN;
    pdf.setFont(fuente, 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...TEXTO);
    pdf.text(esFactura ? 'FACTURA SIMPLIFICADA' : 'JUSTIFICANTE DE COMPRA', derecha, 21, { align: 'right' });

    const filas: [string, string][] = [];
    if (esFactura) {
      filas.push(['Nº de factura', datos.numeroFactura as string]);
    }
    filas.push(['Fecha', this.fecha(datos.fecha)], ['Pedido', datos.pedido]);

    let y = 30;
    for (const [etiqueta, valor] of filas) {
      pdf.setFont(fuente, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...SUAVE);
      pdf.text(etiqueta, derecha - 42, y, { align: 'right' });
      pdf.setFont(fuente, 'bold');
      pdf.setTextColor(...TEXTO);
      pdf.text(valor, derecha, y, { align: 'right' });
      y += 5.5;
    }

    // Separador
    pdf.setDrawColor(...BORDE);
    pdf.setLineWidth(0.3);
    pdf.line(MARGEN, 53, derecha, 53);
    return 53;
  }

  private bloquesEmisorCliente(pdf: JsPDF, fuente: string, datos: DatosFactura, y: number): number {
    const ancho = (ANCHO - MARGEN * 2 - 6) / 2;
    const f = DATOS_FISCALES;
    const emisor = datosFiscalesCompletos()
      ? [f.razonSocial, `NIF: ${f.nif}`, f.domicilio, f.localidad, `${f.email} · ${f.telefono}`]
      : [f.nombreComercial, 'Datos fiscales pendientes de completar', `${f.email} · ${f.telefono}`];

    const c = datos.cliente;
    const localidad = [c.codigoPostal, c.ciudad].filter(Boolean).join(' ') + (c.provincia ? ` (${c.provincia})` : '');
    const cliente = [c.nombre, c.direccion, localidad.trim(), [c.telefono, c.email].filter(Boolean).join(' · ')]
      .filter((linea): linea is string => !!linea && linea.trim() !== '');

    const alto = Math.max(this.altoBloque(pdf, emisor, ancho), this.altoBloque(pdf, cliente, ancho));
    this.bloque(pdf, fuente, 'VENDEDOR', emisor, MARGEN, y, ancho, alto);
    this.bloque(pdf, fuente, 'CLIENTE', cliente, MARGEN + ancho + 6, y, ancho, alto);
    return y + alto;
  }

  private altoBloque(pdf: JsPDF, lineas: string[], ancho: number): number {
    pdf.setFontSize(9);
    const total = lineas.reduce((n, l) => n + pdf.splitTextToSize(l, ancho - 10).length, 0);
    return 14 + total * 4.6;
  }

  private bloque(pdf: JsPDF, fuente: string, titulo: string, lineas: string[], x: number, y: number, ancho: number, alto: number): void {
    pdf.setFillColor(...CREMA);
    pdf.setDrawColor(...BORDE);
    pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');
    pdf.setFont(fuente, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...GRANATE);
    pdf.text(titulo, x + 5, y + 7, { charSpace: 0.6 });

    let linea = y + 12.5;
    lineas.forEach((texto, indice) => {
      pdf.setFont(fuente, indice === 0 ? 'bold' : 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...(indice === 0 ? TEXTO : SUAVE));
      for (const trozo of pdf.splitTextToSize(texto, ancho - 10)) {
        pdf.text(trozo, x + 5, linea);
        linea += 4.6;
      }
    });
  }

  private tablaLineas(pdf: JsPDF, fuente: string, datos: DatosFactura, envioBase: number, y: number): number {
    const derecha = ANCHO - MARGEN;
    const col = { cantidad: 122, precio: 152, importe: derecha };
    const anchoDescripcion = col.cantidad - MARGEN - 14;

    const encabezado = (posY: number) => {
      pdf.setFillColor(...GRANATE);
      pdf.roundedRect(MARGEN, posY, derecha - MARGEN, 9, 2, 2, 'F');
      pdf.setFont(fuente, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('DESCRIPCIÓN', MARGEN + 4, posY + 5.8);
      pdf.text('CANT.', col.cantidad, posY + 5.8, { align: 'right' });
      pdf.text(datos.preciosConIva ? 'PRECIO' : 'PRECIO S/IVA', col.precio, posY + 5.8, { align: 'right' });
      pdf.text(datos.preciosConIva ? 'IMPORTE' : 'IMPORTE S/IVA', col.importe - 4, posY + 5.8, { align: 'right' });
      return posY + 9;
    };

    y = encabezado(y);
    const filas = [
      ...datos.lineas.map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad, precio: l.precioUnitario })),
      ...(datos.envio > 0 ? [{ descripcion: 'Gastos de envío', cantidad: 1, precio: envioBase }] : []),
    ];

    filas.forEach((fila, indice) => {
      pdf.setFontSize(9);
      const trozos: string[] = pdf.splitTextToSize(fila.descripcion, anchoDescripcion);
      const alto = Math.max(9, 4 + trozos.length * 4.4);

      // Salto de página manteniendo el encabezado de la tabla
      if (y + alto > ALTO - 70) {
        pdf.addPage();
        y = encabezado(MARGEN);
      }

      if (indice % 2 === 1) {
        pdf.setFillColor(...CREMA);
        pdf.rect(MARGEN, y, derecha - MARGEN, alto, 'F');
      }
      pdf.setFont(fuente, 'normal');
      pdf.setTextColor(...TEXTO);
      trozos.forEach((trozo, i) => pdf.text(trozo, MARGEN + 4, y + 5.8 + i * 4.4));
      pdf.text(String(fila.cantidad), col.cantidad, y + 5.8, { align: 'right' });
      pdf.text(this.euros(fila.precio), col.precio, y + 5.8, { align: 'right' });
      pdf.setFont(fuente, 'bold');
      pdf.text(this.euros(fila.precio * fila.cantidad), col.importe - 4, y + 5.8, { align: 'right' });
      y += alto;
    });

    pdf.setDrawColor(...BORDE);
    pdf.line(MARGEN, y, derecha, y);
    return y;
  }

  private totales(pdf: JsPDF, fuente: string, imp: { base: number; cuota: number; total: number }, iva: number, y: number): number {
    const derecha = ANCHO - MARGEN;
    const x = derecha - 78;

    const fila = (etiqueta: string, valor: string, posY: number) => {
      pdf.setFont(fuente, 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...SUAVE);
      pdf.text(etiqueta, x + 4, posY);
      pdf.setTextColor(...TEXTO);
      pdf.text(valor, derecha - 4, posY, { align: 'right' });
    };
    fila('Base imponible', this.euros(imp.base), y + 5);
    fila(`IVA (${iva} %)`, this.euros(imp.cuota), y + 11);

    // Total destacado como en el resumen del carrito
    pdf.setFillColor(...ARENA);
    pdf.roundedRect(x, y + 15, 78, 13, 3, 3, 'F');
    pdf.setFont(fuente, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXTO);
    pdf.text('TOTAL', x + 4, y + 23.2);
    pdf.setFontSize(14);
    pdf.setTextColor(...GRANATE);
    pdf.text(this.euros(imp.total), derecha - 4, y + 23.6, { align: 'right' });
    return y + 28;
  }

  private formaDePago(pdf: JsPDF, fuente: string, datos: DatosFactura, y: number): void {
    pdf.setFont(fuente, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...SUAVE);
    pdf.text(`Forma de pago: ${datos.formaPago || 'tarjeta (Stripe)'} · Cobrado el ${this.fecha(datos.fecha)}`, MARGEN, y);
    pdf.text('Precios en euros. IVA incluido en el total.', MARGEN, y + 4.5);
  }

  private piePagina(pdf: JsPDF, fuente: string, esFactura: boolean): void {
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      const y = ALTO - 22;
      pdf.setDrawColor(...BORDE);
      pdf.line(MARGEN, y, ANCHO - MARGEN, y);

      pdf.setFont(fuente, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...GRANATE);
      pdf.text('¡Gracias por tu compra!', MARGEN, y + 6);
      pdf.setFont(fuente, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...SUAVE);
      pdf.text(`¿Dudas con tu pedido? ${DATOS_FISCALES.email} · WhatsApp ${DATOS_FISCALES.telefono}`, MARGEN, y + 10.5);
      pdf.text(
        esFactura
          ? 'Factura simplificada (art. 4 del Real Decreto 1619/2012).'
          : 'Justificante de compra sin validez fiscal: datos fiscales del vendedor pendientes de completar.',
        MARGEN, y + 14.5
      );
      pdf.text(`Página ${p} de ${paginas}`, ANCHO - MARGEN, y + 14.5, { align: 'right' });

      pdf.setFillColor(...GRANATE);
      pdf.rect(0, ALTO - 3, ANCHO, 3, 'F');
    }
  }

  // ---------- Utilidades ----------

  private euros(valor: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(valor) || 0)
      .replace(/ /g, ' ');
  }

  private fecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha);
  }

  /** Descarga una vez la tipografía de la web (Montserrat) y el logo transparente */
  private async cargarRecursos(): Promise<void> {
    if (this.fuentes && this.logo) {
      return;
    }
    const [normal, negrita, logo] = await Promise.all([
      this.descargarBase64('fonts/Montserrat-Regular.ttf'),
      this.descargarBase64('fonts/Montserrat-Bold.ttf'),
      this.descargarBase64('img/logo-factura.png'),
    ]);
    this.fuentes = normal && negrita ? { normal, negrita } : null;
    this.logo = logo ? `data:image/png;base64,${logo}` : null;
  }

  /** Registra Montserrat en el documento; si no se pudo descargar, usa Helvetica */
  private registrarFuentes(pdf: JsPDF): string {
    if (!this.fuentes) {
      return 'helvetica';
    }
    pdf.addFileToVFS('Montserrat-Regular.ttf', this.fuentes.normal);
    pdf.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
    pdf.addFileToVFS('Montserrat-Bold.ttf', this.fuentes.negrita);
    pdf.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
    return 'Montserrat';
  }

  private async descargarBase64(ruta: string): Promise<string | null> {
    try {
      const respuesta = await fetch(ruta);
      if (!respuesta.ok) {
        return null;
      }
      const bytes = new Uint8Array(await respuesta.arrayBuffer());
      let binario = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binario);
    } catch {
      return null;
    }
  }
}
