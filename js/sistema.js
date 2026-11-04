/* ordo · estructura interior provisional.
 * El parámetro departamento solo sirve para previsualizar el diseño:
 * NO es autenticación ni determina permisos efectivos.
 */
(() => {
  'use strict';

  const departamentos = Object.freeze({
    calidad: ['Calidad', 'Administración del Sistema'],
    servicios: ['Servicios Generales', 'Sistema de Gestión de la Calidad'],
    biblioteca: ['Biblioteca', 'Sistema de Gestión de la Calidad'],
    editorial: ['Editorial', 'Sistema de Gestión de la Calidad'],
    acompanamiento: ['Instituto de Acompañamiento', 'Sistema de Gestión de la Calidad'],
    colegio_mayor: ['Colegio Mayor', 'Sistema de Gestión de la Calidad']
  });

  const iconos = {
    usuarios: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 11a3 3 0 1 0-1-5"/><path d="M17 15a5 5 0 0 1 4 5"/>',
    contexto: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c-6 5-6 13 0 18"/><path d="M12 3c6 5 6 13 0 18"/>',
    liderazgo: '<path d="m3 10 9-7 9 7"/><path d="M5 10v9m5-9v9m4-9v9m5-9v9"/><path d="M2 21h20M4 10h16"/>',
    planificacion: '<rect x="6" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="8" height="5" rx="1"/><path d="m10 13 2 2 4-4M10 19h6"/>',
    apoyo: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    operacion: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    evaluacion: '<path d="M4 21V3M4 21h17"/><path d="M8 17v-6m5 6V7m5 10V4"/>',
    mejora: '<path d="M3 17 10 10l4 4 7-8"/><path d="M15 6h6v6"/>',
    candado: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };

  const apartados = [
    ['3', 'Gestión de usuarios', 'usuarios'],
    ['4', 'Contexto de la organización', 'contexto'],
    ['5', 'Liderazgo', 'liderazgo'],
    ['6', 'Planificación', 'planificacion'],
    ['7', 'Apoyo', 'apoyo'],
    ['8', 'Operación', 'operacion'],
    ['9', 'Evaluación del desempeño', 'evaluacion'],
    ['10', 'Mejora', 'mejora']
  ];

  const valores = new URLSearchParams(location.search);
  const codigo = window.OrdoCentral?.department;
  if (!codigo) { location.replace('index.html'); return; }
  const departamento = departamentos[codigo] || departamentos.calidad;
  const esCalidad = codigo === 'calidad';
  // Restricción visual provisional: la autorización real requiere servidor.
  const registro = window.OrdoUsuarios?.obtener().find(u => u.id === codigo);
  const permitido = n => n === '3' ? esCalidad : (!registro || (registro.activo && (registro.permisos || []).includes(n)));

  document.getElementById('entorno').textContent = departamento[0];
  document.getElementById('subtitulo').textContent = departamento[1];

  const icono = (nombre) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = iconos[nombre];
    return svg;
  };

  const menu = document.getElementById('menu');
  const zona = document.getElementById('zona-trabajo');
  apartados.forEach(([numero, nombre, nombreIcono]) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'apartado';
    const restringido = !permitido(numero);
    if (restringido) {
      boton.disabled = true;
      boton.title = numero === '3' ? 'Disponible exclusivamente en Calidad' : 'Apartado deshabilitado para este departamento';
      boton.setAttribute('aria-label', `${numero}. ${nombre}, sin acceso`);
    } else {
      boton.setAttribute('aria-label', `${numero}. ${nombre}`);
    }

    const numeroNodo = document.createElement('span');
    numeroNodo.className = 'numero';
    numeroNodo.textContent = numero;

    const texto = document.createElement('span');
    texto.className = 'texto';
    texto.textContent = nombre;

    boton.append(icono(nombreIcono), numeroNodo, texto);
    if (restringido) {
      const lock = icono('candado');
      lock.classList.add('candado');
      boton.append(lock);
    }

    boton.addEventListener('click', () => {
      if (boton.disabled) return;
      menu.querySelectorAll('button').forEach(b => {
        b.classList.toggle('activo', b === boton);
        b.setAttribute('aria-pressed', String(b === boton));
      });
      zona.replaceChildren();
      if (numero === '3' && esCalidad && window.OrdoUsuarios) {
        window.OrdoUsuarios.mostrar(zona);
      }
      if (numero === '4' && window.OrdoCapitulo4) {
        window.OrdoCapitulo4.mostrar(zona, {departamento: codigo, modo: esCalidad ? 'calidad' : 'visor'});
      }
    });

    boton.setAttribute('aria-pressed', 'false');
    menu.append(boton);
  });
})();
