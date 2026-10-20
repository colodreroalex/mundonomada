// Aplica el tema claro/oscuro antes del primer pintado para evitar parpadeos.
// Usa la elección guardada con el botón sol/luna o, si no hay, la del dispositivo.
// Es un archivo aparte (no un script incrustado) para cumplir la CSP script-src 'self'.
(function () {
  var consulta = window.matchMedia('(prefers-color-scheme: dark)');
  var aplicar = function () {
    var elegido = null;
    try { elegido = localStorage.getItem('mn-tema'); } catch (e) {}
    var tema = elegido === 'dark' || elegido === 'light' ? elegido : (consulta.matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-bs-theme', tema);
  };
  aplicar();
  if (consulta.addEventListener) { consulta.addEventListener('change', aplicar); }
})();
