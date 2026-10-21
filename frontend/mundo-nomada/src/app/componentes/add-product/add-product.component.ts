import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Producto } from '../../../models/Producto';
import { ProductosService } from '../../services/productos.service';
import { Categoria } from '../../../models/Categoria';
import { CategoriasService } from '../../services/categorias.service';
import { EditorTallasComponent } from '../editor-tallas/editor-tallas.component';
import { Variante } from '../../../models/Variante';
import { prepararImagenProducto } from '../../services/imagen-producto';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EditorTallasComponent],
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css'],
})
export class AddProductComponent implements OnInit {
  prod: Producto = new Producto(0, '', 0, '', 0, 0, '', '');
  // Se empieza con las tallas más habituales; se pueden cambiar o dejar "Única"
  variantes: Variante[] = ['S', 'M', 'L', 'XL'].map((talla) => ({ id: null, talla, stock: 0 }));
  categorias: Categoria[] = [];
  notification: { message: string; type: string } | null = null;
  imagenBase64: string = '';

  constructor(
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();
  }

  procesandoFoto = false;

  // La foto se reduce en el navegador antes de enviarla (ver imagen-producto.ts)
  async onFileChange(event: Event) {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.procesandoFoto = true;
    try {
      this.imagenBase64 = await prepararImagenProducto(archivo);
    } catch (error) {
      this.imagenBase64 = '';
      this.notification = { message: (error as Error).message, type: 'warning' };
    } finally {
      this.procesandoFoto = false;
    }
  }

  cargarCategorias() {
    this.categoriasService.getCategorias().subscribe(
      (res: Categoria[]) => {
        this.categorias = res;
      },
      (error) => {
        console.error('Error al cargar categorías:', error);
        this.notification = {
          message: 'Error al cargar las categorías',
          type: 'danger',
        };
      }
    );
  }

  addProduct(form: NgForm) {
    if (this.procesandoFoto) {
      this.notification = { message: 'Espera a que termine de prepararse la foto.', type: 'warning' };
      return;
    }
    if (form.invalid) {
      this.notification = { message: 'Por favor, corrige los errores en el formulario.', type: 'warning' };
      return;
    }
    const errorTallas = EditorTallasComponent.validar(this.variantes);
    if (errorTallas) {
      this.notification = { message: errorTallas, type: 'warning' };
      return;
    }

    const variantes = EditorTallasComponent.paraEnviar(this.variantes);
    const producto: Producto = {
      ProductoID: 0, 
      nombre: form.value.nombre,
      precio: form.value.precio,
      descripcion: form.value.descripcion,
      stock: variantes.reduce((total, v) => total + v.stock, 0),
      categoriaID: form.value.categoriaID,
      imagen: this.imagenBase64,
      color: form.value.color || null,
      variantes
    };
    
    // Verificar si ya existe un producto con el mismo nombre y color
    this.productosService.verificarProductoDuplicado(producto).subscribe(existeDuplicado => {
      if (existeDuplicado) {
        this.notification = { 
          message: 'Ya existe un producto con el mismo nombre y color. Añade las tallas a ese producto en lugar de crear otro.', 
          type: 'danger' 
        };
        return;
      }
      
      // Si no hay duplicados, procedemos a guardar el producto
      this.productosService.addProduct(producto).subscribe({
        next: (response: any) => {
          if (response.resultado === 'OK') {
            this.notification = { message: 'Producto agregado con éxito', type: 'success' };
            // Redirigir a otra página después de un tiempo
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 2000);
          } else {
            this.notification = { message: 'Error al agregar el producto', type: 'danger' };
          }
        },
        error: (error) => {
          console.error('Error al agregar producto:', error);
          this.notification = { message: error?.error?.mensaje || 'Error al agregar el producto', type: 'danger' };
        }
      });
    });
  }
}
