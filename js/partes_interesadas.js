/* ordo · 4.2 conectado exclusivamente a API central Cloudflare D1.
 * No utiliza localStorage, sessionStorage, IndexedDB, cookies ni caché persistente.
 * Requiere desplegar API y sustituir URL. El token solo permanece en memoria RAM.
 */
(()=>{'use strict';
 const SERVICIOS=[['servicios','Servicios Generales'],['biblioteca','Biblioteca'],['editorial','Editorial'],['acompanamiento','Instituto de Acompañamiento'],['colegio_mayor','Colegio Mayor']];
 const ALL=[['calidad','Calidad'],...SERVICIOS];
 const CAMPOS=[['grupo','Grupo de interés'],['descripcion','Descripción / integrantes'],['interes_ufv','Interés de la UFV'],['necesidades','Necesidades y expectativas del grupo'],['comunicacion','Canales de comunicación'],['seguimiento','Seguimiento / fuentes de información']];
 const entry=window.OrdoEntrySession; delete window.OrdoEntrySession;
 if(entry)window.OrdoAPI.acceptSession(entry);
 let token=entry?.token||null,auth=window.OrdoAPI.getSession()?.department||null,cache=[],activeHost=null,activeCtx=null,goBack=null;
 const $=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
 const btn=(text,action,cls='')=>{const n=$('button','c4-btn '+cls,text);n.type='button';n.onclick=()=>Promise.resolve(action()).catch(e=>alert(e.message));return n};
 const text=(parent,tag,txt,cls)=>{const n=$(tag,cls,txt);parent.append(n);return n};
 const title=(host,label,back,subtitle)=>{host.replaceChildren();host.className='trabajo';const root=$('section','c4 pi'),head=$('div','c4-top');head.append($('span','c4-icono','4.2'));const box=$('div');text(box,'h1',label);if(subtitle)text(box,'p',subtitle,'c4-intro');head.append(box);root.append(head);if(back){const bar=$('div','c4-row');bar.append(btn('← VOLVER',back));root.append(bar)}host.append(root);return root};
 const notice=(root,msg)=>text(root,'p',msg,'c4-note');
 const section=(root,msg)=>text(root,'h2',msg,'pi-section-title');
 const field=(name,value='',kind='text')=>{const w=$('label','pi-field');text(w,'span',name);const e=$(kind==='textarea'?'textarea':'input');if(kind!=='textarea')e.type=kind;e.value=value??'';e.autocomplete='off';w.append(e);return {w,e}};
 const date=()=>new Date().toISOString().slice(0,10);
 const clone=o=>JSON.parse(JSON.stringify(o));
 const admin=()=>auth==='calidad';
 const assigned=p=>p.tipo==='general'?'Información general UFV':SERVICIOS.filter(([id])=>p.departamentos.includes(id)).map(([,n])=>n).join(', ');
 const short=p=>`${p.codigo} · Rev. ${p.revision} · ${p.estado}`;
 async function api(method,path,payload){
  try { return await window.OrdoAPI.request(method,path,payload); }
  catch(e){ if(e.status===401){token=null;auth=null;} throw e; }
 }
 function login(){location.replace('index.html');}
 async function listar(host,ctx,back,aux=null){const root=title(host,aux?'Consulta auxiliar · '+ALL.find(([x])=>x===aux)?.[1]:'4.2 · Partes interesadas',back,'Información general y asignada. Datos cargados desde la base central.');
  notice(root,'Consultando base de datos central…');let data;
  try{data=await api('GET','/api/pi'+(aux?'?aux='+encodeURIComponent(aux):''))}catch(e){root.lastChild?.remove();notice(root,e.message);if(!token)root.append(btn('IDENTIFICARSE',()=>login(host,ctx,back)));return}
  cache=data.paquetes;root.querySelector('.c4-note')?.remove();
  if(admin()&&!aux){const bar=$('div','c4-row');bar.append(btn('+ NUEVO PAQUETE',()=>editar(host,ctx,back,null),'primary'));root.append(bar)}
  if(auth!=='calidad'&&!aux){const bar=$('div','c4-row');bar.append(btn('VISOR AUXILIAR 1',()=>elegirAux(host,ctx,back)),btn('VISOR AUXILIAR 2',()=>elegirAux(host,ctx,back)));root.append(bar)}
  if(!cache.length){notice(root,'No hay paquetes visibles en este entorno.');return}
  for(const kind of ['general','especifico']){const group=cache.filter(p=>p.tipo===kind);if(!group.length)continue;section(root,kind==='general'?'Información general UFV':aux?'Información compartida':'Información específica');const box=$('div','pi-list');group.forEach(p=>{const row=$('div','pi-list-row'),meta=$('div','pi-list-meta'),actions=$('div','pi-actions');meta.append($('strong','',p.titulo),$('small','',short(p)+' · '+assigned(p)));row.append(meta);
   actions.append(btn('CONSULTAR',()=>consultar(host,ctx,back,p.id,aux)));
   if(admin()&&!aux){actions.append(btn('EDITAR',()=>editar(host,ctx,back,p.id)),btn('DISTRIBUIR',()=>distribuir(host,ctx,back,p.id)))}
   if(auth!=='calidad'&&!aux&&p.tipo==='especifico'&&p.departamentos.length===1&&p.departamentos[0]===auth)actions.append(btn(p.compartida?'COMPARTIDA':'EXCLUSIVA',()=>visibility(host,ctx,back,p)));
   row.append(actions);box.append(row)});root.append(box)}
  root.append(btn('PDF DEL APARTADO',()=>imprimir(cache.filter(p=>p.estado==='vigente'),'4.2 · Partes interesadas'),'primary'));
 }
 function elegirAux(host,ctx,back){const root=title(host,'Consulta de otro departamento',()=>listar(host,ctx,back));notice(root,'Solo se mostrarán sus paquetes marcados como COMPARTIDOS y la información general.');const bar=$('div','c4-row');SERVICIOS.filter(([id])=>id!==auth).forEach(([id,n])=>bar.append(btn(n,()=>listar(host,ctx,back,id))));root.append(bar)}
 async function distribuir(host,ctx,back,id){if(!admin())return;let p=cache.find(x=>x.id===id);if(!p)return;const root=title(host,'Distribución · '+p.titulo,()=>listar(host,ctx,back),'El cambio de destinatarios no altera la revisión.');const box=$('div','c4-box');let type=p.tipo;
  const controls={},modes=$('div','pi-modes'),checks=$('div','c4-checks');[['general','General UFV'],['especifico','Asignada a servicios']].forEach(([k,label])=>{const lab=$('label','pi-choice'),input=$('input');input.type='radio';input.name='pi-assignment';input.checked=type===k;input.onchange=()=>{type=k;checks.hidden=k==='general'};lab.append(input,$('span','',label));modes.append(lab)});
  SERVICIOS.forEach(([key,name])=>{const lab=$('label','c4-check'),input=$('input');input.type='checkbox';input.checked=p.departamentos.includes(key);controls[key]=input;lab.append(input,$('span','',name));checks.append(lab)});checks.hidden=type==='general';box.append(modes,checks);root.append(box);
  root.append(btn('GUARDAR DISTRIBUCIÓN',async()=>{const departments=SERVICIOS.filter(([k])=>controls[k].checked).map(([k])=>k);if(type==='especifico'&&!departments.length)throw Error('Selecciona al menos un servicio');await api('PATCH','/api/pi/'+id+'/distribution',{tipo:type,departamentos:departments});await listar(host,ctx,back)},'primary'));
 }
 async function visibility(host,ctx,back,p){if(p.departamentos.length!==1||p.departamentos[0]!==auth)return;
  if(!confirm('¿Cambiar la visibilidad a '+(p.compartida?'EXCLUSIVA':'COMPARTIDA')+'?'))return;
  await api('PATCH','/api/pi/'+p.id+'/visibility',{compartida:!p.compartida});await listar(host,ctx,back);
 }
 async function editar(host,ctx,back,id){if(!admin())return;const old=id?cache.find(x=>x.id===id):null;
  if(old?.estado==='obsoleto'){const root=title(host,old.titulo,()=>listar(host,ctx,back));notice(root,'Paquete obsoleto. Su contenido no se puede modificar.');root.append(btn('REACTIVAR COMO BORRADOR',async()=>{await api('POST','/api/pi/'+id+'/reactivate');await listar(host,ctx,back)},'primary'));return}
  let makingRevision=false,locked=old?.estado==='vigente';const r=old||{codigo:'PI-',titulo:'',revision:'0',fecha:date(),texto:'',filas:[],departamentos:[],tipo:'especifico'};
  const root=title(host,id?'Modificar paquete · '+r.titulo:'Nuevo paquete de partes interesadas',()=>listar(host,ctx,back),'Datos generales · contenido de la tabla · control de revisiones');
  const box=$('div','c4-box pi-editor');section(box,'Datos generales');const code=field('Código',r.codigo),name=field('Título',r.titulo),rev=field('Revisión',r.revision),fecha=field('Fecha de revisión',r.fecha,'date'),intro=field('Texto introductorio',r.texto,'textarea');[code,name,rev,fecha].forEach(x=>box.append(x.w));root.append(box);
  section(root,'Grupos de interés');const area=$('div','pi-table-edit'),filas=clone(r.filas||[]);root.append(area);
  const redraw=()=>{area.replaceChildren();if(!filas.length)notice(area,'Añade uno o varios grupos de interés.');filas.forEach((row,i)=>{const card=$('details','pi-entry');card.open=filas.length<4;const summary=$('summary','',`${i+1}. ${row.grupo||'Nuevo grupo'}`);card.append(summary);const grid=$('div','pi-entry-grid');CAMPOS.forEach(([key,label])=>{const f=field(label,row[key]||'',key==='grupo'?'text':'textarea');f.e.addEventListener('input',()=>{row[key]=f.e.value;summary.textContent=`${i+1}. ${row.grupo||'Nuevo grupo'}`});grid.append(f.w)});card.append(grid,btn('QUITAR FILA',()=>{if(confirm('¿Quitar fila del borrador?')){filas.splice(i,1);redraw()}},'warn'));area.append(card)})};redraw();
  const add=$('div','c4-row');add.append(btn('+ AÑADIR GRUPO',()=>{filas.push(Object.fromEntries(CAMPOS.map(([key])=>[key,''])));redraw()},'primary'));root.append(add);
  section(root,'Texto adicional');const ext=$('div','c4-box');ext.append(intro.w);root.append(ext);
  if(!old){section(root,'Distribución inicial');const dist=$('div','c4-box');let type='especifico';const radios=$('div','pi-modes'),checks=$('div','c4-checks'),ctrl={};[['general','General UFV'],['especifico','Por departamentos']].forEach(([k,label])=>{const lab=$('label','pi-choice'),input=$('input');input.type='radio';input.name='new-pi-type';input.checked=k===type;input.onchange=()=>{type=k;checks.hidden=k==='general'};lab.append(input,$('span','',label));radios.append(lab)});SERVICIOS.forEach(([k,n])=>{const lab=$('label','c4-check'),input=$('input');input.type='checkbox';ctrl[k]=input;lab.append(input,$('span','',n));checks.append(lab)});dist.append(radios,checks);root.append(dist);r._assignment=()=>({tipo:type,departamentos:type==='general'?[]:SERVICIOS.filter(([k])=>ctrl[k].checked).map(([k])=>k)})}
  else notice(root,'La distribución se modifica con DISTRIBUIR desde la lista, sin crear una nueva revisión.');
  section(root,'Control documental');const warning=$('div','c4-box');notice(warning,locked?'Esta revisión está aprobada. Crea una nueva revisión antes de modificar contenido.':'El contenido se guarda en el servidor, nunca en el navegador.');root.append(warning);
  const actions=$('div','c4-row'),msg=$('p','c4-note');root.append(actions,msg);
  const disable=v=>{[code.e,name.e,rev.e,fecha.e,intro.e,...area.querySelectorAll('input,textarea,button'),...add.querySelectorAll('button')].forEach(n=>n.disabled=v)};
  if(locked)disable(true);
  const save=async aprobar=>{try{
   const data={codigo:code.e.value.trim(),titulo:name.e.value.trim(),revision:rev.e.value.trim(),fecha:fecha.e.value,texto:intro.e.value,filas:filas.map(f=>Object.fromEntries(CAMPOS.map(([key])=>[key,String(f[key]||'')]))),aprobar};
   if(!data.codigo||!data.titulo||!data.revision)throw Error('Completa código, título y revisión.');if(aprobar&&!filas.length)throw Error('Añade al menos una fila.');
   if(old){if(locked&&!makingRevision)throw Error('Crea primero una nueva revisión');await api('PUT','/api/pi/'+old.id,{...data,version:old.version});}
   else{const a=r._assignment();if(a.tipo==='especifico'&&!a.departamentos.length)throw Error('Selecciona al menos un departamento');const created=await api('POST','/api/pi',{...data,...a});if(aprobar)await api('PUT','/api/pi/'+created.paquete.id,{...data,version:created.paquete.version});}
   await listar(host,ctx,back);
  }catch(e){msg.textContent=e.message}};
  function renderButtons(){actions.replaceChildren(btn('GUARDAR BORRADOR',()=>save(false),'primary'),btn('APROBAR REVISIÓN',()=>save(true)));if(old)actions.append(btn('HISTÓRICO',()=>historico(host,ctx,back,id)),btn('PASAR A OBSOLETO',async()=>{if(confirm('¿Pasar a obsoleto?')){await api('POST','/api/pi/'+id+'/obsolete');await listar(host,ctx,back)}},'warn'))}
  if(locked){actions.append(btn('NUEVA REVISIÓN',()=>{makingRevision=true;disable(false);rev.e.value='';rev.e.focus();renderButtons()},'primary'),btn('HISTÓRICO',()=>historico(host,ctx,back,id)));}else renderButtons();
 }
 async function historico(host,ctx,back,id){if(!admin())return;const data=await api('GET','/api/pi/'+id+'/history');const p=cache.find(x=>x.id===id),root=title(host,'Histórico · '+(p?.titulo||''),()=>listar(host,ctx,back));if(!data.revisiones.length)return notice(root,'No hay revisiones anteriores.');data.revisiones.forEach(r=>{const row=$('div','pi-list-row');row.append($('strong','',`Revisión ${r.revision} · ${r.aprobado}`),btn('CONSULTAR',()=>consultar(host,ctx,back,id,null,r.instantanea)));root.append(row)})}
 async function consultar(host,ctx,back,id,aux=null,version=null){const p=version||cache.find(x=>x.id===id);if(!p)return;const root=title(host,p.titulo,()=>listar(host,ctx,back,aux),short(p));root.append(paper(p));root.append(btn('GENERAR PDF · COPIA NO CONTROLADA',()=>imprimir([p],p.titulo),'primary'))}
 function paper(p){const a=$('article','pi-document');a.append($('h2','',p.titulo),$('p','pi-meta',`Universidad Francisco de Vitoria · ${p.codigo} · Revisión ${p.revision} · Fecha ${p.fecha||''}`));if(p.texto){if(p.texto.startsWith('__ORDO_DOC_V1__')){try{const bundle=JSON.parse(p.texto.slice('__ORDO_DOC_V1__'.length));for(const b of bundle.bloques||[]){if(b.title)a.append($('h3','',b.title));if(b.text)a.append($('p','pi-description',b.text));if(b.rows?.length){const tbl=$('table','pi-doc-table'),r=$('tr');(b.cols||[]).forEach(c=>r.append($('th','',String(c))));tbl.append(r);b.rows.forEach(row=>{const rr=$('tr');row.forEach(v=>rr.append($('td','',String(v||''))));tbl.append(rr)});a.append(tbl)}if(b.image){const img=$('img');img.src=b.image;img.alt=b.title||'Imagen';img.style.maxWidth='100%';a.append(img)}}}catch{a.append($('p','pi-description',p.texto))}}else a.append($('p','pi-description',p.texto))}const table=$('table','pi-doc-table'),thead=$('thead'),tr=$('tr');CAMPOS.forEach(([,label])=>tr.append($('th','',label)));thead.append(tr);table.append(thead);const body=$('tbody');(p.filas||[]).forEach(f=>{const row=$('tr');CAMPOS.forEach(([key])=>row.append($('td','',String(f[key]||''))));body.append(row)});table.append(body);a.append(table);return a}
 function imprimir(packages,titulo){if(!packages.length){alert('Sin contenido vigente para imprimir.');return}const w=window.open('','_blank');if(!w){alert('Activa la ventana de impresión.');return}const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const docs=packages.map(p=>paper(p).outerHTML).join('<div class="pagebreak"></div>');w.document.open();w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(titulo)+'</title><style>@page{size:A4 landscape;margin:13mm}body{font-family:serif;font-size:10pt}article{break-before:page}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #9babb8;padding:6px;overflow-wrap:anywhere;white-space:pre-wrap}tr{break-inside:avoid}h2{font-size:16pt}.pi-meta{font-size:9pt;color:#555}.pi-description{white-space:pre-wrap}.foot{position:fixed;bottom:0;left:0;right:0;text-align:center;border-top:1px solid #aaa;padding:4px;background:#fff}.pagebreak{break-before:page}</style></head><body><h1>Universidad Francisco de Vitoria · 4.2 Partes interesadas</h1>'+docs+'<div class="foot">COPIA NO CONTROLADA</div></body></html>');w.document.close();w.focus();w.print()}
 function mostrar(host,ctx,back){activeHost=host;activeCtx=ctx;goBack=back;if(!token||auth!==ctx.departamento){token=null;auth=null;login(host,ctx,back)}else listar(host,ctx,back)}
 window.OrdoCentral=Object.freeze({api,get department(){return window.OrdoAPI.getSession()?.department||null},ensure(host,ctx,back,continuar){if(token&&auth===ctx.departamento)return continuar();token=null;auth=null;return login(host,ctx,back,continuar)}});
 window.OrdoPartesInteresadas=Object.freeze({mostrar});
})();
