/* ordo · Puerta de entrada. Sin credenciales ni navegación activas hasta aprobar la arquitectura. */
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
  document.getElementById('form-acceso').addEventListener('submit', e => {
    e.preventDefault();
    if (!selector.value) { aviso.textContent = 'Selecciona un departamento.'; selector.focus(); return; }
    if (!clave.value) { aviso.textContent = 'Introduce la contraseña.'; clave.focus(); return; }
    aviso.textContent = 'El acceso se habilitará cuando definamos la arquitectura y la autenticación de ordo.';
    clave.value = '';
  });
})();
