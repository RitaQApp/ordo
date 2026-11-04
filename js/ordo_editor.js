/* ordo · editor documental común (Calidad). Persistencia exclusiva en Cloudflare mediante OrdoAPI.
   Compatible con /api/contexto y /api/pi para los cuatro gorditos. Sin almacenamiento local. */
(()=>{'use strict';
 const DEPS=[['servicios','Servicios Generales'],['biblioteca','Biblioteca'],['editorial','Editorial'],['acompanamiento','Instituto de Acompañamiento'],['colegio_mayor','Colegio Mayor']];
 const $=(tag,cls='',value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
 const button=(label,click,cls='')=>{const el=$('button','ode-button '+cls,label);el.type='button';el.onclick=()=>Promise.resolve(click()).catch(e=>alert(e.message));return el};
 const key=()=>crypto.randomUUID();
 const request=(method,path,data)=>window.OrdoAPI.request(method,path,data);
 const nameOf=id=>({'4.1':'Contexto interno y externo','4.2':'Partes interesadas','4.3':'Alcance del Sistema','4.4':'Mapa e interacción de procesos'})[id]||id;
 function field(label,value='',type='text'){const wrap=$('label','ode-field'),cap=$('span','',label),input=$(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value??'';input.autocomplete='off';wrap.append(cap,input);return {wrap,input}}
 function notice(root,text){root.append($('p','ode-notice',text))}
 function scaffold(host,id,back){host.replaceChildren();const root=$('section','c4 ode');const h=$('div','ode-heading');h.append($('h1','',id+' · '+nameOf(id)),button('← VOLVER',back));root.append(h);host.append(root);return root}
 function newRecord(id){return {id:key(),apartado:id,codigo:id.replace('.','')+'-',titulo:'',fecha:new Date().toISOString().slice(0,10),revision:'0',estado:id==='4.2'?'borrador':'Vigente',campos:{},asignados:[],mapaImagen:null}}
 function parseBlocks(r){try{const b=JSON.parse(r.campos?._ordo_bloques||'[]');return Array.isArray(b)?b:[]}catch{return []}}
 function historical(r){const o={...r.campos};delete o._ordo_bloques;return Object.entries(o).filter(([,v])=>v).map(([k,v])=>({title:k,body:v}))}
 const clone=o=>JSON.parse(JSON.stringify(o));
 const PI_KEYS=['grupo','descripcion','interes_ufv','necesidades','comunicacion','seguimiento'];
 const PI_LABELS=['Grupo de interés','Descripción / integrantes','Interés de la UFV','Necesidades y expectativas','Canales de comunicación','Seguimiento'];
 const PI_PREFIX='__ORDO_DOC_V1__';
 const PI_MAIN='pi-tabla-principal';
 const piTable=rows=>({id:PI_MAIN,kind:'table',title:'Grupos de interés',cols:[...PI_LABELS],rows:(rows||[]).map(x=>PI_KEYS.map(k=>String(x[k]||'')))});
 function decodePI(p){let extra=[],plain=p.texto||'',meta={};
  if(plain.startsWith(PI_PREFIX)){try{const doc=JSON.parse(plain.slice(PI_PREFIX.length));if(doc.formato===1&&Array.isArray(doc.bloques)){extra=doc.bloques;meta=doc.meta||{};plain=''}}catch{/* mantener contenido heredado */}}
  if(plain)extra.unshift({id:'texto-heredado',kind:'text',title:'Texto introductorio',text:plain});
  const campos={_ordo_bloques:JSON.stringify([piTable(p.filas),...extra]),_ordo_responsable:meta.responsable||'',_ordo_cambios:meta.cambios||'',_ordo_observaciones:meta.observaciones||''};
  return {...p,apartado:'4.2',asignados:p.tipo==='general'?DEPS.map(([k])=>k):p.departamentos||[],campos,estado:p.estado, _pi:true};
 }
 async function loadRecords(id){if(id==='4.2'){const d=await request('GET','/api/pi');return (d.paquetes||[]).map(decodePI)}const d=await request('GET','/api/contexto');return (d.registros||[]).filter(r=>r.apartado===id)}
 function serializePI(blocks,r){const primary=blocks.find(b=>b.id===PI_MAIN);const filas=(primary?.rows||[]).filter(row=>row.some(x=>String(x||'').trim())).map(row=>Object.fromEntries(PI_KEYS.map((k,i)=>[k,String(row[i]||'')])));
  if(filas.length>500)throw Error('El límite son 500 grupos de interés por paquete.');
  const extras=blocks.filter(b=>b.id!==PI_MAIN);const meta={responsable:r.campos?._ordo_responsable||'',cambios:r.campos?._ordo_cambios||'',observaciones:r.campos?._ordo_observaciones||''};
  const texto=extras.length||Object.values(meta).some(Boolean)?PI_PREFIX+JSON.stringify({formato:1,meta,bloques:extras}):'';
  if(texto.length>30000)throw Error('El contenido adicional supera el límite del servidor. Divide el documento.');
  return {texto,filas};
 }
 async function list(host,ctx,id,back){const root=scaffold(host,id,back);const bar=$('div','ode-actions');bar.append(button('+ NUEVO DOCUMENTO',()=>edit(host,ctx,id,back,null),'ode-primary'));root.append(bar);notice(root,'Cargando documentos de Cloudflare…');let data;
  try{data={registros:await loadRecords(id)}}catch(e){root.lastChild.remove();notice(root,'Error de conexión: '+e.message);return}root.querySelector('.ode-notice')?.remove();const rows=(data.registros||[]).filter(x=>x.apartado===id);if(!rows.length){notice(root,'No hay documentos registrados.');return}
  for(const r of rows){const item=$('div','ode-item');const info=$('div');info.append($('strong','',r.codigo+' · '+r.titulo),$('small','',`Rev. ${r.revision} · ${r.estado} · ${r.asignados.length? r.asignados.map(x=>DEPS.find(d=>d[0]===x)?.[1]||x).join(', '):'Sin asignación'}`));const actions=$('div','ode-item-actions');actions.append(button('ABRIR',()=>edit(host,ctx,id,back,r)));item.append(info,actions);root.append(item)}
 }
 function edit(host,ctx,id,back,record){let isNew=!record;const original=record?clone(record):newRecord(id);const approvedOriginal=clone(original);const state={record:original,blocks:parseBlocks(original),tab:'general',dirty:false,assign:new Set(original.asignados||[]),general:original._pi?original.tipo==='general':(original.asignados?.length===DEPS.length),mapa:original.mapaImagen||null};
  const root=scaffold(host,id,()=>list(host,ctx,id,back));
  const current=$('div','ode-current');const currText=$('div');currText.append($('strong','','VERSIÓN EN VIGOR'),$('span','',isNew?'Nuevo documento':`${original.codigo} · Revisión ${original.revision} · ${original.estado}`));current.append(currText,button('GENERAR PDF',()=>{if(state.tab==='general')refreshMeta();state.tab='preview';render();printPDF()},'ode-print'));root.append(current);
  const tabs=$('div','ode-tabs'),content=$('div','ode-content'),message=$('div','ode-message');root.append(tabs);const actions=$('div','ode-actions');root.append(actions,message,content);
  const inputs={};const makeTab=(id,label)=>{const b=button(label,()=>{if(state.tab==='general')refreshMeta();state.tab=id;render()},'ode-tab');b.dataset.tab=id;tabs.append(b)};
  [['general','DATOS GENERALES'],['content','CAPÍTULOS Y APARTADOS'],['preview','VISTA PREVIA'],['history','HISTÓRICO DE REVISIONES'],['assign','ASIGNACIONES']].forEach(([id,label])=>makeTab(id,label));
  const uiValue=()=>Object.fromEntries(Object.entries(inputs).map(([k,x])=>[k,x.value]));
  const mark=()=>{state.dirty=true;message.textContent='Cambios pendientes de grabar en Cloudflare.'};
  function refreshMeta(){if(!inputs.codigo)return;Object.assign(state.record,uiValue())}
  function sectionInput(parent,label,initial,code,type='text'){const f=field(label,initial,type);inputs[code]=f.input;f.input.addEventListener('input',mark);parent.append(f.wrap);return f.input}
  function tabGeneral(){Object.keys(inputs).forEach(k=>delete inputs[k]);const grid=$('div','ode-fields');
    const a=sectionInput(grid,'Código',state.record.codigo,'codigo');const b=sectionInput(grid,'Revisión',state.record.revision,'revision');
    const t=sectionInput(grid,'Título',state.record.titulo,'titulo');t.parentElement.classList.add('ode-wide');
    sectionInput(grid,'Fecha',state.record.fecha,'fecha','date');const status=$('label','ode-field');status.append($('span','','Estado'),$('strong','',state.record.estado));grid.append(status);
    state.record.campos=state.record.campos||{};
    for(const [k,label,type] of [['_ordo_responsable','Responsable (departamento)','text'],['_ordo_cambios','Cambios respecto a la revisión anterior','textarea'],['_ordo_observaciones','Observaciones internas','textarea']]){
      const f=field(label,state.record.campos[k]||'',type);if(type==='textarea')f.wrap.classList.add('ode-wide');f.input.addEventListener('input',()=>{state.record.campos[k]=f.input.value;mark()});grid.append(f.wrap)
    }
    content.append(grid);notice(content,'Cada modificación de contenido vigente requiere una nueva revisión. El histórico se conserva en Cloudflare D1.');}
  function tabAssignments(){const opt=$('div','ode-option');const general=$('input');general.type='checkbox';general.checked=state.general;general.onchange=()=>{state.general=general.checked;boxes.hidden=general.checked;mark()};opt.append(general,$('span','','DOCUMENTO GENERAL UFV · Visible en todos los servicios'));content.append(opt);const boxes=$('div','ode-deps');boxes.hidden=state.general;DEPS.forEach(([key,label])=>{const row=$('label','ode-option'),x=$('input');x.type='checkbox';x.checked=state.assign.has(key);x.onchange=()=>{if(x.checked)state.assign.add(key);else state.assign.delete(key);mark()};row.append(x,$('span','',label));boxes.append(row)});content.append(boxes);notice(content,id==='4.2'?'Las asignaciones se guardan sin modificar la revisión.':'Las asignaciones se guardan con el documento y, si ya está vigente, el servidor actual requiere nueva revisión.')}
  function blockEditor(block,index){const card=$('div','ode-block'),header=$('div','ode-block-head'),name=$('strong','',`Bloque ${index+1} · ${block.kind.toUpperCase()}`);header.append(name,button('SUBIR',()=>move(index,-1)),button('BAJAR',()=>move(index,1)),...(block.id===PI_MAIN?[]:[button('QUITAR',()=>{state.blocks.splice(index,1);mark();render()},'ode-danger')]));card.append(header);
   const title=field('Título del apartado',block.title);title.input.oninput=()=>{block.title=title.input.value;mark()};card.append(title.wrap);
   if(block.kind==='text'||block.kind==='mixed'){const f=field('Texto',block.text||'','textarea');f.input.oninput=()=>{block.text=f.input.value;mark()};card.append(f.wrap)}
   if(block.kind==='table'||block.kind==='mixed'){const tb=$('div','ode-tabletools');const label=field('Encabezados de columnas (separados por ;)',(block.cols||['Columna 1','Columna 2']).join(';'));if(block.id===PI_MAIN)label.input.readOnly=true;label.input.oninput=()=>{block.cols=label.input.value.split(';').map(x=>x.trim()).filter(Boolean).slice(0,10);mark()};tb.append(label.wrap);(block.rows||[]).forEach((r,i)=>{const row=$('div','ode-row');const f=field('Fila '+(i+1)+' · celdas separadas por ;',r.join(';'));f.input.oninput=()=>{block.rows[i]=f.input.value.split(';');mark()};row.append(f.wrap,button('×',()=>{block.rows.splice(i,1);mark();render()}));tb.append(row)});tb.append(button('+ AÑADIR FILA',()=>{block.rows=block.rows||[];block.rows.push([]);mark();render()}));card.append(tb)}
   if(block.kind==='image'||block.kind==='mixed'){const file=$('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.onchange=()=>loadImage(file,block);const hint=$('p','ode-hint','Imagen comprimida para respetar el límite actual de la API. Los originales grandes requerirán un repositorio de archivos centralizado.');card.append(file,hint);if(block.image){const im=$('img','ode-preview-img');im.src=block.image;im.alt=block.title||'Imagen';card.append(im,button('QUITAR IMAGEN',()=>{block.image='';mark();render()}))}}
   return card}
  function move(i,dir){const j=i+dir;if(j<0||j>=state.blocks.length)return;[state.blocks[i],state.blocks[j]]=[state.blocks[j],state.blocks[i]];mark();render()}
  async function loadImage(file,block){const f=file.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)){message.textContent='Formato de imagen no admitido';return}
   const bitmap=await createImageBitmap(f);const canvas=document.createElement('canvas');const scale=Math.min(1,420/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let image='';for(const q of [.65,.45,.3,.18]){image=canvas.toDataURL('image/jpeg',q);if(image.length<18000)break}if(image.length>18000){message.textContent='La imagen supera el tamaño admitido por esta versión del editor. No se ha incorporado.';return}block.image=image;mark();render()}
  function tabContent(){if(id==='4.2'&&!state.blocks.some(b=>b.id===PI_MAIN))state.blocks.unshift(piTable([]));const options=$('div','ode-actions');[['text','+ TEXTO'],['table','+ TABLA'],['image','+ IMAGEN'],['mixed','+ COMBINADO']].forEach(([kind,title])=>options.append(button(title,()=>{state.blocks.push({id:key(),kind,title:'',text:'',cols:['Columna 1','Columna 2'],rows:[],image:''});mark();render()},'ode-primary')));content.append(options);
   const old=historical(state.record);if(old.length&&!state.blocks.length){const legacy=$('details','ode-legacy');legacy.append($('summary','','INFORMACIÓN YA EXISTENTE · Conservada sin alteraciones'));old.forEach(x=>{legacy.append($('strong','',x.title),$('p','',x.body))});content.append(legacy)}
   state.blocks.forEach((block,i)=>content.append(blockEditor(block,i)));
   if(id==='4.4'){const box=$('div','ode-block');box.append($('h3','','Mapa gráfico de procesos'));const file=$('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.onchange=async()=>{const f=file.files[0];if(!f)return;if(f.size>700000){message.textContent='Para el mapa, el archivo debe ser inferior a 700 kB.';return}const reader=new FileReader();reader.onload=()=>{state.mapa=reader.result;mark();render()};reader.readAsDataURL(f)};box.append(file);if(state.mapa){const im=$('img','ode-preview-img');im.src=state.mapa;im.alt='Mapa de procesos';box.append(im,button('QUITAR MAPA',()=>{state.mapa=null;mark();render()}))}content.append(box)}}
  function tabPreview(){const paper=$('article','ode-paper');paper.append($('h2','',state.record.titulo||'Sin título'),$('p','',`${state.record.codigo} · Rev. ${state.record.revision}`));for(const b of state.blocks){paper.append($('h3','',b.title||'Apartado'));if(b.text)paper.append($('p','',b.text));if((b.kind==='table'||b.kind==='mixed')&&b.rows?.length){const table=$('table'),tr=$('tr');(b.cols||[]).forEach(v=>tr.append($('th','',v)));table.append(tr);b.rows.forEach(row=>{const line=$('tr');row.forEach(v=>line.append($('td','',v)));table.append(line)});paper.append(table)}if(b.image){const img=$('img','ode-preview-img');img.src=b.image;img.alt=b.title||'Imagen';paper.append(img)}}if(state.mapa){const img=$('img','ode-preview-img');img.src=state.mapa;paper.append(img)}if(id!=='4.2'&&!state.blocks.length){historical(state.record).forEach(x=>{paper.append($('h3','',x.title),$('p','',x.body))})}content.append(paper)}
  async function tabHistory(){if(isNew){notice(content,'Guarda primero el documento.');return}
    if(id==='4.2'){notice(content,'Cargando revisiones…');try{const data=await request('GET','/api/pi/'+state.record.id+'/history');content.replaceChildren();showHistory((data.revisiones||[]).map(x=>decodePI(x.instantanea)))}catch(e){content.replaceChildren();notice(content,e.message)};return}
    showHistory(state.record.historial||[]);
  }
  function showHistory(items){if(!items.length){notice(content,'No hay revisiones anteriores.');return}items.slice().reverse().forEach(x=>{const item=$('div','ode-item');item.append($('strong','',`Revisión ${x.revision} · ${x.fecha||''}`));item.append(button('CONSULTAR',()=>{const previous=clone(state.record),previousBlocks=clone(state.blocks);state.record=clone(x);state.blocks=parseBlocks(x);state.tab='preview';render();content.prepend(button('VOLVER A REVISIÓN ACTUAL',()=>{state.record=previous;state.blocks=previousBlocks;state.tab='history';render()}))}));content.append(item)})}
  async function save(approve=false){refreshMeta();const r=state.record;
    if(!r.codigo.trim()||!r.titulo.trim()||!r.revision.trim()||!r.fecha)throw Error('Indica código, título, revisión y fecha.');
    const dest=state.general?DEPS.map(([k])=>k):[...state.assign];if(!dest.length)throw Error('Selecciona al menos un departamento o marca General UFV.');
    if(id==='4.2'){
      const {texto,filas}=serializePI(state.blocks,r);if(approve&&!filas.length)throw Error('Para aprobar, introduce al menos un grupo de interés.');
      const data={codigo:r.codigo.trim(),titulo:r.titulo.trim(),revision:r.revision.trim(),fecha:r.fecha,texto,filas,aprobar:approve};
      let packet;
      if(isNew){const created=await request('POST','/api/pi',{...data,tipo:state.general?'general':'especifico',departamentos:state.general?[]:dest});packet=created.paquete;
        if(approve){const result=await request('PUT','/api/pi/'+packet.id,{...data,version:packet.version});packet=result.paquete;}}
      else {const old=approvedOriginal;if(old?.estado==='obsoleto')throw Error('El paquete es obsoleto. Reactívalo antes de editar.');
        if(old?.estado==='vigente'&&r.revision===old.revision)throw Error('Es necesario crear una nueva revisión para modificar un documento vigente.');
        const result=await request('PUT','/api/pi/'+r.id,{...data,version:r.version});packet=result.paquete;
        if(old?.tipo!==(state.general?'general':'especifico')||(!state.general&&JSON.stringify(old?.departamentos||[])!==JSON.stringify(dest))){
          const assigned=await request('PATCH','/api/pi/'+packet.id+'/distribution',{tipo:state.general?'general':'especifico',departamentos:state.general?[]:dest});packet=assigned.paquete;}
      }
      state.record=decodePI(packet);
    }else{
      const campos={...(r.campos||{})};const serial=JSON.stringify(state.blocks);if(serial.length>30000)throw Error('El contenido supera el límite del servidor (30.000 caracteres). Divide el documento.');
      campos._ordo_bloques=serial;
      const payload={apartado:id,codigo:r.codigo.trim(),titulo:r.titulo.trim(),fecha:r.fecha,revision:r.revision.trim(),campos,asignados:dest,mapaImagen:id==='4.4'?state.mapa:null};
      const result=await request(isNew?'POST':'PUT','/api/contexto'+(isNew?'':'/'+r.id),isNew?payload:{...payload,version:r.version});state.record=result.registro;
    }
    isNew=false;state.blocks=parseBlocks(state.record);state.assign=new Set(state.record.asignados);state.general=id==='4.2'?state.record.tipo==='general':state.record.asignados.length===DEPS.length;
    Object.assign(approvedOriginal,clone(state.record));state.tab='general';state.dirty=false;render();message.textContent='Documento guardado en Cloudflare D1.';
  }
  async function distribute(){if(isNew)return save();if(id!=='4.2')return save();
    const dest=state.general?[]:[...state.assign];if(!state.general&&!dest.length)throw Error('Selecciona un departamento.');
    const result=await request('PATCH','/api/pi/'+state.record.id+'/distribution',{tipo:state.general?'general':'especifico',departamentos:dest});
    state.record=decodePI(result.paquete);state.dirty=false;message.textContent='Asignaciones actualizadas sin crear una revisión.';
  }
  async function obsolete(){if(isNew)return;if(!confirm('¿Pasar a obsoleto el documento?'))return;
    if(id==='4.2')await request('POST','/api/pi/'+state.record.id+'/obsolete');
    else await request('PATCH','/api/contexto/'+state.record.id+'/estado',{estado:'Obsoleto',version:state.record.version});
    await list(host,ctx,id,back)
  }
  function printPDF(){const x=content.querySelector('article');if(!x)return;const w=window.open('','_blank');if(!w){alert('Permite ventanas emergentes');return};
    const layout='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Documento · Copia no controlada</title><style>@page{margin:15mm}body{font-family:sans-serif;margin:30px;color:#273c4c}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #879ead;padding:6px;white-space:pre-wrap}article p{white-space:pre-wrap}footer{position:fixed;bottom:0;left:0;right:0;text-align:center;border-top:1px solid #9aa;padding:7px}</style></head><body>';
    w.document.open();w.document.write(layout+x.outerHTML+'<footer>COPIA NO CONTROLADA</footer></body></html>');w.document.close();w.onload=()=>w.print();
  }
  function render(){tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.tab===state.tab));content.replaceChildren();actions.replaceChildren();
    if(state.tab==='general')tabGeneral();else if(state.tab==='content')tabContent();else if(state.tab==='assign')tabAssignments();else if(state.tab==='preview')tabPreview();else tabHistory();
    if(['general','content','assign'].includes(state.tab)){
      actions.append(button('GRABAR DOCUMENTO',async()=>{try{await save(false)}catch(e){message.textContent=e.message}},'ode-primary'));
      if(id==='4.2')actions.append(button('APROBAR DOCUMENTO',async()=>{try{await save(true)}catch(e){message.textContent=e.message}},'ode-approve'));
      if(!isNew){actions.append(button('NUEVA REVISIÓN',()=>{const previous=String(state.record.revision);const guess=/^\d+$/.test(previous)?String(Number(previous)+1):'';state.record.revision=guess;state.tab='general';render();message.textContent='Indica la nueva revisión, edita el contenido y graba.';}));
        if(state.tab==='assign'&&id==='4.2')actions.append(button('GUARDAR SOLO ASIGNACIONES',async()=>{try{await distribute()}catch(e){message.textContent=e.message}},'ode-primary'));
        actions.append(button('PASAR A OBSOLETO',async()=>{try{await obsolete()}catch(e){message.textContent=e.message}},'ode-danger'));
      }
    }
    if(state.tab==='preview')actions.append(button('GENERAR PDF · COPIA NO CONTROLADA',printPDF,'ode-print'));
  }
  render();
 }
 function mostrar(host,ctx,id,back){if(ctx.modo!=='calidad')return;return list(host,ctx,id,back)}
 window.OrdoEditor=Object.freeze({mostrar});
})();
