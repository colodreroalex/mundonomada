/**
 * Prepara una foto de producto antes de enviarla al servidor: la reduce a un
 * máximo de 1200 px por lado y la convierte a WebP (o JPEG si el navegador no
 * sabe generar WebP). Así una foto del móvil de 4 MB queda en unos 150-300 KB,
 * por debajo del límite del servidor (1,5 MB) y más rápida de cargar.
 */
const LADO_MAXIMO = 1200;
const TAMANO_MAXIMO = 1.5 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function prepararImagenProducto(archivo: File): Promise<string> {
  if (!TIPOS.includes(archivo.type)) {
    throw new Error('Usa una foto JPG, PNG o WebP.');
  }

  const imagen = await cargarImagen(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.naturalWidth, imagen.naturalHeight));
  const ancho = Math.round(imagen.naturalWidth * escala);
  const alto = Math.round(imagen.naturalHeight * escala);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo procesar la foto.');
  }
  // Fondo blanco por si la imagen tiene transparencia (JPEG no la admite)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(imagen, 0, 0, ancho, alto);

  let resultado = lienzo.toDataURL('image/webp', 0.82);
  if (!resultado.startsWith('data:image/webp')) {
    resultado = lienzo.toDataURL('image/jpeg', 0.85);
  }
  // Base64 ocupa ~4/3 del tamaño real
  if ((resultado.length * 3) / 4 > TAMANO_MAXIMO) {
    throw new Error('La foto sigue siendo demasiado grande. Prueba con otra.');
  }
  return resultado;
}

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No se pudo leer la foto.'));
    };
    imagen.src = url;
  });
}
