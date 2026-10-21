import { Variante } from './Variante';

export class Producto {
    ProductoID: number;
    nombre: string;
    precio: number;
    descripcion: string;
    /** Stock total: suma de todas sus tallas (en el carrito, el de la talla elegida). */
    stock: number;
    categoriaID: number;
    imagen: string;
    color: string | null;
    variantes: Variante[];

    constructor(
        productoID: number,
        nombre: string,
        precio: number,
        descripcion: string,
        stock: number,
        categoriaID: number,
        imagen: string,
        color: string | null = null,
        variantes: Variante[] = []
    ) {
        this.ProductoID = productoID;
        this.nombre = nombre;
        this.precio = precio;
        this.descripcion = descripcion;
        this.stock = stock;
        this.categoriaID = categoriaID;
        this.imagen = imagen;
        this.color = color;
        this.variantes = variantes;
    }
}
