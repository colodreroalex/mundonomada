/**
 * Resumen y gráfica de Admin → Pedidos. Solo usa los pedidos que la pantalla
 * ya ha cargado (con el filtro de estado activo): no pide nada a la API.
 */

export interface ResumenPedidos {
  pedidos: number;
  /** Suma de los pedidos no cancelados */
  importe: number;
  ticketMedio: number;
  cancelados: number;
}

/** Un punto de la gráfica: un día o una semana. */
export interface TramoGrafica {
  inicio: Date;
  importe: number;
  pedidos: number;
  x: number;
  y: number;
}

export interface Grafica {
  tramos: TramoGrafica[];
  linea: string;
  area: string;
  maximo: number;
  porSemana: boolean;
  desde: Date;
  hasta: Date;
}

interface PedidoConImporte {
  fecha: string;
  total: number;
  estado: string;
}

const DIA = 86_400_000;

export function resumirPedidos(pedidos: PedidoConImporte[]): ResumenPedidos {
  const validos = pedidos.filter((p) => p.estado !== 'cancelado');
  const importe = validos.reduce((suma, p) => suma + (Number(p.total) || 0), 0);
  return {
    pedidos: pedidos.length,
    importe,
    ticketMedio: validos.length ? importe / validos.length : 0,
    cancelados: pedidos.length - validos.length,
  };
}

/**
 * Importe por día de los últimos 30 días. Si hay menos de 8 días con ventas,
 * importe por semana de las últimas 8 semanas. Devuelve null si no hay al
 * menos dos tramos con importe (no se puede dibujar una curva).
 */
export function construirGrafica(pedidos: PedidoConImporte[], ancho: number, alto: number, hoy = new Date()): Grafica | null {
  const finDia = inicioDelDia(hoy);
  const ventas = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .map((p) => ({ dia: inicioDelDia(leerFecha(p.fecha)), total: Number(p.total) || 0 }))
    .filter((v) => !isNaN(v.dia.getTime()));

  const diasConVentas = new Set(
    ventas.filter((v) => diasEntre(v.dia, finDia) < 30 && v.dia <= finDia).map((v) => v.dia.getTime())
  ).size;
  const porSemana = diasConVentas < 8;
  const paso = porSemana ? 7 : 1;
  const cantidad = porSemana ? 8 : 30;

  const primero = new Date(finDia);
  primero.setDate(finDia.getDate() - (cantidad * paso - 1));

  const tramos = Array.from({ length: cantidad }, (_, i) => {
    const inicio = new Date(primero);
    inicio.setDate(primero.getDate() + i * paso);
    return { inicio, importe: 0, pedidos: 0 };
  });

  for (const venta of ventas) {
    const dias = diasEntre(primero, venta.dia);
    if (dias < 0 || dias >= cantidad * paso) {
      continue;
    }
    const tramo = tramos[Math.floor(dias / paso)];
    tramo.importe += venta.total;
    tramo.pedidos++;
  }

  if (tramos.filter((t) => t.importe > 0).length < 2) {
    return null;
  }

  const maximo = escalaRedonda(Math.max(...tramos.map((t) => t.importe)) * 1.08);
  const puntos: TramoGrafica[] = tramos.map((t, i) => ({
    ...t,
    x: redondear((i * ancho) / (cantidad - 1)),
    y: redondear(alto - (t.importe / maximo) * alto),
  }));
  const linea = curvaMonotona(puntos);

  return {
    tramos: puntos,
    linea,
    area: `${linea} L${ancho},${alto} L0,${alto} Z`,
    maximo,
    porSemana,
    desde: tramos[0].inicio,
    hasta: finDia,
  };
}

/**
 * Curva suave que pasa por todos los puntos sin oscilar (monótona en X,
 * método de Fritsch-Carlson): nunca baja de cero entre dos días sin ventas.
 */
export function curvaMonotona(p: { x: number; y: number }[]): string {
  const n = p.length;
  if (n < 2) {
    return '';
  }
  const dx: number[] = [];
  const pendiente: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x;
    pendiente[i] = (p[i + 1].y - p[i].y) / dx[i];
  }

  const t: number[] = new Array(n);
  t[0] = pendiente[0];
  t[n - 1] = pendiente[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = pendiente[i - 1] * pendiente[i] <= 0 ? 0 : (pendiente[i - 1] + pendiente[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (pendiente[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / pendiente[i];
    const b = t[i + 1] / pendiente[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * pendiente[i];
      t[i + 1] = k * b * pendiente[i];
    }
  }

  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${redondear(p[i].x + h)},${redondear(p[i].y + h * t[i])} ${redondear(p[i + 1].x - h)},${redondear(p[i + 1].y - h * t[i + 1])} ${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
}

/**
 * Las fechas llegan de PostgreSQL como "2026-10-20 12:34:56.123456+00", que
 * Safari no entiende: se pasan a ISO ("2026-10-20T12:34:56.123+00:00").
 */
export function leerFecha(texto: string): Date {
  const iso = String(texto ?? '')
    .trim()
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1')
    .replace(/([+-]\d{2})$/, '$1:00');
  return new Date(iso);
}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Días naturales entre dos inicios de día (redondeo por los cambios de hora). */
function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA);
}

/** Techo "redondo" para el eje (p. ej. 702 → 800), sin dejar mucho hueco arriba. */
function escalaRedonda(valor: number): number {
  const potencia = Math.pow(10, Math.floor(Math.log10(valor)));
  const m = valor / potencia;
  const bonito = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((paso) => m <= paso) ?? 10;
  return bonito * potencia;
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}
