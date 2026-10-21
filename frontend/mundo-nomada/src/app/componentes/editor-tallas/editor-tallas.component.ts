import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Variante } from '../../../models/Variante';

/**
 * Tabla de tallas de un producto para administración: cada fila es una talla
 * con su stock. Modifica directamente la lista que recibe.
 */
@Component({
  selector: 'app-editor-tallas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-tallas.component.html',
  styleUrls: ['./editor-tallas.component.css'],
})
export class EditorTallasComponent {
  @Input({ required: true }) variantes: Variante[] = [];
  /** Prefijo para que los id de los campos no se repitan si hay dos editores */
  @Input() prefijo = 'talla';

  readonly sugerencias = ['Única', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44'];
  readonly conjuntos: { etiqueta: string; tallas: string[] }[] = [
    { etiqueta: 'S – XL', tallas: ['S', 'M', 'L', 'XL'] },
    { etiqueta: 'XS – XXL', tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { etiqueta: '36 – 44', tallas: ['36', '38', '40', '42', '44'] },
  ];

  get stockTotal(): number {
    return this.variantes.reduce((total, v) => total + (Number(v.stock) || 0), 0);
  }

  anadir(): void {
    this.variantes.push({ id: null, talla: '', stock: 0 });
  }

  quitar(indice: number): void {
    this.variantes.splice(indice, 1);
  }

  mover(indice: number, desplazamiento: number): void {
    const destino = indice + desplazamiento;
    if (destino < 0 || destino >= this.variantes.length) return;
    const [fila] = this.variantes.splice(indice, 1);
    this.variantes.splice(destino, 0, fila);
  }

  /**
   * Añade las tallas del conjunto que falten, conservando las que ya existen
   * (y su stock). Las filas vacías se descartan.
   */
  usarConjunto(tallas: string[]): void {
    if (tallas.length === 1 && tallas[0] === 'Única') {
      this.ponerTallaUnica();
      return;
    }
    // Al pasar de talla única a tallas, la fila "Única" sobra
    const actuales = this.variantes.filter((v) => v.talla.trim() !== '' && !this.esUnica(v.talla));
    const nuevas = tallas
      .filter((t) => !actuales.some((v) => v.talla.trim().toLowerCase() === t.toLowerCase()))
      .map((t) => ({ id: null, talla: t, stock: 0 }));
    this.variantes.splice(0, this.variantes.length, ...actuales, ...nuevas);
  }

  get esTallaUnica(): boolean {
    return this.variantes.length === 1 && this.esUnica(this.variantes[0].talla);
  }

  private esUnica(talla: string): boolean {
    return ['única', 'unica'].includes((talla ?? '').trim().toLowerCase());
  }

  /**
   * Deja el producto con una sola fila "Única" (bolsos, bisutería, complementos...).
   * Conserva la fila "Única" que ya hubiera; si no, empieza con el stock de la única
   * talla existente o con 0.
   */
  ponerTallaUnica(): void {
    const existente = this.variantes.find((v) => this.esUnica(v.talla));
    const stock = existente?.stock ?? (this.variantes.length === 1 ? Number(this.variantes[0].stock) || 0 : 0);
    this.variantes.splice(0, this.variantes.length, { id: existente?.id ?? null, talla: 'Única', stock });
  }

  /** Vuelve a tallas normales empezando por S–XL (se quita la fila "Única"). */
  ponerConTallas(): void {
    if (!this.esTallaUnica) return;
    this.variantes.splice(0, this.variantes.length, ...['S', 'M', 'L', 'XL'].map((talla) => ({ id: null, talla, stock: 0 })));
  }

  /** Mensaje de error de la lista, o null si es válida. */
  static validar(variantes: Variante[]): string | null {
    if (variantes.length === 0) return 'Añade al menos una talla (usa "Única" si el producto no tiene tallas).';
    const vistas = new Set<string>();
    for (const v of variantes) {
      const talla = (v.talla ?? '').trim();
      if (talla === '' || talla.length > 10) return 'Cada talla necesita un nombre de hasta 10 caracteres.';
      const stock = Number(v.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return `El stock de la talla ${talla} debe ser un número entero entre 0 y 100.000.`;
      if (vistas.has(talla.toLowerCase())) return `La talla ${talla} está repetida.`;
      vistas.add(talla.toLowerCase());
    }
    return null;
  }

  /** Copia limpia para enviar al servidor, en el orden de la tabla. */
  static paraEnviar(variantes: Variante[]): Variante[] {
    return variantes.map((v) => ({ id: v.id ?? null, talla: v.talla.trim(), stock: Number(v.stock) }));
  }
}
