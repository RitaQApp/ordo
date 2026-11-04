/* ordo · Acceso de pruebas. */
(() => {
  'use strict';
  const selector = document.getElementById('departamento');
  const clave = document.getElementById('clave');
  const ver = document.getElementById('ver-clave');
  const aviso = document.getElementById('acceso-mensaje');
  const accesos = [...document.querySelectorAll('[data-dpto]')];
  function marcar(departamento) {
    selector.value = departamento;
    accesos.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dpto === departamento)));
    aviso.textContent = '';
  }
  accesos.forEach(b => b.addEventListener('click', () => { marcar(b.dataset.dpto); clave.focus(); }));
  selector.addEventListener('change', () => marcar(selector.value));
  ver.addEventListener('click', () => {
    const visible = clave.type === 'text';
    clave.type = visible ? 'password' : 'text';
    ver.textContent = visible ? 'VER' : 'OCULTAR';
    ver.setAttribute('aria-pressed', String(!visible));
  });
  document.getElementById('form-acceso').addEventListener('submit', async e => {
    e.preventDefault();
    if (!selector.value) { aviso.textContent = 'Selecciona un departamento.'; selector.focus(); return; }
    if (!clave.value) { aviso.textContent = 'Introduce la contraseña.'; clave.focus(); return; }
    const submit = document.querySelector('#form-acceso button[type="submit"]');
    if (submit) submit.disabled = true;
    aviso.textContent = 'Accediendo…';
    try {
      const session = await window.OrdoAPI.signIn(selector.value, clave.value);
      const page = await fetch('sistema.html?v=acceso-unico-20261104', {cache:'no-store'});
      if (!page.ok) throw Error('No se pudo cargar la aplicación.');
      const html = await page.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const scripts = [...parsed.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
      parsed.querySelectorAll('script').forEach(s => s.remove());
      clave.value = '';
      // La sesión se transmite en RAM, sin guardarla en URL ni almacenamiento del navegador.
      window.OrdoEntrySession = session;
      history.replaceState(null, '', 'sistema.html?departamento=' + encodeURIComponent(session.department));
      document.documentElement.replaceWith(document.importNode(parsed.documentElement, true));
      for (const src of scripts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = () => reject(Error('No se pudo cargar la aplicación. Recarga para volver a acceder.'));
          document.body.append(script);
        });
      }
    } catch (error) {
      aviso.textContent = error.message || 'No se pudo conectar con el servidor.';
      clave.value = '';
      if (!aviso.isConnected) {
        const message = document.createElement('p');
        message.textContent = error.message;
        document.body.append(message);
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();
