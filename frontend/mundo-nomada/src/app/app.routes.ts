import { Routes } from '@angular/router';
import { MostrarProductsComponent } from './componentes/mostrar-products/mostrar-products.component';
import { MainComponent } from './componentes/main/main.component';
import { LoginComponent } from './componentes/login/login.component';
import { RegisterComponent } from './componentes/register/register.component';
import { AuthGuard } from './services/auth.guard';
import { CarritoComponent } from './componentes/carrito/carrito.component';
import { DetalleProductoComponent } from './componentes/detalle-producto/detalle-producto.component';

// Las páginas que visita casi todo el mundo se cargan al inicio. El resto
// (administración, cuenta, checkout y páginas legales) se descarga solo
// cuando se abre, para que la tienda cargue más rápido en el móvil.
export const routes: Routes = [
 {path: 'addProduct', loadComponent: () => import('./componentes/add-product/add-product.component').then(m => m.AddProductComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'addCategoria', loadComponent: () => import('./componentes/add-categorias/add-categorias.component').then(m => m.AddCategoriaComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'mostrarProductos', component: MostrarProductsComponent},
 { path: 'mostrarProductos/:categoriaID', component: MostrarProductsComponent },
 {path: 'contacto', loadComponent: () => import('./componentes/contacto/contacto.component').then(m => m.ContactoComponent)},
 {path: 'adminPanel', loadComponent: () => import('./componentes/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'adminPedidos', loadComponent: () => import('./componentes/admin-pedidos/admin-pedidos.component').then(m => m.AdminPedidosComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'main', component: MainComponent},
 {path: 'deleteProduct', loadComponent: () => import('./componentes/delete-product/delete-product.component').then(m => m.DeleteProductComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'deleteCategoria', loadComponent: () => import('./componentes/delete-categoria/delete-categoria.component').then(m => m.DeleteCategoriaComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'modificarProduct', loadComponent: () => import('./componentes/modificar-product/modificar-product.component').then(m => m.ModificarProductComponent), canActivate: [AuthGuard], data: { role: 'admin' }},
 {path: 'checkout', loadComponent: () => import('./componentes/checkout/checkout.component').then(m => m.CheckoutComponent)},
 { path: 'login', component: LoginComponent },
 { path: 'register', component: RegisterComponent },
 {path:'carrito', component: CarritoComponent},
 { path: 'producto/:id', component: DetalleProductoComponent },
 { path: 'perfil', loadComponent: () => import('./componentes/perfil-usuario/perfil-usuario.component').then(m => m.PerfilUsuarioComponent), canActivate: [AuthGuard] },

 // Rutas para la gestión de usuarios (solo para administradores)
 { path: 'lista-usuarios', loadComponent: () => import('./componentes/usuarios/lista-usuarios/lista-usuarios.component').then(m => m.ListaUsuariosComponent), canActivate: [AuthGuard], data: { role: 'admin' } },
 { path: 'crear-usuario', loadComponent: () => import('./componentes/usuarios/crear-usuario/crear-usuario.component').then(m => m.CrearUsuarioComponent), canActivate: [AuthGuard], data: { role: 'admin' } },
 { path: 'editar-usuario/:id', loadComponent: () => import('./componentes/usuarios/editar-usuario/editar-usuario.component').then(m => m.EditarUsuarioComponent), canActivate: [AuthGuard], data: { role: 'admin' } },
 { path: 'eliminar-usuario/:id', loadComponent: () => import('./componentes/usuarios/eliminar-usuario/eliminar-usuario.component').then(m => m.EliminarUsuarioComponent), canActivate: [AuthGuard], data: { role: 'admin' } },

 // Rutas para las páginas del footer
 { path: 'conocenos', loadComponent: () => import('./pages/footer-pages/conocenos/conocenos.component').then(m => m.ConocenosComponent) },
 { path: 'nuestras-tiendas', loadComponent: () => import('./pages/footer-pages/nuestras-tiendas/nuestras-tiendas.component').then(m => m.NuestrasTiendasComponent) },
 { path: 'trabaja-con-nosotros', loadComponent: () => import('./pages/footer-pages/trabaja-con-nosotros/trabaja-con-nosotros.component').then(m => m.TrabajaConNosotrosComponent) },
 { path: 'preguntas-frecuentes', loadComponent: () => import('./pages/footer-pages/preguntas-frecuentes/preguntas-frecuentes.component').then(m => m.PreguntasFrecuentesComponent) },
 { path: 'condiciones-compra', loadComponent: () => import('./pages/footer-pages/condiciones-compra/condiciones-compra.component').then(m => m.CondicionesCompraComponent) },
 { path: 'politica-devolucion', loadComponent: () => import('./pages/footer-pages/politica-devolucion/politica-devolucion.component').then(m => m.PoliticaDevolucionComponent) },
 { path: 'aviso-legal', loadComponent: () => import('./pages/footer-pages/aviso-legal/aviso-legal.component').then(m => m.AvisoLegalComponent) },
 { path: 'politica-privacidad', loadComponent: () => import('./pages/footer-pages/politica-privacidad/politica-privacidad.component').then(m => m.PoliticaPrivacidadComponent) },
 { path: 'terminos-servicio', loadComponent: () => import('./pages/footer-pages/terminos-servicio/terminos-servicio.component').then(m => m.TerminosServicioComponent) },
 { path: 'politica-cookies', loadComponent: () => import('./pages/footer-pages/politica-cookies/politica-cookies.component').then(m => m.PoliticaCookiesComponent) },
 { path: 'consentimiento-cookies', loadComponent: () => import('./pages/footer-pages/consentimiento-cookies/consentimiento-cookies.component').then(m => m.ConsentimientoCookiesComponent) },
 {path: '', redirectTo: 'main', pathMatch: 'full'},
 {path: '**', redirectTo: 'main', pathMatch: 'full'},
];
