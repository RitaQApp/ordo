/* ordo · Gestión de usuarios departamentales.
 * PROTOTIPO LOCAL: las autorizaciones y contraseñas aquí NO constituyen
 * un sistema de autenticación/seguridad de producción. Requiere backend.
 * Sin datos de carácter personal.
 */
(() => {
'use strict';
const KEY='ORDO_USUARIOS_DEPARTAMENTALES_V1';
const ITEMS=[['4','Contexto de la organización'],['5','Liderazgo'],['6','Planificación'],['7','Apoyo'],['8','Operación'],['9','Evaluación del desempeño'],['10','Mejora']];
const DEFAULTS=[
 ['calidad','Calidad','Administrador del Sistema'],
 ['servicios','Servicios Generales','Servicio certificado'],
 ['biblioteca','Biblioteca','Servicio certificado'],
 ['editorial','Editorial','Servicio certificado'],
 ['acompanamiento','Instituto de Acompañamiento','Servicio certificado'],
 ['colegio_mayor','Colegio Mayor','Servicio certificado']
];
const defaults=()=>DEFAULTS.map(([id,nombre,tipo])=>({id,nombre,tipo,activo:true,permisos:['4','5','6','7','8','9','10'],logo:null,clave:null,revision:0}));
const clone=x=>JSON.parse(JSON.stringify(x));
function cargar(){
 let v;try{v=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){v=null}
 if(!Array.isArray(v)){ v=defaults();guardar(v); }
 // Alta aditiva por defecto: nunca reescribir datos que se hayan grabado.
 for(const d of defaults()) if(!v.some(u=>u.id===d.id))v.push(d);
 // Nunca permitir pérdida del administrador central.
 for(const u of v)if(u.id==='calidad'){u.activo=true;u.tipo='Administrador del Sistema';}
 return v;
}
function guardar(rows){localStorage.setItem(KEY,JSON.stringify(rows));}
function nodo(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function accion(text,fn,cl=''){const b=nodo('button','gu-btn '+cl,text);b.type='button';b.addEventListener('click',fn);return b;}
function input(label,value='',type='text'){
 const wrap=nodo('label','gu-field');wrap.append(nodo('span','',label));
 const i=nodo('input');i.type=type;i.value=value;i.autocomplete='off';wrap.append(i);return [wrap,i];
}
function mensaje(texto,kind=''){const p=nodo('p','gu-mensaje '+kind,texto);return p;}
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function huella(clave){
 if(!crypto?.subtle)throw new Error('Se necesita HTTPS para registrar contraseñas.');
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(clave),'PBKDF2',false,['deriveBits']);
 const hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,256);
 return {alg:'PBKDF2-SHA256',iteraciones:210000,salt:b64(salt),hash:b64(hash)};
}
function iniciales(nombre){return nombre.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('');}
function logoAutomatico(nombre){
 const ini=iniciales(nombre).replace(/[^A-ZÁÉÍÓÚÑ]/g,'');
 const safe=ini.replace(/&/g,'&amp;').replace(/</g,'&lt;');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="32" fill="#176487"/><circle cx="120" cy="95" r="54" fill="none" stroke="#51c8ed" stroke-width="5"/><path d="M69 144h102" stroke="#51c8ed" stroke-width="4"/><text x="120" y="110" font-family="Arial,sans-serif" font-weight="bold" font-size="46" text-anchor="middle" fill="white">${safe}</text><text x="120" y="188" font-family="Arial,sans-serif" font-size="19" text-anchor="middle" fill="white">ordo</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function pagina(panel){
 panel.replaceChildren();panel.classList.add('gu-area');
 const head=nodo('div','gu-cabecera');
 const tit=nodo('div');tit.append(nodo('div','gu-kicker','03 · ADMINISTRACIÓN DEL SISTEMA'),nodo('h1','','Gestión de usuarios'));
 head.append(tit,accion('+ ALTA DE USUARIO',()=>ficha(panel,null),'principal'));panel.append(head);
 panel.append(mensaje('Cada usuario corresponde a un departamento o servicio, nunca a una persona. La baja conserva el registro, desactivándolo.'));
 const tabla=nodo('div','gu-tabla');panel.append(tabla);
 for(const u of cargar()){
  const row=nodo('div','gu-fila');
  const img=nodo('div','gu-avatar');
  if(u.logo){const p=nodo('img');p.src=u.logo;p.alt='Icono de '+u.nombre;img.append(p)}else{img.textContent=iniciales(u.nombre)}
  const info=nodo('div','gu-info');info.append(nodo('strong','',u.nombre),nodo('span','',u.tipo+' · '+(u.activo?'Activo':'Inactivo')));
  const perms=nodo('span','gu-pills',u.id==='calidad'?'Control integral':((u.permisos||[]).length+' de 7 apartados'));
  const cmds=nodo('div','gu-comandos');cmds.append(accion('EDITAR',()=>ficha(panel,u.id)));
  if(u.id!=='calidad')cmds.append(accion(u.activo?'DAR DE BAJA':'REACTIVAR',()=>{
    const all=cargar();const item=all.find(x=>x.id===u.id);item.activo=!item.activo;item.revision=(item.revision||0)+1;
    try{guardar(all);pagina(panel)}catch(e){alert(e.message)}
  },u.activo?'peligro':''));
  row.append(img,info,perms,cmds);tabla.append(row);
 }
 const note=nodo('div','gu-advertencia');note.append(nodo('strong','','Seguridad pendiente de conectar'));
 note.append(nodo('p','','Esta es una gestión local de prueba. Los permisos no protegen por sí solos las páginas públicas de GitHub Pages y las contraseñas registradas en este navegador no se sincronizan con otros dispositivos. Para uso real hace falta autenticación y permisos verificados en servidor.'));
 panel.append(note);
}
function ficha(panel,id){
 const all=cargar(),original=all.find(x=>x.id===id);
 panel.replaceChildren();panel.classList.add('gu-area');
 const top=nodo('div','gu-cabecera');top.append(nodo('h1','',original?'Modificar usuario':'Alta de usuario'),accion('← VOLVER AL LISTADO',()=>pagina(panel)));
 panel.append(top);
 const form=nodo('div','gu-form');panel.append(form);
 const name=input('Departamento / usuario institucional',original?.nombre||'');
 const code=input('Código de usuario (sin espacios)',original?.id||'');
 const tipo=input('Tipo de usuario',original?.tipo||'Servicio certificado');
 if(original){code[1].disabled=true}
 [name,code,tipo].forEach(x=>form.append(x[0]));
 if(original?.id==='calidad'){name[1].disabled=true;tipo[1].disabled=true}
 const status=nodo('div','gu-seccion');
 status.append(nodo('h2','','Permisos de acceso'));
 status.append(mensaje('Selecciona los apartados disponibles para este usuario. La gestión de usuarios (3) es exclusiva de Calidad.'));
 const perms=nodo('div','gu-permisos');const controls=new Map();
 for(const [num,nombre] of ITEMS){
  const label=nodo('label','gu-check');const ck=nodo('input');ck.type='checkbox';ck.checked=original?Boolean((original.permisos||[]).includes(num)):true;
  if(original?.id==='calidad'){ck.checked=true;ck.disabled=true}
  controls.set(num,ck);label.append(ck,nodo('span','',num+' · '+nombre));perms.append(label);
 }
 status.append(perms);panel.append(status);
 const logo=nodo('div','gu-seccion');logo.append(nodo('h2','','Identidad gráfica'));
 const previa=nodo('div','gu-previa');let nuevoLogo=original?.logo||null;
 function mostrarLogo(){previa.replaceChildren();if(nuevoLogo){const img=nodo('img');img.src=nuevoLogo;img.alt='Logo institucional del usuario';previa.append(img)}else{previa.append(mensaje('Sin logotipo particular registrado.'))}}
 mostrarLogo();
 logo.append(previa,accion('GENERAR LOGOTIPO',()=>{nuevoLogo=logoAutomatico(name[1].value.trim()||'Departamento');mostrarLogo()}),
 accion('QUITAR LOGOTIPO',()=>{nuevoLogo=null;mostrarLogo()}));panel.append(logo);
 const security=nodo('div','gu-seccion');security.append(nodo('h2','','Contraseña departamental'));
 security.append(mensaje('La contraseña no se muestra ni se almacena en claro. Puedes establecerla o cambiarla. No es posible recuperarla, solo sustituirla.'));
 const clave=input(original?.clave?'Nueva contraseña (dejar vacío para conservar)':'Contraseña inicial','', 'password');
 const repetir=input('Repetir contraseña','', 'password');clave[1].autocomplete='new-password';repetir[1].autocomplete='new-password';
 security.append(clave[0],repetir[0]);panel.append(security);
 const aviso=nodo('div','gu-resultado');panel.append(aviso);
 const actions=nodo('div','gu-acciones');
 actions.append(accion('GUARDAR USUARIO',async()=>{
  aviso.replaceChildren();let nombre=name[1].value.trim(),codigo=code[1].value.trim().toLowerCase();
  if(!nombre||!codigo)return aviso.append(mensaje('Indica nombre y código.','error'));
  if(!/^[a-z0-9_\-]+$/.test(codigo))return aviso.append(mensaje('Usa solo letras sin acento, números, guion o guion bajo en el código.','error'));
  if(!original && all.some(x=>x.id===codigo))return aviso.append(mensaje('Ya existe ese código de usuario.','error'));
  if(clave[1].value!==repetir[1].value)return aviso.append(mensaje('Las contraseñas no coinciden.','error'));
  if(clave[1].value&&clave[1].value.length<12)return aviso.append(mensaje('La contraseña debe tener al menos 12 caracteres.','error'));
  const u=original?clone(original):{id:codigo,activo:true,revision:0,clave:null};
  u.nombre=nombre;u.tipo=tipo[1].value.trim()||'Servicio certificado';u.permisos=[...controls].filter(([num,control])=>control.checked).map(([num])=>num);
  u.logo=nuevoLogo;u.revision=(u.revision||0)+1;
  if(original?.id==='calidad'){u.tipo='Administrador del Sistema';u.activo=true;u.permisos=ITEMS.map(([n])=>n)}
  if(clave[1].value){
    try{u.clave=await huella(clave[1].value)}catch(e){return aviso.append(mensaje(e.message,'error'))}
  }
  try{
    const latest=cargar();const ix=latest.findIndex(x=>x.id===u.id);
    if(ix<0)latest.push(u);else latest[ix]=u;
    guardar(latest);pagina(panel);
  }catch(e){aviso.append(mensaje('No se ha podido guardar: '+e.message,'error'))}
 },'principal'));
 actions.append(accion('CANCELAR',()=>pagina(panel)));panel.append(actions);
}
window.OrdoUsuarios=Object.freeze({mostrar:pagina,obtener:()=>cargar().map(clone)});
})();
