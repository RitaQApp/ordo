/* ordo · editor documental común (Calidad). Persistencia exclusiva en Cloudflare mediante OrdoAPI.
   Compatible con /api/contexto y /api/pi para los cuatro gorditos. Sin almacenamiento local. */
(()=>{'use strict';
 const DEPS=[['servicios','Servicios Generales'],['biblioteca','Biblioteca'],['editorial','Editorial'],['acompanamiento','Instituto de Acompañamiento'],['colegio_mayor','Colegio Mayor']];
 const $=(tag,cls='',value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
 const button=(label,click,cls='')=>{const el=$('button','ode-button '+cls,label);el.type='button';el.onclick=()=>Promise.resolve(click()).catch(e=>alert(e.message));return el};
 const key=()=>{
   // Los identificadores de bloques no son credenciales: evitar que falle el editor si randomUUID no está disponible.
   if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
   const bytes=new Uint8Array(16);
   if(typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function')crypto.getRandomValues(bytes);
   else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
   return 'bloque-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 };
 const request=(method,path,data)=>window.OrdoAPI.request(method,path,data);
 const nameOf=id=>({'4.1':'Contexto interno y externo','4.2':'Partes interesadas','4.3':'Alcance del Sistema','4.4':'Mapa e interacción de procesos'})[id]||id;
 function field(label,value='',type='text'){const wrap=$('label','ode-field'),cap=$('span','',label),input=$(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value??'';input.autocomplete='off';wrap.append(cap,input);return {wrap,input}}
 function notice(root,text){root.append($('p','ode-notice',text))}
 function scaffold(host,id,back){host.replaceChildren();const root=$('section','c4 ode');const h=$('div','ode-heading');h.append($('h1','',id+' · '+nameOf(id)),button('← VOLVER',back));root.append(h);host.append(root);return root}
 function newRecord(id){return {id:key(),apartado:id,codigo:id.replace('.','')+'-',titulo:'',fecha:new Date().toISOString().slice(0,10),revision:'0',estado:id==='4.2'?'borrador':'Borrador',campos:{},asignados:[],mapaImagen:null}}
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
  const campos={_ordo_bloques:JSON.stringify([...((p.filas||[]).length?[piTable(p.filas)]:[]),...extra]),_ordo_responsable:meta.responsable||'',_ordo_cambios:meta.cambios||'',_ordo_observaciones:meta.observaciones||''};
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
  [['general','DATOS GENERALES'],['content','CAPÍTULOS Y APARTADOS'],['preview','VISTA PREVIA'],['history','HISTÓRICO Y ASIGNACIONES']].forEach(([id,label])=>makeTab(id,label));
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
  function tabAssignments(){const opt=$('div','ode-option');const general=$('input');general.type='checkbox';general.checked=state.general;
    general.onchange=()=>{state.general=general.checked;boxes.hidden=general.checked;mark()};
    opt.append(general,$('span','','GENERAL UFV · Visible en todos los servicios tras aprobar'));content.append(opt);
    const boxes=$('div','ode-deps');boxes.hidden=state.general;
    DEPS.forEach(([code,name])=>{const row=$('label','ode-option'),el=$('input');el.type='checkbox';el.checked=state.assign.has(code);el.onchange=()=>{if(el.checked)state.assign.add(code);else state.assign.delete(code);mark()};row.append(el,$('span','',name));boxes.append(row)});content.append(boxes);
    notice(content,'Las asignaciones se aplican al aprobar el paquete completo. Los borradores todavía no se distribuyen.');
  }
  function parseSeparated(raw,delimiter){
    const out=[], row=[];let value='',quoted=false;
    for(let i=0;i<raw.length;i++){const c=raw[i];
      if(c==='"'){if(quoted&&raw[i+1]==='"'){value+='"';i++}else quoted=!quoted}
      else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(value);value='';if(c!==delimiter){out.push(row.splice(0));if(c==='\r'&&raw[i+1]==='\n')i++}}
      else value+=c;
    }
    if(value||row.length){row.push(value);out.push(row)}
    while(out.length&&out[out.length-1].every(v=>!v.trim()))out.pop();
    const max=Math.max(0,...out.map(r=>r.length));return out.map(r=>Array.from({length:max},(_,i)=>r[i]||''));
  }
  function readImportedTable(raw,html){
    if(html){const doc=new DOMParser().parseFromString(html,'text/html');const tbl=doc.querySelector('table');if(tbl){const matrix=Array.from(tbl.rows).map(tr=>Array.from(tr.cells).map(td=>td.textContent.trim()));if(matrix.length)return matrix}}
    const trimmed=(raw||'').trim();if(!trimmed)return [];
    return parseSeparated(trimmed,trimmed.includes('\t')?'\t':(trimmed.includes(';')?';':','));
  }
  function loadTableMatrix(block,matrix){
    if(!matrix.length)throw Error('La tabla no contiene datos.');
    if(matrix.length>501||matrix.some(r=>r.length>10))throw Error('La tabla supera 500 filas o 10 columnas. Divídela.');
    if(block.id===PI_MAIN){
      // Mantener los encabezados estándar del registro histórico de partes interesadas.
      if(matrix[0].length!==PI_KEYS.length)throw Error('La tabla de partes interesadas requiere exactamente 6 columnas.');
      block.cols=[...PI_LABELS];block.rows=matrix.slice(matrix[0].some(x=>/grupo|expectativa|inter[eé]s/i.test(x))?1:0).map(r=>r.slice(0,6));
    }else{
      block.cols=matrix[0].map((x,i)=>x||'Columna '+(i+1));block.rows=matrix.slice(1);
    }
    mark();render();message.textContent='Tabla incorporada. Comprueba los encabezados antes de grabar.';
  }
  async function readXlsx(file){
    if(file.size>1500000)throw Error('El archivo Excel supera 1,5 MB. Copia y pega la tabla o exporta a CSV.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const u16=i=>bytes[i]|(bytes[i+1]<<8),u32=i=>(bytes[i]|(bytes[i+1]<<8)|(bytes[i+2]<<16)|(bytes[i+3]<<24))>>>0;
    let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--)if(u32(i)===0x06054b50){end=i;break}
    if(end<0)throw Error('No es un archivo XLSX válido.');
    let pos=u32(end+16);const files=new Map();
    for(let n=0;n<u16(end+10);n++){
      if(u32(pos)!==0x02014b50)break;
      const method=u16(pos+10),size=u32(pos+20),length=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32),offset=u32(pos+42);
      const filename=new TextDecoder().decode(bytes.slice(pos+46,pos+46+length));files.set(filename,{method,size,offset});
      pos+=46+length+extra+comment;
    }
    async function xml(path){const entry=files.get(path);if(!entry)return null;
      const o=entry.offset;if(u32(o)!==0x04034b50)throw Error('Archivo XLSX dañado.');
      const start=o+30+u16(o+26)+u16(o+28);const compressed=bytes.slice(start,start+entry.size);
      let raw;
      if(entry.method===0)raw=compressed;
      else if(entry.method===8){if(!('DecompressionStream' in window))throw Error('Este navegador no admite importar XLSX. Pega las celdas desde Excel.');
        raw=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      }else throw Error('Compresión XLSX no admitida.');
      return new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
    }
    const shared=await xml('xl/sharedStrings.xml');const strings=shared?Array.from(shared.getElementsByTagName('si')).map(x=>Array.from(x.getElementsByTagName('t')).map(t=>t.textContent).join('')):[];
    const sheet=await xml('xl/worksheets/sheet1.xml');if(!sheet)throw Error('No encuentro la primera hoja del Excel.');
    const rows=[];for(const r of Array.from(sheet.getElementsByTagName('row')).slice(0,501)){
      const arr=[];for(const cell of Array.from(r.getElementsByTagName('c'))){
        const ref=cell.getAttribute('r')||'A1';const letters=ref.match(/^[A-Z]+/i)?.[0]||'A';let idx=0;for(const ch of letters.toUpperCase())idx=idx*26+ch.charCodeAt(0)-64;idx--;
        if(idx>=10)throw Error('La tabla Excel supera 10 columnas.');
        const raw=cell.getElementsByTagName('v')[0]?.textContent||'';arr[idx]=cell.getAttribute('t')==='s'?strings[Number(raw)]||'':cell.getAttribute('t')==='inlineStr'?Array.from(cell.getElementsByTagName('t')).map(x=>x.textContent).join(''):raw;
      }
      rows.push(arr.map(v=>String(v??'')));
    }
    return rows.filter(r=>r.some(v=>v.trim()));
  }
  async function importTableFile(block,file){
    if(!file)return;
    if(/\.xlsx$/i.test(file.name)){loadTableMatrix(block,await readXlsx(file));return;}
    if(!/\.(csv|tsv|txt|html?|htm)$/i.test(file.name))throw Error('Arrastra Excel XLSX, CSV, TSV o HTML, o pega una tabla copiada.');
    if(file.size>350000)throw Error('Archivo demasiado grande para el editor.');
    const raw=await file.text();loadTableMatrix(block,readImportedTable(raw,/\.html?$/i.test(file.name)?raw:null));
  }
  // La zona enfocada recibe realmente Cmd/Ctrl+V. No se intercepta el pegado
  // en los campos normales del documento.
  function makeDropArea(title,help){
    const area=$('div','ode-drop');area.tabIndex=0;area.setAttribute('role','group');
    area.setAttribute('aria-label',title+'; selecciona esta zona para pegar con Control o Comando V');
    area.append($('strong','',title),$('small','',help));
    const focus=$('button','ode-paste-focus','CLIC AQUÍ PARA PEGAR (⌘/Ctrl+V)');
    focus.type='button';focus.onclick=()=>area.focus();area.append(focus);
    area.addEventListener('click',ev=>{if(ev.target===area||ev.target.tagName==='STRONG'||ev.target.tagName==='SMALL')area.focus()});
    return area;
  }
  function tableImportArea(block){
    const box=makeDropArea('PEGAR O ARRASTRAR TABLA','Haz clic aquí y pega celdas desde Excel, Numbers o una tabla web. También puedes arrastrar un archivo XLSX, CSV, TSV o HTML.');
    const file=$('input');file.type='file';file.accept='.xlsx,.csv,.tsv,.txt,.html,.htm,text/csv,text/tab-separated-values,text/html';file.setAttribute('aria-label','Elegir archivo de tabla');
    file.onchange=()=>importTableFile(block,file.files?.[0]).catch(e=>{message.textContent=e.message});box.append(file);
    function receiveText(dt){
      const raw=dt?.getData('text/plain')||'',html=dt?.getData('text/html')||'';
      const matrix=readImportedTable(raw,html);
      if(!matrix.length)throw Error('No se ha recibido una tabla. Copia primero las celdas de Excel o selecciona un archivo.');
      loadTableMatrix(block,matrix);
    }
    box.addEventListener('paste',ev=>{
      ev.preventDefault();ev.stopPropagation();
      try{receiveText(ev.clipboardData)}catch(e){message.textContent=e.message}
    });
    box.addEventListener('dragenter',ev=>{ev.preventDefault();box.classList.add('ode-drag')});
    box.addEventListener('dragover',ev=>{ev.preventDefault();ev.dataTransfer.dropEffect='copy';box.classList.add('ode-drag')});
    box.addEventListener('dragleave',ev=>{if(!box.contains(ev.relatedTarget))box.classList.remove('ode-drag')});
    box.addEventListener('drop',ev=>{
      ev.preventDefault();ev.stopPropagation();box.classList.remove('ode-drag');
      const f=ev.dataTransfer?.files?.[0];
      if(f)importTableFile(block,f).catch(e=>{message.textContent=e.message});
      else{try{receiveText(ev.dataTransfer)}catch(e){message.textContent=e.message}}
    });
    return box;
  }
  function imageImportArea(block){
    const box=makeDropArea('PEGAR O ARRASTRAR IMAGEN','Haz clic aquí y pega una imagen copiada o una captura de pantalla con ⌘/Ctrl+V. Arrastra JPG, PNG o WebP; también puedes seleccionar un archivo.');
    const file=$('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.setAttribute('aria-label','Elegir archivo de imagen');
    file.onchange=()=>loadImageFile(file.files?.[0],block).catch(e=>{message.textContent=e.message});box.append(file);
    function receiveImage(dt){
      const items=Array.from(dt?.items||[]);
      const image=items.find(i=>i.kind==='file'&&i.type.startsWith('image/'))?.getAsFile()
        ||Array.from(dt?.files||[]).find(f=>f.type.startsWith('image/'));
      if(!image){message.textContent='No se ha recibido una imagen. Copia la imagen, no su dirección web, o arrastra un archivo PNG, JPG o WebP.';return}
      loadImageFile(image,block).catch(e=>{message.textContent=e.message});
    }
    box.addEventListener('paste',ev=>{ev.preventDefault();ev.stopPropagation();receiveImage(ev.clipboardData)});
    box.addEventListener('dragenter',ev=>{ev.preventDefault();box.classList.add('ode-drag')});
    box.addEventListener('dragover',ev=>{ev.preventDefault();ev.dataTransfer.dropEffect='copy';box.classList.add('ode-drag')});
    box.addEventListener('dragleave',ev=>{if(!box.contains(ev.relatedTarget))box.classList.remove('ode-drag')});
    box.addEventListener('drop',ev=>{ev.preventDefault();ev.stopPropagation();box.classList.remove('ode-drag');receiveImage(ev.dataTransfer)});
    return box;
  }
  function blockEditor(block,index){
   const card=$('div','ode-block'),header=$('div','ode-block-head');
   const types=[['text','TEXTO'],['table','TABLA'],['image','IMAGEN'],['mixed','COMBINADO']];
   const name=$('strong','',`Bloque ${index+1}`),selector=$('select','ode-block-type');
   selector.setAttribute('aria-label',`Tipo de contenido del bloque ${index+1}`);
   types.forEach(([value,label])=>{const option=$('option','',label);option.value=value;selector.append(option)});
   selector.value=types.some(([value])=>value===block.kind)?block.kind:'text';
   selector.onchange=()=>{
     // La tabla histórica PI se conserva como un bloque normal si deja de ser una tabla.
     // Se conservan texto, filas e imagen al cambiar de modalidad, para recuperarlos al volver.
     if(block.id===PI_MAIN&&selector.value!=='table'&&selector.value!=='mixed')block.id=key();
     block.kind=selector.value;
     block.cols=block.cols||['Columna 1','Columna 2'];
     block.rows=block.rows||[];
     block.text=block.text||'';
     block.image=block.image||'';
     mark();render();
   };
   header.append(name,selector,button('SUBIR',()=>move(index,-1)),button('BAJAR',()=>move(index,1)),button('QUITAR',()=>{state.blocks.splice(index,1);mark();render()},'ode-danger'));card.append(header);
   const title=field('Título del apartado',block.title);title.input.oninput=()=>{block.title=title.input.value;mark()};card.append(title.wrap);
   if(block.kind==='text'||block.kind==='mixed'){const f=field('Texto',block.text||'','textarea');f.input.oninput=()=>{block.text=f.input.value;mark()};card.append(f.wrap)}
   if(block.kind==='table'||block.kind==='mixed'){const tb=$('div','ode-tabletools');const label=field('Encabezados de columnas (separados por ;)',(block.cols||['Columna 1','Columna 2']).join(';'));if(block.id===PI_MAIN)label.input.readOnly=true;label.input.oninput=()=>{block.cols=label.input.value.split(';').map(x=>x.trim()).filter(Boolean).slice(0,10);mark()};tb.append(label.wrap);(block.rows||[]).forEach((r,i)=>{const row=$('div','ode-row');const f=field('Fila '+(i+1)+' · celdas separadas por ;',r.join(';'));f.input.oninput=()=>{block.rows[i]=f.input.value.split(';');mark()};row.append(f.wrap,button('×',()=>{block.rows.splice(i,1);mark();render()}));tb.append(row)});tb.append(button('+ AÑADIR FILA',()=>{block.rows=block.rows||[];block.rows.push([]);mark();render()}));tb.prepend(tableImportArea(block));card.append(tb)}
   if(block.kind==='image'||block.kind==='mixed'){card.append(imageImportArea(block));const hint=$('p','ode-hint','La imagen se reduce para respetar el límite actual de la API.');card.append(hint);if(block.image){const im=$('img','ode-preview-img');im.src=block.image;im.alt=block.title||'Imagen';card.append(im,button('QUITAR IMAGEN',()=>{block.image='';mark();render()}))}}
   return card}
  function move(i,dir){const j=i+dir;if(j<0||j>=state.blocks.length)return;[state.blocks[i],state.blocks[j]]=[state.blocks[j],state.blocks[i]];mark();render()}
  async function loadImageFile(f,block){
   if(!f)return;
   if(!['image/png','image/jpeg','image/webp'].includes(f.type))throw Error('Formato no admitido. Utiliza PNG, JPG o WebP.');
   if(f.size>12000000)throw Error('Imagen demasiado grande. Utiliza un archivo inferior a 12 MB.');
   const bitmap=await createImageBitmap(f);
   const canvas=document.createElement('canvas');const scale=Math.min(1,420/Math.max(bitmap.width,bitmap.height));
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   let image='';for(const q of [.65,.45,.3,.18]){image=canvas.toDataURL('image/jpeg',q);if(image.length<18000)break}
   if(image.length>18000)throw Error('La imagen supera el tamaño admitido actualmente por el servidor. Prueba con una imagen más sencilla.');
   block.image=image;mark();render();message.textContent='Imagen incorporada al bloque. Graba el documento para almacenarla en Cloudflare.';
  }
  function tabContent(){const options=$('div','ode-actions');[['text','+ TEXTO'],['table','+ TABLA'],['image','+ IMAGEN'],['mixed','+ COMBINADO']].forEach(([kind,title])=>options.append(button(title,()=>{state.blocks.push({id:key(),kind,title:'',text:'',cols:['Columna 1','Columna 2'],rows:[],image:''});mark();render()},'ode-primary')));content.append(options);
   const old=historical(state.record);if(old.length&&!state.blocks.length){const legacy=$('details','ode-legacy');legacy.append($('summary','','INFORMACIÓN YA EXISTENTE · Conservada sin alteraciones'));old.forEach(x=>{legacy.append($('strong','',x.title),$('p','',x.body))});content.append(legacy)}
   state.blocks.forEach((block,i)=>content.append(blockEditor(block,i)));
   if(id==='4.4'){const box=$('div','ode-block');box.append($('h3','','Mapa gráfico de procesos'));const file=$('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.onchange=async()=>{const f=file.files[0];if(!f)return;if(f.size>700000){message.textContent='Para el mapa, el archivo debe ser inferior a 700 kB.';return}const reader=new FileReader();reader.onload=()=>{state.mapa=reader.result;mark();render()};reader.readAsDataURL(f)};box.append(file);if(state.mapa){const im=$('img','ode-preview-img');im.src=state.mapa;im.alt='Mapa de procesos';box.append(im,button('QUITAR MAPA',()=>{state.mapa=null;mark();render()}))}content.append(box)}}
  function tabPreview(){const paper=$('article','ode-paper');paper.append($('h2','',state.record.titulo||'Sin título'),$('p','',`${state.record.codigo} · Rev. ${state.record.revision}`));for(const b of state.blocks){paper.append($('h3','',b.title||'Apartado'));if(b.text)paper.append($('p','',b.text));if((b.kind==='table'||b.kind==='mixed')&&b.rows?.length){const table=$('table'),tr=$('tr');(b.cols||[]).forEach(v=>tr.append($('th','',v)));table.append(tr);b.rows.forEach(row=>{const line=$('tr');row.forEach(v=>line.append($('td','',v)));table.append(line)});paper.append(table)}if(b.image){const img=$('img','ode-preview-img');img.src=b.image;img.alt=b.title||'Imagen';paper.append(img)}}if(state.mapa){const img=$('img','ode-preview-img');img.src=state.mapa;paper.append(img)}if(id!=='4.2'&&!state.blocks.length){historical(state.record).forEach(x=>{paper.append($('h3','',x.title),$('p','',x.body))})}content.append(paper)}
  async function tabHistory(){
    const heading=$('h2','','Asignaciones del paquete terminado');content.append(heading);
    tabAssignments();
    const control=$('div','ode-actions');content.append(control);
    if(!isNew){
      if(id==='4.2'&&state.record.estado==='vigente'){
        control.append(button('ACTUALIZAR ASIGNACIONES',async()=>{try{await distribute()}catch(e){message.textContent=e.message}},'ode-primary'));
      }
      if(id!=='4.2'&&state.record.estado==='Vigente')notice(content,'Para redistribuir un documento vigente, crea una nueva revisión y apruébala.');
    }
    if(!isNew&&(state.record.estado==='borrador'||state.record.estado==='Borrador'||state.record.revision!==approvedOriginal.revision)){
      control.append(button('APROBAR Y ASIGNAR',async()=>{try{await save(true)}catch(e){message.textContent=e.message}},'ode-approve'));
    }
    const title=$('h2','','Histórico de revisiones');content.append(title);
    if(isNew){notice(content,'Graba primero el borrador. Después podrás asignarlo y aprobarlo aquí.');return}
    if(id==='4.2'){
      const loading=$('p','ode-notice','Cargando revisiones…');content.append(loading);
      try{const data=await request('GET','/api/pi/'+state.record.id+'/history');loading.remove();showHistory((data.revisiones||[]).map(x=>decodePI(x.instantanea)))}
      catch(e){loading.textContent=e.message};return;
    }
    showHistory(state.record.historial||[]);
  }
  function showHistory(items){if(!items.length){notice(content,'No hay revisiones anteriores.');return}items.slice().reverse().forEach(x=>{const item=$('div','ode-item');item.append($('strong','',`Revisión ${x.revision} · ${x.fecha||''}`));item.append(button('CONSULTAR',()=>{const previous=clone(state.record),previousBlocks=clone(state.blocks);state.record=clone(x);state.blocks=parseBlocks(x);state.tab='preview';render();content.prepend(button('VOLVER A REVISIÓN ACTUAL',()=>{state.record=previous;state.blocks=previousBlocks;state.tab='history';render()}))}));content.append(item)})}
  async function save(approve=false){refreshMeta();const r=state.record;
    if(!r.codigo.trim()||!r.titulo.trim()||!r.revision.trim()||!r.fecha)throw Error('Indica código, título, revisión y fecha.');
    const dest=state.general?DEPS.map(([k])=>k):[...state.assign];if(approve&&!dest.length)throw Error('Selecciona al menos un departamento antes de aprobar.');
    if(id==='4.2'){
      const {texto,filas}=serializePI(state.blocks,r);if(approve&&!filas.length&&!state.blocks.some(b=>b.id!==PI_MAIN&&(b.text||b.image||b.rows?.length)))throw Error('Introduce contenido antes de aprobar.');
      const data={codigo:r.codigo.trim(),titulo:r.titulo.trim(),revision:r.revision.trim(),fecha:r.fecha,texto,filas,aprobar:approve};
      let packet;
      if(isNew){const created=await request('POST','/api/pi',{...data,aprobar:false,tipo:'especifico',departamentos:[]});packet=created.paquete;}
      if(!isNew){if(approvedOriginal?.estado==='obsoleto')throw Error('El paquete está obsoleto.');
        if(approvedOriginal?.estado==='vigente'&&r.revision===approvedOriginal.revision)throw Error('Crea una nueva revisión antes de modificar un documento vigente.');
      }
      const body={...data,aprobar:approve,version:packet?.version??r.version};
      if(approve){body.tipo=state.general?'general':'especifico';body.departamentos=state.general?[]:dest;}
      const result=await request('PUT','/api/pi/'+(packet?.id||r.id),body);packet=result.paquete;
      state.record=decodePI(packet);
    }else{
      const campos={...(r.campos||{})};const serial=JSON.stringify(state.blocks);if(serial.length>30000)throw Error('El contenido supera el límite del servidor (30.000 caracteres). Divide el documento.');
      campos._ordo_bloques=serial;
      const payload={apartado:id,codigo:r.codigo.trim(),titulo:r.titulo.trim(),fecha:r.fecha,revision:r.revision.trim(),campos,asignados:[],mapaImagen:id==='4.4'?state.mapa:null};
      let result;
      if(approve){
        // El documento se conserva en borrador hasta su aprobación y distribución atómica.
        if(isNew)throw Error('Graba primero el borrador. Después apruébalo desde Histórico y Asignaciones.');
        if(r.estado==='Vigente'&&r.revision===approvedOriginal.revision)throw Error('Crea una nueva revisión antes de aprobar cambios.');
        result=await request('PATCH','/api/contexto/'+r.id+'/estado',{estado:'Vigente',asignados:dest,version:r.version});
      }else{
        result=await request(isNew?'POST':'PUT','/api/contexto'+(isNew?'':'/'+r.id),isNew?payload:{...payload,version:r.version});
      }
      state.record=result.registro;
    }
    isNew=false;state.blocks=parseBlocks(state.record);state.assign=new Set(state.record.asignados);state.general=id==='4.2'?state.record.tipo==='general':state.record.asignados.length===DEPS.length;
    Object.assign(approvedOriginal,clone(state.record));state.tab=approve?'history':'general';state.dirty=false;render();message.textContent=approve?'Documento aprobado y asignado en Cloudflare D1.':'Borrador guardado en Cloudflare D1.';
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
    if(state.tab==='general')tabGeneral();else if(state.tab==='content')tabContent();else if(state.tab==='preview')tabPreview();else tabHistory();
    if(['general','content'].includes(state.tab)){
      actions.append(button('GRABAR DOCUMENTO',async()=>{try{await save(false)}catch(e){message.textContent=e.message}},'ode-primary'));
      actions.append(button('IR A APROBACIÓN Y ASIGNACIONES',()=>{if(state.tab==='general')refreshMeta();state.tab='history';render()},'ode-approve'));
      if(!isNew){actions.append(button('NUEVA REVISIÓN',()=>{const previous=String(state.record.revision);const guess=/^\d+$/.test(previous)?String(Number(previous)+1):'';state.record.revision=guess;state.tab='general';render();message.textContent='Indica la nueva revisión, edita el contenido y graba.';}));

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
