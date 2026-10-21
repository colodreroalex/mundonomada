/** Una talla de un producto con su propio stock. */
export interface Variante {
  id?: number | null;
  talla: string;
  stock: number;
}

/** Talla para mostrar junto al nombre, o null si el producto es de talla única. */
export function tallaVisible(talla?: string | null): string | null {
  const t = (talla ?? '').trim();
  return t === '' || t.toLowerCase() === 'única' || t.toLowerCase() === 'unica' ? null : t;
}
