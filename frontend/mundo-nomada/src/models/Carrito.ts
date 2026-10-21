import { Producto } from "./Producto";

export class Carrito {
  id: number;
  user_id: number;
  producto_id: number;
  cantidad: number;
  producto?: Producto; // Propiedad opcional
  /** Talla elegida (null en carritos de invitado guardados antes de existir las tallas) */
  variante_id: number | null;
  talla: string | null;

  constructor(
    id: number,
    user_id: number,
    producto_id: number,
    cantidad: number = 1,
    producto?: Producto,
    variante_id: number | null = null,
    talla: string | null = null
  ) {
    this.id = id;
    this.user_id = user_id;
    this.producto_id = producto_id;
    this.cantidad = cantidad;
    this.producto = producto;
    this.variante_id = variante_id;
    this.talla = talla;
  }
}
