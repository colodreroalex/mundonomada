import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../../models/Producto';
import { ProductosService } from '../../services/productos.service';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { EditorTallasComponent } from '../editor-tallas/editor-tallas.component';
import { prepararImagenProducto } from '../../services/imagen-producto';

@Component({
  selector: 'app-modificar-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EditorTallasComponent],
  templateUrl: './modificar-product.component.html',
  styleUrls: ['./modificar-product.component.css']
})
export class ModificarProductComponent {
  productos: Producto[] = [];
  productoSeleccionado: Producto | null = null;
  // Propiedad para notificaciones: type puede ser 'success', 'warning', 'danger', etc.
  notification: { message: string; type: string } | null = null;
  procesandoFoto = false;

  constructor(private productosService: ProductosService) {
    this.recuperarTodos();
  }

  // Recupera todos los productos desde la BBDD
  recuperarTodos() {
    this.productosService.recuperarTodos().subscribe((productos: Producto[]) => {
      this.productos = productos;
    });
  }

  /** "S · M · L" para la lista de productos */
  resumenTallas(producto: Producto): string {
    return (producto.variantes || []).map((v) => v.talla).join(' · ') || 'Sin tallas';
  }

  // Selecciona un producto y lo carga en el formulario
  // En móvil el formulario queda debajo de la lista: se lleva la vista hasta él
  irAlFormulario(): void {
    if (window.innerWidth < 992) {
      setTimeout(() => document.getElementById('editar-producto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  seleccionarProducto(producto: Producto) {
    this.productosService.seleccionar(producto).subscribe((result: any) => {
      if (result && result.length > 0) {
        const p = result[0];
        // Copia de las tallas para poder editarlas sin tocar la lista
        this.productoSeleccionado = { ...p, variantes: (p.variantes || []).map((v: any) => ({ ...v })) };
      } else {
        this.notification = { message: 'Producto no encontrado', type: 'warning' };
        setTimeout(() => this.notification = null, 2000);
      }
    });
  }

  /** Sustituye la foto del producto (se guarda al pulsar Modificar) */
  async cambiarFoto(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo || !this.productoSeleccionado) return;
    this.procesandoFoto = true;
    try {
      this.productoSeleccionado.imagen = await prepararImagenProducto(archivo);
    } catch (error) {
      this.notification = { message: (error as Error).message, type: 'warning' };
    } finally {
      this.procesandoFoto = false;
    }
  }

  // Método para modificar el producto seleccionado
  modificarProducto(form: NgForm) {
    if (!this.productoSeleccionado) {
      this.notification = { message: 'No hay ningún producto seleccionado.', type: 'warning' };
      return;
    }

    if (this.procesandoFoto) {
      this.notification = { message: 'Espera a que termine de prepararse la foto.', type: 'warning' };
      return;
    }

    if (form.invalid) {
      this.notification = { message: 'Todos los campos son obligatorios y no pueden quedar vacíos.', type: 'warning' };
      return;
    }

    if (this.productoSeleccionado.precio <= 0) {
      this.notification = { message: 'El precio debe ser mayor que 0.', type: 'warning' };
      return;
    }

    const errorTallas = EditorTallasComponent.validar(this.productoSeleccionado.variantes);
    if (errorTallas) {
      this.notification = { message: errorTallas, type: 'warning' };
      return;
    }

    const productoModificado: Producto = {
      ...this.productoSeleccionado,
      color: this.productoSeleccionado.color || null,
      variantes: EditorTallasComponent.paraEnviar(this.productoSeleccionado.variantes)
    };

    this.productosService.modificarProducto(productoModificado).subscribe({
      next: (response: any) => {
        if (response.resultado === 'OK') {
          this.notification = { message: 'Producto modificado correctamente', type: 'success' };
          this.recuperarTodos(); // Actualizamos la lista de productos
          this.productoSeleccionado = null; // Limpiar la selección después de modificar
        } else {
          console.error('Error al modificar:', response);
          this.notification = { message: 'Error al modificar el producto: ' + (response.mensaje || 'Error desconocido'), type: 'danger' };
        }
      },
      error: (error) => {
        console.error('Error en la comunicación:', error);
        let errorMessage = 'Error en la comunicación con el servidor';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error.error && error.error.mensaje) {
          errorMessage = error.error.mensaje;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        this.notification = { message: errorMessage, type: 'danger' };
      }
    });
  }
}
