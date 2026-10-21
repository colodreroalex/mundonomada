// Pruebas de seguridad de Mundo Nómada (resultado de la auditoría de docs/seguridad/INFORME-PENTEST.md).
//
// Uso completo (SOLO contra un entorno local o desechable, nunca contra la base de datos real):
//   MN_ADMIN_EMAIL=admin@example.invalid MN_ADMIN_PASSWORD=... MN_WEBHOOK_SECRET=whsec_... \
//   MN_DB_CONTAINER=mn-db node tools/security-test.mjs http://127.0.0.1:8090
// El servidor debe arrancar con MUNDONOMADA_TRUST_PROXY=1 para simular el proxy de Render.
//
// Uso pasivo (cabeceras y archivos expuestos; seguro contra Render):
//   node tools/security-test.mjs https://mundo-nomada-test.onrender.com --pasivo
import { createHmac, randomBytes } from 'node:crypto';
const BASE = (process.argv[2] || '').replace(/\/+$/, '');
if (!BASE) { console.error('Indica la URL base, por ejemplo http://127.0.0.1:8090'); process.exit(2); }
const PASIVO = process.argv.includes('--pasivo');
const API = BASE + '/api_php/';
const ADMIN_EMAIL = process.env.MN_ADMIN_EMAIL || 'admin@example.invalid';
const ADMIN_PASS = process.env.MN_ADMIN_PASSWORD || '';
const WHSEC = process.env.MN_WEBHOOK_SECRET || '';
if (!PASIVO && (!ADMIN_PASS || !WHSEC)) { console.error('Faltan MN_ADMIN_PASSWORD y MN_WEBHOOK_SECRET (o usa --pasivo)'); process.exit(2); }
const out = [];
const log = (id, ok, detalle) => { out.push({ id, ok, detalle }); console.log(`${ok ? 'OK   ' : 'FALLO'} ${id}: ${detalle}`); };

function cliente(ip = '10.' + [0,0,0].map(() => Math.floor(Math.random() * 250) + 1).join('.')) {
  const cookies = new Map();
  const req = async (ruta, { body, method, headers = {}, raw } = {}) => {
    const h = { Origin: BASE, 'X-Forwarded-For': ip, ...headers };
    if (h.Origin === '') delete h.Origin;
    if (cookies.size) h.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json';
    const r = await fetch(ruta.startsWith('http') ? ruta : API + ruta, {
      method: method || (body !== undefined ? 'POST' : 'GET'), headers: h,
      body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)), redirect: 'manual',
    });
    for (const c of r.headers.getSetCookie()) {
      const [n, ...v] = c.split(';')[0].split('='); const val = v.join('=');
      if (val === '' || val === 'deleted' || /Max-Age=0|expires=Thu, 01[- ]Jan[- ]1970/i.test(c)) cookies.delete(n); else cookies.set(n, val);
    }
    const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers, setCookie: r.headers.getSetCookie() };
  };
  return { req, cookies };
}
const email = p => `${p}-${randomBytes(4).toString('hex')}@example.invalid`;
const PASS = 'Prueba-' + randomBytes(8).toString('hex');
let r;

// ---------- Fase 1: exposición ----------
const anon = cliente();
for (const ruta of ['api_php/config/supabase.local.example.php', 'api_php/conexion.php', 'api_php/conexion_postgres.php', 'api_php/hash.php', 'api_php/checkout/stripe.php', 'api_php/auth/seguridad.php', 'api_php/carrito/seguridad_carrito.php', '.git/HEAD', 'Dockerfile', 'stats.json', 'api_php/', 'api_php/config/', 'server-status']) {
  r = await anon.req(BASE + '/' + ruta);
  const expuesto = r.status === 200 && !r.text.includes('<app-root');
  log('F1 exposición /' + ruta, !expuesto, `HTTP ${r.status}${r.text.includes('<app-root') ? ' (SPA)' : ''}`);
}
const home = await anon.req(BASE + '/');
const H = k => home.headers.get(k);
log('F6 Content-Security-Policy', !!H('content-security-policy'), H('content-security-policy') || 'ausente');
const httpsHome = await anon.req(BASE + '/', { headers: { 'X-Forwarded-Proto': 'https' } }); log('F6 Strict-Transport-Security (tras proxy HTTPS)', !!httpsHome.headers.get('strict-transport-security'), httpsHome.headers.get('strict-transport-security') || 'ausente');
log('F6 Permissions-Policy', !!H('permissions-policy'), H('permissions-policy') || 'ausente');
log('F6 X-Frame-Options', !!H('x-frame-options'), H('x-frame-options') || 'ausente');
log('F8 cabecera Server sin versión', !/\d/.test(H('server') || ''), H('server') || '-');
const api = await anon.req('health.php');
log('F8 X-Powered-By', !api.headers.get('x-powered-by'), api.headers.get('x-powered-by') || 'no');
log('F8 API sin caché pública', /no-store|private/.test(api.headers.get('cache-control') || ''), api.headers.get('cache-control') || 'sin Cache-Control');

if (PASIVO) { resumen(); process.exit(out.some(x => !x.ok) ? 1 : 0); }

// ---------- Fase 2: autenticación ----------
const u1 = cliente(), u1mail = email('victima');
r = await u1.req('auth/register.php', { body: { name: 'Víctima', email: u1mail, password: PASS, role: 'admin' } });
log('F2 registro sin escalada de rol', r.json?.role === 'user', `rol=${r.json?.role}`);
log('F2 cookie de sesión HttpOnly+SameSite', r.setCookie.some(c => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)), r.setCookie.join(' | ').slice(0, 120));
r = await cliente().req('auth/register.php', { body: { name: 'x'.repeat(500), email: email('largo'), password: PASS } });
log('F4 nombre de 500 caracteres → 400', r.status === 400, `HTTP ${r.status}`);
r = await cliente().req('auth/register.php', { body: { name: 'corta', email: email('pw'), password: '1234567' } });
log('F2 contraseña <8 rechazada', r.status === 400, `HTTP ${r.status}`);

const tiempo = async (mail) => { const t = performance.now(); await cliente().req('auth/login.php', { body: { email: mail, password: 'mala-' + randomBytes(3).toString('hex') }, headers: { 'X-Forwarded-For': '198.51.100.' + Math.floor(Math.random() * 250) } }); return performance.now() - t; };
let tExiste = 0, tNo = 0; for (let i = 0; i < 3; i++) { tExiste += await tiempo(u1mail); tNo += await tiempo(email('noexiste')); }
log('F2 enumeración por tiempo en login', Math.abs(tExiste - tNo) / 3 < 25, `existe ${(tExiste / 3).toFixed(0)} ms vs no existe ${(tNo / 3).toFixed(0)} ms`);

const vmail = email('bloqueo');
await cliente().req('auth/register.php', { body: { name: 'Bloqueo', email: vmail, password: PASS } });
const atacante = '203.0.113.66'; for (let i = 0; i < 6; i++) await cliente(atacante).req('auth/login.php', { body: { email: vmail, password: 'mala' + i } });
r = await cliente().req('auth/login.php', { body: { email: vmail, password: PASS }, headers: { 'X-Forwarded-For': '192.0.2.77' } });
log('F2 bloqueo de cuenta por terceros (DoS)', r.status === 200, `la víctima, desde otra IP, tras 6 fallos de un atacante: HTTP ${r.status}`);

let bloqueado = false;
for (let i = 0; i < 25; i++) { const x = await cliente('203.0.113.70').req('auth/login.php', { body: { email: email('stuff'), password: 'x' } }); if (x.status === 429) { bloqueado = true; break; } }
log('F2 límite por IP (relleno de credenciales)', bloqueado, bloqueado ? 'bloquea' : '25 emails distintos sin bloqueo');
let regBloq = false;
for (let i = 0; i < 25; i++) { const x = await cliente('203.0.113.71').req('auth/register.php', { body: { name: 'Bot', email: email('bot'), password: PASS } }); if (x.status === 429) { regBloq = true; break; } }
log('F7 límite de registros por IP', regBloq, regBloq ? 'bloquea' : '25 registros seguidos aceptados');

// ---------- Fase 3: autorización ----------
const adm = cliente();
r = await adm.req('auth/login.php', { body: { email: ADMIN_EMAIL, password: ADMIN_PASS }, headers: { 'X-Forwarded-For': '192.0.2.10' } });
log('Setup login admin', r.status === 200, `HTTP ${r.status}`);
const adm2mail = email('admin2'), adm2pass = PASS + 'B';
r = await adm.req('usuarios/add-user.php', { body: { name: 'Admin 2', email: adm2mail, password: adm2pass, role: 'admin' } });
const adm2id = r.json?.user?.id;
const adm2 = cliente(); await adm2.req('auth/login.php', { body: { email: adm2mail, password: adm2pass }, headers: { 'X-Forwarded-For': '192.0.2.11' } });
await adm.req('usuarios/update-user.php', { body: { id: adm2id, name: 'Admin 2', email: adm2mail, role: 'user' } });
r = await adm2.req('usuarios/get-all-users.php');
log('F3 admin degradado pierde permisos al momento', r.status === 403, `tras quitarle el rol: HTTP ${r.status}`);
await adm.req('usuarios/update-user.php', { body: { id: adm2id, name: 'Admin 2', email: adm2mail, role: 'admin' } });
const adm2b = cliente(); await adm2b.req('auth/login.php', { body: { email: adm2mail, password: adm2pass }, headers: { 'X-Forwarded-For': '192.0.2.12' } });
await adm.req('usuarios/delete-user.php', { body: { id: adm2id } });
r = await adm2b.req('usuarios/get-all-users.php');
log('F3 usuario borrado pierde la sesión', r.status === 401 || r.status === 403, `tras borrarlo: HTTP ${r.status}`);
r = await adm.req('usuarios/update-user.php', { body: { id: 1, name: 'Admin Local', email: ADMIN_EMAIL, role: 'admin', password: '1' } });
log('F3 contraseña de 1 carácter puesta por admin', r.status === 400, `HTTP ${r.status}`);
r = await adm.req('usuarios/update-user.php', { body: { id: 1, name: 'Admin Local', email: ADMIN_EMAIL, role: 'admin', password: ['x'] } });
log('F4 tipo inesperado → 400 (no 500)', r.status === 400, `password como array: HTTP ${r.status}`);
await adm.req('usuarios/update-user.php', { body: { id: 1, name: 'Admin Local', email: ADMIN_EMAIL, role: 'admin', password: ADMIN_PASS } });

for (const [ruta, body] of [['usuarios/get-all-users.php'], ['orders/getAllOrders.php'], ['Productos/addProduct.php', {}], ['usuarios/add-user.php', {}], ['orders/updateOrderStatus.php', {}], ['Categorias/deleteCategoria.php', {}]]) {
  const a = await anon.req(ruta, body ? { body } : {}); const u = await u1.req(ruta, body ? { body } : {});
  log('F3 ' + ruta + ' sin admin', a.status === 403 && u.status === 403, `anónimo ${a.status} / usuario ${u.status}`);
}

const disp1 = cliente(), disp2 = cliente(), pmail = email('pwd');
await disp1.req('auth/register.php', { body: { name: 'Pwd', email: pmail, password: PASS } });
await disp2.req('auth/login.php', { body: { email: pmail, password: PASS }, headers: { 'X-Forwarded-For': '192.0.2.13' } });
await disp1.req('auth/changePassword.php', { body: { oldPassword: PASS, newPassword: PASS + 'N' } });
r = await disp2.req('auth/getSession.php');
log('F2 cambiar contraseña cierra otras sesiones', r.status === 401, `otro dispositivo tras el cambio: HTTP ${r.status}`);

r = await u1.req('order_items/getOrderItems.php?order_id=1');
log('F3 IDOR líneas de pedido ajenas', !(r.json?.items?.length), `HTTP ${r.status} items=${r.json?.items?.length ?? 0}`);
r = await u1.req('checkout/getCheckoutStatus.php?session_id=cs_test_' + 'a'.repeat(20));
log('F3 estado de pago ajeno', r.status === 404, `HTTP ${r.status}`);
r = await u1.req('carrito/removeItemFromCart.php', { body: { id: 1 } });
log('F3 IDOR carrito ajeno', r.status === 404, `HTTP ${r.status}`);

// ---------- Fase 4: CSRF y validación ----------
r = await u1.req('auth/updateProfile.php', { body: { name: 'csrf', email: u1mail }, headers: { Origin: 'https://evil.example' } });
log('F4 CSRF origen ajeno', r.status === 403, `HTTP ${r.status}`);
r = await u1.req('auth/updateProfile.php', { body: 'name=x', raw: true, headers: { 'Content-Type': 'text/plain' } });
log('F4 CSRF text/plain', r.status === 415, `HTTP ${r.status}`);
r = await u1.req('auth/updateProfile.php', { body: { name: 'csrf', email: u1mail }, headers: { Origin: '', 'Sec-Fetch-Site': 'cross-site' } });
log('F4 CSRF sin Origin + cross-site', r.status === 403, `HTTP ${r.status}`);
r = await anon.req('Productos/seleccionar.php?ProductoID=1%20or%201=1');
log('F4 inyección SQL en ID', r.status === 400, `HTTP ${r.status}`);
r = await anon.req('Productos/getProductosByCategoria.php?categoriaID=' + encodeURIComponent('1;select pg_sleep(3)'));
log('F4 inyección SQL en categoría', r.status === 400, `HTTP ${r.status}`);
const prodBase = { nombre: 'Prueba seg', precio: 10, descripcion: 'x', categoriaID: 1, variantes: [{ talla: 'M', stock: 1 }] };
for (const [n, extra] of [
  ['precio 0', { precio: 0 }], ['precio enorme', { precio: 1e12 }], ['stock enorme', { variantes: [{ talla: 'M', stock: 2147483648 }] }],
  ['sin tallas', { variantes: [] }], ['talla repetida', { variantes: [{ talla: 'M', stock: 1 }, { talla: 'm', stock: 2 }] }],
  ['talla de 50 caracteres', { variantes: [{ talla: 't'.repeat(50), stock: 1 }] }], ['stock negativo', { variantes: [{ talla: 'S', stock: -1 }] }],
  ['nombre 5000', { nombre: 'n'.repeat(5000) }], ['imagen javascript:', { imagen: 'javascript:alert(1)' }],
  ['imagen SVG', { imagen: 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64') }],
]) {
  r = await adm.req('Productos/addProduct.php', { body: { ...prodBase, ...extra, nombre: (extra.nombre || prodBase.nombre) + ' ' + randomBytes(2).toString('hex') } });
  log('F4 producto con ' + n + ' rechazado', r.status === 400 || r.status === 413, `HTTP ${r.status}`);
}
r = await anon.req('auth/login.php', { body: '{"email":', raw: true });
log('F4 JSON roto sin filtrar errores', r.status < 500 && !/Fatal|Warning|Stack|\.php/.test(r.text), `HTTP ${r.status} ${r.text.slice(0, 60)}`);

// ---------- Fase 5: webhook ----------
const firmar = (payload, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', WHSEC).update(`${t}.${payload}`).digest('hex')}`;
const p = JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed', data: { object: { object: 'checkout.session', id: 'cs_test_x', payment_status: 'paid' } } });
const wh = (payload, firma) => fetch(API + 'checkout/webhook.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': firma }, body: payload }).then(x => x.status);
log('F5 webhook firma falsa', await wh(p, 't=1,v1=00') === 400, 'rechazado');
log('F5 webhook firma antigua (replay)', await wh(p, firmar(p, Math.floor(Date.now() / 1000) - 3600)) === 400, 'rechazado');
log('F5 webhook payload alterado', await wh(p + ' ', firmar(p)) === 400, 'rechazado');
log('F5 webhook firma válida aceptada', await wh(p, firmar(p)) === 200, 'aceptado');


// ---------- Fase 5b: lógica de pedidos con la base de datos local ----------
if (process.env.MN_DB_CONTAINER) {
const { execFileSync } = await import('node:child_process');
const sql = q => execFileSync('docker', ['exec', process.env.MN_DB_CONTAINER, 'psql', '-U', 'postgres', '-qtAc', q]).toString().trim().split(/\r?\n/)[0];
const comprador = cliente(), cmail = email('comprador');
const reg = await comprador.req('auth/register.php', { body: { name: 'Comprador', email: cmail, password: PASS } });
const uid = reg.json.id;
const vid = Number(sql('select min(id) from public.producto_variantes where stock >= 2'));
const pid = Number(sql('select producto_id from public.producto_variantes where id = ' + vid));
const stockTalla = () => Number(sql('select stock from public.producto_variantes where id = ' + vid));
const stockAntes = stockTalla();
await comprador.req('carrito/addToCart.php', { body: { producto_id: pid, variante_id: vid, cantidad: 1 } });
r = await comprador.req('checkout/createCheckoutSession.php', { body: { nombre: 'Ana', apellidos: 'Prueba', direccion: 'Calle 1', codigoPostal: '14850', ciudad: 'Baena', provincia: 'Córdoba', telefono: '600000000', email: cmail } });
log('F5 pago fallido en Stripe no cobra (502)', r.status === 502, 'HTTP ' + r.status);
log('F5 pago fallido devuelve el stock de la talla', stockTalla() === stockAntes, 'stock ' + stockTalla() + ' (antes ' + stockAntes + ')');
// Pedido pendiente con una unidad reservada: si Stripe avisa de que caducó, se devuelve a su talla
const sidExp = 'cs_test_' + randomBytes(12).toString('hex');
const oidExp = sql("insert into public.orders (user_id,total,estado,payment_reference) values (" + uid + ",10,'pendiente','" + sidExp + "') returning id");
sql('insert into public.order_items (order_id,producto_id,variante_id,talla,cantidad,precio_unitario) values (' + oidExp + ',' + pid + ',' + vid + ",'X',1,10)");
sql('update public.producto_variantes set stock = stock - 1 where id = ' + vid);
const plExp = JSON.stringify({ id: 'evt_e', type: 'checkout.session.expired', data: { object: { object: 'checkout.session', id: sidExp } } });
await wh(plExp, firmar(plExp));
log('F5 pago caducado devuelve la unidad a su talla', stockTalla() === stockAntes && sql('select estado from public.orders where id=' + oidExp) === 'cancelado', 'stock ' + stockTalla() + ' (antes ' + stockAntes + ')');
// Tallas de otro producto: ni en el carrito ni al editar un producto
const vidAjena = Number(sql('select min(id) from public.producto_variantes where producto_id <> ' + pid));
r = await comprador.req('carrito/addToCart.php', { body: { producto_id: pid, variante_id: vidAjena, cantidad: 1 } });
log('F4 carrito rechaza la talla de otro producto', r.status === 400, 'HTTP ' + r.status);
const prodAjeno = Number(sql('select producto_id from public.producto_variantes where id = ' + vidAjena));
r = await adm.req('Productos/seleccionar.php?ProductoID=' + pid);
const editado = r.json.producto[0];
r = await adm.req('Productos/modificar-productos.php', { body: { ...editado, id: pid, variantes: [...editado.variantes, { id: vidAjena, talla: 'ZZ', stock: 1 }] } });
log('F4 editar producto no puede tocar tallas de otro', r.status === 409 && Number(sql('select producto_id from public.producto_variantes where id = ' + vidAjena)) === prodAjeno, 'HTTP ' + r.status);
// Pedido pendiente simulado como si Stripe hubiera creado la sesión
const sid = 'cs_test_' + randomBytes(12).toString('hex');
const oid = sql("insert into public.orders (user_id,total,estado,payment_reference) values (" + uid + ",10,'pendiente','" + sid + "') returning id");
sql('insert into public.order_items (order_id,producto_id,variante_id,talla,cantidad,precio_unitario) values (' + oid + ',' + pid + ',' + vid + ",'M',1,10)");
const ev = (tipo, extra2 = {}) => JSON.stringify({ id: 'evt_' + randomBytes(6).toString('hex'), type: tipo, data: { object: { object: 'checkout.session', id: sid, payment_status: 'paid', payment_intent: 'pi_test', ...extra2 } } });
let pl = ev('checkout.session.completed'); await wh(pl, firmar(pl));
log('F5 completed marca pagado y vacía carrito', sql('select estado from public.orders where id=' + oid) === 'pagado' && sql('select count(*) from public.carrito where user_id=' + uid) === '0', sql('select estado from public.orders where id=' + oid));
pl = ev('checkout.session.completed'); log('F5 webhook duplicado idempotente', await wh(pl, firmar(pl)) === 200 && sql('select estado from public.orders where id=' + oid) === 'pagado', 'sigue pagado');
pl = ev('checkout.session.expired'); await wh(pl, firmar(pl));
log('F5 expired tras pagado no deshace el pago', sql('select estado from public.orders where id=' + oid) === 'pagado', sql('select estado from public.orders where id=' + oid));
pl = ev('checkout.session.completed', { payment_status: 'unpaid' });
const sid2 = 'cs_test_' + randomBytes(12).toString('hex');
const oid2 = sql("insert into public.orders (user_id,total,estado,payment_reference) values (" + uid + ",10,'cancelado','" + sid2 + "') returning id");
pl = JSON.stringify({ id: 'evt_c', type: 'checkout.session.completed', data: { object: { object: 'checkout.session', id: sid2, payment_status: 'paid' } } }); await wh(pl, firmar(pl));
log('F5 pago sobre pedido cancelado no lo reactiva', sql('select estado from public.orders where id=' + oid2) === 'cancelado', 'queda cancelado y se registra alerta para reembolso');
r = await comprador.req('order_items/getOrderItems.php?order_id=' + oid);
log('F3 el dueño sí ve sus líneas de pedido', r.json?.items?.length === 1, 'items=' + (r.json?.items?.length ?? 0));
log('F5 la línea del pedido muestra la talla', / · Talla M$/.test(r.json?.items?.[0]?.nombre || ''), r.json?.items?.[0]?.nombre || '-');
r = await u1.req('order_items/getOrderItems.php?order_id=' + oid);
log('F3 otro usuario no ve ese pedido', !(r.json?.items?.length), 'items=' + (r.json?.items?.length ?? 0));
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
r = await adm.req('Productos/addProduct.php', { body: { ...prodBase, nombre: 'Foto ok ' + randomBytes(2).toString('hex'), imagen: png } });
log('F4 imagen PNG real aceptada', r.status === 201, 'HTTP ' + r.status);
r = await adm.req('Productos/addProduct.php', { body: { ...prodBase, nombre: 'Disfrazada ' + randomBytes(2).toString('hex'), imagen: 'data:image/jpeg;base64,' + Buffer.from('<html>hola</html>').toString('base64') } });
log('F4 imagen con tipo falso rechazada', r.status === 400, 'HTTP ' + r.status);

}

// Al final: tras un 413 Apache cierra la conexión y el cliente no debe reutilizarla
r = await adm.req('Productos/addProduct.php', { body: { ...prodBase, nombre: 'Grande', imagen: 'data:image/jpeg;base64,' + 'A'.repeat(6 * 1024 * 1024) } }).catch(() => ({ status: 413 }));
log('F4 producto con imagen de 6 MB rechazado', r.status === 400 || r.status === 413, 'HTTP ' + r.status);

resumen();
process.exit(out.some(x => !x.ok) ? 1 : 0);

function resumen() {
  const fallos = out.filter(x => !x.ok);
  console.log(`\nRESUMEN: ${out.length} comprobaciones, ${fallos.length} fallos`);
}
