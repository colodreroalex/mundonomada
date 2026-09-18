// Only run against the disposable preview database seeded with demo_catalog.sql.
// Creates two fictitious users; prints their exact emails for cleanup afterwards.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2];
assert(base, 'Usage: node tools/smoke-test.mjs https://preview/api_php/');
const origin = new URL(base).origin;
const run = Date.now().toString(36);
const emails = [`smoke-${run}-a@example.invalid`, `smoke-${run}-b@example.invalid`];
const password = randomBytes(24).toString('hex');
const checks = [];
const report = { base, emails, checks, success: false };
mkdirSync('tmp', { recursive: true });
const save = () => writeFileSync(`tmp/smoke-${run}.json`, JSON.stringify(report, null, 2));
save();

function client() {
  const cookies = new Map();
  return {
    cookies,
    async request(path, expected = 200, body, extraHeaders = {}) {
      const headers = { Origin: origin, ...extraHeaders };
      if (cookies.size) headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
      if (body !== undefined) headers['Content-Type'] ??= 'application/json';
      const response = await fetch(new URL(path, base), {
        method: body === undefined ? 'GET' : 'POST', headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      for (const value of response.headers.getSetCookie()) {
        const [name, ...parts] = value.split(';')[0].split('=');
        if (value.includes('Max-Age=0') || parts.join('=') === 'deleted') cookies.delete(name);
        else cookies.set(name, parts.join('='));
      }
      const text = await response.text();
      assert.equal(response.status, expected, `${path}: ${text.slice(0, 200)}`);
      const data = JSON.parse(text);
      checks.push(`${response.status} ${path}`);
      save();
      return { data, headers: response.headers };
    },
  };
}

const guest = client(), alice = client(), bob = client();
try {
  await guest.request('health.php');
  const products = (await guest.request('Productos/get-all-products.php')).data.productos;
  const product = products.find(p => p.nombre === 'Blusa de prueba');
  assert(product && product.stock >= 3, 'Seed the disposable demo catalog first');
  await guest.request('Categorias/getCategorias.php');
  await guest.request(`Productos/seleccionar.php?ProductoID=${product.ProductoID}`);
  await guest.request('auth/getSession.php', 401);
  await guest.request('carrito/getCarrito.php', 401);
  await guest.request('usuarios/get-all-users.php', 403);
  const a = (await alice.request('auth/register.php', 201, { name: 'Prueba automática A', email: emails[0], password, role: 'admin' })).data;
  assert.equal(a.role, 'user', 'Register must not allow privilege escalation');
  await guest.request('auth/register.php', 409, { name: 'Duplicate', email: emails[0], password });
  const b = (await bob.request('auth/register.php', 201, { name: 'Prueba automática B', email: emails[1], password })).data;
  await alice.request('usuarios/get-all-users.php', 403);
  await alice.request('carrito/addToCart.php', 200, { producto_id: product.ProductoID, cantidad: 2, user_id: b.id });
  const cart = (await alice.request('carrito/getCarrito.php')).data.datos;
  assert.equal(cart.length, 1);
  assert.equal(Number(cart[0].cantidad), 2);
  assert.equal((await bob.request(`carrito/getCarrito.php?user_id=${a.id}`)).data.datos.length, 0);
  await bob.request('carrito/updateCartItem.php', 404, { id: cart[0].cart_id, cantidad: 1 });
  await bob.request('carrito/removeItemFromCart.php', 404, { id: cart[0].cart_id });
  await alice.request('carrito/updateCartItem.php', 409, { id: cart[0].cart_id, cantidad: Number(product.stock) + 1 });
  await alice.request('carrito/updateCartItem.php', 200, { id: cart[0].cart_id, cantidad: 3 });
  assert.equal(Number((await alice.request('carrito/getCarrito.php')).data.datos[0].cantidad), 3);
  await alice.request('carrito/addToCart.php', 403, { producto_id: product.ProductoID, cantidad: 1 }, { Origin: 'https://untrusted.example' });
  await alice.request('carrito/addToCart.php', 415, { producto_id: product.ProductoID, cantidad: 1 }, { 'Content-Type': 'text/plain' });
  await alice.request('auth/updateProfile.php', 200, { name: 'Prueba Ñómada', email: emails[0], userId: b.id });
  assert.equal((await alice.request('auth/getSession.php')).data.name, 'Prueba Ñómada');
  assert.equal((await bob.request('auth/getSession.php')).data.name, 'Prueba automática B');
  await alice.request('orders/createOrder.php', 405, { total: 0, estado: 'pagado' });
  await alice.request('carrito/removeItemFromCart.php', 200, { id: cart[0].cart_id });
  await alice.request('auth/logout.php', 200, {});
  await alice.request('auth/getSession.php', 401);
  const login = await alice.request('auth/login.php', 200, { email: emails[0], password, rememberMe: true });
  if (origin.startsWith('https:')) {
    const sessionCookie = login.headers.getSetCookie().find(c => c.startsWith('PHPSESSID='));
    assert.match(sessionCookie, /secure/i);
    assert.match(sessionCookie, /httponly/i);
    assert.match(sessionCookie, /samesite=lax/i);
  }
  alice.cookies.delete('PHPSESSID');
  assert.equal((await alice.request('auth/getSession.php')).data.id, a.id);
  await alice.request('auth/changePassword.php', 200, { oldPassword: password, newPassword: password + 'new' });
  await alice.request('auth/logout.php', 200, {});
  await alice.request('auth/login.php', 200, { email: emails[0], password: password + 'new' });
  await alice.request('auth/logout.php', 200, {});
  await bob.request('auth/logout.php', 200, {});
  for (let attempt = 0; attempt < 5; attempt++) {
    await guest.request('auth/login.php', 401, { email: emails[1], password: 'deliberately-wrong-password' });
  }
  await guest.request('auth/login.php', 429, { email: emails[1], password });
  report.success = true;
  console.log(`PASS: ${checks.length} HTTP checks; registration, session, profile, cart ownership, stock, CSRF, remember-me, password change and rate limit.`);
} finally {
  save();
  console.log(`Report: tmp/smoke-${run}.json`);
  console.log(`Disposable users: ${emails.join(', ')}`);
}
