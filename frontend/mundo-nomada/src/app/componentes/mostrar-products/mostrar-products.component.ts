import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Producto } from '../../../models/Producto';
import { tallaVisible } from '../../../models/Variante';
import { ProductosService } from '../../services/productos.service';
import { CarritoService } from '../../services/carrito.service';
import { AuthService } from '../../services/auth.service';
import { Carrito } from '../../../models/Carrito';
import { User } from '../../../models/Users';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mostrar-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mostrar-products.component.html',
  styleUrls: ['./mostrar-products.component.css']
})
export class MostrarProductsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  products: Producto[] = [];
  filterName: string = '';
  filterCategory: number | null = null;
  loading: boolean = false;
  error: string = '';
  currentUser: User | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  sortOption: string = 'relevance';

  // Propiedad para notificaciones: type puede ser 'success', 'warning', 'danger', etc.
  notification: { message: string; type: string } | null = null;

  constructor(
    private productosService: ProductosService,
    private carritoService: CarritoService,
    private authService: AuthService, 
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['categoriaID']) {
        this.filterCategory = +params['categoriaID'];
        console.log('Filtrando por categoría:', this.filterCategory);
      } else {
        this.filterCategory = null;
      }
      this.loadProducts();
    });

    this.authService.getCurrentUserObservable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.currentPage = 1; // Reiniciar la página al cargar nuevos productos
    if (this.filterCategory !== null) {
      this.productosService.getProductsByCategory(this.filterCategory).subscribe({
        next: (data) => {
          this.products = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error en getProductsByCategory:', err);
          this.error = 'Ocurrió un error al cargar los productos filtrados por categoría';
          this.loading = false;
        }
      });
    } else {
      this.productosService.recuperarTodos().subscribe({
        next: (data) => {
          this.products = data;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.error = 'Ocurrió un error al cargar los productos';
          this.loading = false;
        }
      });
    }
  }

  // Método para ver el detalle del producto al hacer clic en la tarjeta
  verDetalleProducto(producto: Producto): void {
    this.router.navigate(['/producto', producto.ProductoID]);
  }

  /** Tallas con stock, para la tarjeta: "S · M · L" (vacío si es talla única) */
  tallasDisponibles(producto: Producto): string {
    const tallas = (producto.variantes || []).filter((v) => v.stock > 0).map((v) => tallaVisible(v.talla)).filter(Boolean);
    return tallas.join(' · ');
  }

  private avisar(message: string, type: string): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 2000);
  }

  // Añadir desde la tarjeta: directo si solo hay una talla; si hay varias, se elige en la ficha
  addToCart(event: Event, producto: Producto): void {
    event.stopPropagation();
    const variantes = producto.variantes || [];
    if (producto.stock <= 0) {
      this.avisar('El producto no tiene stock disponible.', 'warning');
      return;
    }
    if (variantes.length !== 1) {
      this.router.navigate(['/producto', producto.ProductoID]);
      return;
    }

    const variante = variantes[0];
    const userId = this.currentUser ? this.currentUser.id : 0;
    this.carritoService.getCart(userId).subscribe((cartItems: Carrito[]) => {
      const enCarrito = cartItems.find((item) => item.variante_id === variante.id)?.cantidad ?? 0;
      if (enCarrito >= variante.stock) {
        this.avisar('No quedan más unidades disponibles para este producto.', 'warning');
        return;
      }
      const linea = new Carrito(0, userId, producto.ProductoID, 1, producto, variante.id ?? null, variante.talla);
      this.carritoService.addToCart(linea).subscribe({
        next: () => this.avisar('Producto añadido al carrito', 'success'),
        error: (err) => {
          console.error(err);
          this.avisar(err?.mensaje || err?.error?.mensaje || 'Ocurrió un error al añadir el producto al carrito', 'danger');
        }
      });
    });
  }

  // Getter para devolver los productos filtrados por nombre
  get filteredProducts(): Producto[] {
    if (!this.filterName) {
      return this.products;
    }
    return this.products.filter(producto =>
      producto.nombre.toLowerCase().includes(this.filterName.toLowerCase())
    );
  }

  // Métodos para la ordenación de productos
  sortProducts(option: string): void {
    this.sortOption = option;
    this.currentPage = 1; // Volver a la primera página cuando se ordena
    
    let sortedProducts = [...this.products];
    
    switch(option) {
      case 'price-asc':
        sortedProducts.sort((a, b) => a.precio - b.precio);
        break;
      case 'price-desc':
        sortedProducts.sort((a, b) => b.precio - a.precio);
        break;
      case 'newest':
        // Ordenar por ID asumiendo que IDs más altos son productos más recientes
        sortedProducts.sort((a, b) => b.ProductoID - a.ProductoID);
        break;
      case 'relevance':
      default:
        // Por defecto, no hacemos ordenación especial
        break;
    }
    
    this.products = sortedProducts;
  }

  // Métodos para la paginación
  goToPage(page: number): void {
    if (page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      
      // Desplazar al inicio de la sección de productos de manera segura
      const productGrid = document.querySelector('.product-grid');
      if (productGrid) {
        window.scrollTo({
          top: productGrid.getBoundingClientRect().top + window.scrollY - 100,
          behavior: 'smooth'
        });
      }
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  get paginatedProducts(): Producto[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Método para limpiar filtros
  clearFilters(): void {
    this.filterName = '';
    this.filterCategory = null;
    this.sortOption = 'relevance';
    this.currentPage = 1;
    this.loadProducts();
  }
}