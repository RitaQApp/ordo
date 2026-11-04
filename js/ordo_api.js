/* ordo · Pasarela de comunicación común para todos los módulos.
   Único cliente HTTP hacia Cloudflare. Sin almacenamiento persistente.
   El Worker comprueba los permisos; este archivo no concede autorizaciones. */
(function (global) {
  'use strict';
  if (global.OrdoAPI) return; // La entrada dinámica no debe borrar una sesión activa.
  const BASE = 'https://ordo-api.dellaguno-consultoria.workers.dev';
  let session = null;
  function acceptSession(value) {
    if (!value || typeof value.token !== 'string' || !value.token || typeof value.department !== 'string')
      throw new Error('Sesión incompleta');
    session = {token: value.token, department: value.department};
    return {department: session.department};
  }
  function clearSession() { session = null; }
  function getSession() { return session ? {department: session.department} : null; }
  function hasSession(department) { return Boolean(session && (!department || session.department === department)); }
  async function request(method, path, payload, opts) {
    if (typeof path !== 'string' || !/^\/api\/(?:[a-zA-Z0-9_\-/]+)(?:\?[a-zA-Z0-9_=&%-]*)?$/.test(path))
      throw new Error('Ruta API inválida');
    const headers = {'Accept': 'application/json'};
    if (session) headers.Authorization = 'Bearer ' + session.token;
    if (payload !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetch(BASE + path, {method: String(method || 'GET').toUpperCase(), headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
        cache: 'no-store', credentials: 'omit', signal: opts && opts.signal});
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw new Error('No se pudo conectar con Cloudflare. No se ha guardado nada.');
    }
    let data;
    try { data = await response.json(); } catch (_) { throw new Error('Respuesta no válida del servidor (' + response.status + ')'); }
    if (!response.ok) {
      if (response.status === 401 && path !== '/api/login') clearSession();
      const err = new Error(data && data.error || 'Error del servidor (' + response.status + ')');
      err.status = response.status;
      throw err;
    }
    return data;
  }
  async function signIn(department, password) {
    const result = await request('POST', '/api/login', {department, password});
    acceptSession(result);
    return result;
  }
  global.OrdoAPI = Object.freeze({
    baseURL: BASE, request, signIn, acceptSession, clearSession, getSession, hasSession,
    health: () => request('GET', '/api/health')
  });
})(window);
