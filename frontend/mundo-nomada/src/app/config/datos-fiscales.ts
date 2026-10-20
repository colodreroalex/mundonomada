/**
 * Datos del vendedor que aparecen en las facturas.
 *
 * PENDIENTE (Paso 8 de docs/GUIA_DEL_PROPIETARIO.md): rellenar con los datos
 * reales del titular. Mientras falten la razón social, el NIF o el domicilio,
 * el PDF se emite como "Justificante de compra" sin validez fiscal en lugar de
 * como factura, para no emitir nunca una factura con datos inventados.
 */
export const DATOS_FISCALES = {
  /** Nombre y apellidos (autónomo) o razón social (sociedad), tal como figura en Hacienda */
  razonSocial: '',
  /** Nombre comercial que se muestra junto al logo */
  nombreComercial: 'Mundo Nómada',
  /** NIF o CIF */
  nif: '',
  /** Domicilio fiscal: calle y número */
  domicilio: '',
  /** Código postal, localidad y provincia */
  localidad: '',
  email: 'mundonomadabaena@gmail.com',
  telefono: '651 881 011',
  /** Tipo de IVA general aplicado a los productos y al envío */
  tipoIva: 21,
};

export function datosFiscalesCompletos(): boolean {
  const d = DATOS_FISCALES;
  return [d.razonSocial, d.nif, d.domicilio, d.localidad].every((valor) => valor.trim() !== '');
}
