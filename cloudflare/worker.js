/* ordo · API del apartado 4.2. Persistencia EXCLUSIVA en Cloudflare D1.
   Autorización real en servidor. Sin cookies, localStorage ni sessionStorage.
   Las sesiones viven en RAM del navegador y caducan; se vuelve a autenticar al recargar.
*/
const DEPTS=['calidad','servicios','biblioteca','editorial','acompanamiento','colegio_mayor'];
const DEPT_ENV={calidad:'PASSWORD_CALIDAD',servicios:'PASSWORD_SERVICIOS',biblioteca:'PASSWORD_BIBLIOTECA',editorial:'PASSWORD_EDITORIAL',acompanamiento:'PASSWORD_ACOMPANAMIENTO',colegio_mayor:'PASSWORD_COLEGIO_MAYOR'};
const KEYS=['grupo','descripcion','interes_ufv','necesidades','comunicacion','seguimiento'];
const enc=new TextEncoder();
const respond=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const un64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const hmac=async(secret,payload)=>{const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',k,enc.encode(payload)))};
const safeEqual=(a,b)=>{let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0};
const parseJSON=async req=>{const s=await req.text();if(s.length>130000)throw Error('Contenido demasiado grande');return JSON.parse(s)};
const uuid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const verify=async(req,env)=>{
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');const [body,sig]=token.split('.');
 if(!body||!sig||!env.SESSION_SECRET||!safeEqual(sig,await hmac(env.SESSION_SECRET,body)))return null;
 try{const data=JSON.parse(new TextDecoder().decode(un64(body)));if(data.exp<Date.now()||!DEPTS.includes(data.department))return null;return data.department}catch{return null}
};
const packet=r=>r&&({...r,compartida:!!r.compartida,departamentos:JSON.parse(r.departamentos),filas:JSON.parse(r.filas)});
const visible=(p,department,aux)=>department==='calidad'||(p.estado==='vigente'&&(p.tipo==='general'||(!aux&&p.departamentos.includes(department))||(aux&&p.compartida&&p.departamentos.includes(aux)&&aux!==department)));
const owns=(p,department)=>p.tipo==='especifico'&&p.departamentos.length===1&&p.departamentos[0]===department;
const pick=p=>({codigo:String(p.codigo||'').trim(),titulo:String(p.titulo||'').trim(),tipo:p.tipo==='general'?'general':'especifico',departamentos:p.tipo==='general'?[]:p.departamentos,revision:String(p.revision||'').trim(),fecha:String(p.fecha||'').trim(),texto:String(p.texto||''),filas:p.filas});
const valid=p=>p.codigo&&p.codigo.length<=60&&p.titulo&&p.titulo.length<=200&&p.revision&&p.revision.length<=40&&/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)&&Array.isArray(p.departamentos)&&p.departamentos.every(d=>DEPTS.includes(d)&&d!=='calidad')&&(p.tipo==='general'||p.departamentos.length>0)&&Array.isArray(p.filas)&&p.filas.length<=500&&p.filas.every(f=>f&&KEYS.every(k=>typeof f[k]==='string'&&f[k].length<=8000))&&p.texto.length<=30000;
const values=p=>[p.codigo,p.titulo,p.tipo,JSON.stringify(p.departamentos),p.tipo==='general'?1:p.compartida?1:0,p.revision,p.fecha,p.estado,p.texto,JSON.stringify(p.filas)];
const event=async(env,id,actor,accion,detalle={})=>env.DB.prepare('INSERT INTO eventos (id,paquete_id,actor_departamento,accion,detalle) VALUES (?,?,?,?,?)').bind(uuid(),id,actor,accion,JSON.stringify(detalle)).run();
const view=async(env,id)=>packet(await env.DB.prepare('SELECT * FROM paquetes WHERE id=?').bind(id).first());
async function route(req,env,actor,url){
 const path=url.pathname,method=req.method;
 if(path==='/api/pi'&&method==='GET'){
  const aux=url.searchParams.get('aux')||null;
  if(aux&&(!DEPTS.includes(aux)||aux==='calidad'||aux===actor))return respond({error:'Destino auxiliar incorrecto'},400);
  const r=await env.DB.prepare('SELECT * FROM paquetes ORDER BY codigo COLLATE NOCASE').all();
  return respond({departamento:actor,paquetes:r.results.map(packet).filter(p=>visible(p,actor,aux))});
 }
 const match=path.match(/^\/api\/pi\/([a-zA-Z0-9_-]+)(?:\/(history|distribution|visibility|obsolete|reactivate))?$/);
 if(path==='/api/pi'&&method==='POST'){
  if(actor!=='calidad')return respond({error:'Solo Calidad puede crear paquetes'},403);
  const indata=await parseJSON(req),p={...pick(indata),compartida:indata.tipo==='general',estado:'borrador'};
  if(!valid(p)||p.codigo.length<3)return respond({error:'Datos incorrectos o asignación vacía'},400);
  const id=uuid();try{
   await env.DB.prepare(`INSERT INTO paquetes (id,codigo,titulo,tipo,departamentos,compartida,revision,fecha,estado,texto,filas) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,...values(p)).run();await event(env,id,actor,'alta');
   return respond({paquete:await view(env,id)},201);
  }catch(e){if(String(e).includes('UNIQUE'))return respond({error:'Código duplicado'},409);throw e}
 }
 if(!match)return respond({error:'Ruta inexistente'},404);
 const [,id,action]=match,p=await view(env,id);
 if(!p||(!visible(p,actor,null)&&actor!=='calidad'))return respond({error:'No encontrado o sin permiso'},404);
 if(!action&&method==='GET')return respond({paquete:p});
 if(action==='history'&&method==='GET'){
  if(actor!=='calidad')return respond({error:'Solo Calidad puede consultar históricos'},403);
  const r=await env.DB.prepare('SELECT revision,instantanea,aprobado FROM revisiones WHERE paquete_id=? ORDER BY aprobado DESC').bind(id).all();
  return respond({revisiones:r.results.map(x=>({...x,instantanea:JSON.parse(x.instantanea)}))});
 }
 if(action==='distribution'&&method==='PATCH'){
  if(actor!=='calidad')return respond({error:'Solo Calidad puede distribuir'},403);
  const d=await parseJSON(req),t=d.tipo==='general'?'general':'especifico',ds=t==='general'?[]:d.departamentos;
  if(!Array.isArray(ds)||ds.some(x=>!DEPTS.includes(x)||x==='calidad')||(t==='especifico'&&!ds.length))return respond({error:'Asignación incorrecta'},400);
  await env.DB.prepare('UPDATE paquetes SET tipo=?,departamentos=?,compartida=?,version=version+1,actualizado=? WHERE id=?').bind(t,JSON.stringify(ds),t==='general'?1:p.compartida?1:0,now(),id).run();await event(env,id,actor,'distribucion',{tipo:t,departamentos:ds});return respond({paquete:await view(env,id)});
 }
 if(action==='visibility'&&method==='PATCH'){
  if(!owns(p,actor))return respond({error:'Solo el servicio propietario exclusivo puede cambiar visibilidad'},403);
  const d=await parseJSON(req);if(typeof d.compartida!=='boolean')return respond({error:'Valor incorrecto'},400);
  await env.DB.prepare('UPDATE paquetes SET compartida=?,version=version+1,actualizado=? WHERE id=?').bind(d.compartida?1:0,now(),id).run();await event(env,id,actor,'visibilidad',{compartida:d.compartida});return respond({paquete:await view(env,id)});
 }
 if(['obsolete','reactivate'].includes(action)&&method==='POST'){
  if(actor!=='calidad')return respond({error:'Solo Calidad puede cambiar estado'},403);
  const estado=action==='obsolete'?'obsoleto':'borrador';
  await env.DB.prepare('UPDATE paquetes SET estado=?,version=version+1,actualizado=? WHERE id=?').bind(estado,now(),id).run();await event(env,id,actor,estado);return respond({paquete:await view(env,id)});
 }
 if(!action&&method==='PUT'){
  if(actor!=='calidad')return respond({error:'Solo Calidad puede editar'},403);
  const d=await parseJSON(req),incoming=pick({...d,tipo:p.tipo,departamentos:p.departamentos});
  if(!valid(incoming)||!Number.isInteger(d.version))return respond({error:'Datos incorrectos'},400);
  if(d.version!==p.version)return respond({error:'Otra sesión ha actualizado el paquete. Vuelve a abrirlo.'},409);
  if(p.estado==='obsoleto')return respond({error:'Reactiva el paquete antes de editar'},409);
  if(p.estado==='vigente'&&String(incoming.revision)===String(p.revision))return respond({error:'Para cambiar información vigente debes crear una nueva revisión'},409);
  if(incoming.revision!==p.revision){const already=await env.DB.prepare('SELECT 1 FROM revisiones WHERE paquete_id=? AND revision=?').bind(id,incoming.revision).first();if(already)return respond({error:'Número de revisión ya utilizado'},409)}
  // Control documental: la revisión vigente se conserva sin alteraciones.
  if(p.estado==='vigente'){
   await env.DB.prepare('INSERT OR IGNORE INTO revisiones(paquete_id,revision,instantanea) VALUES (?,?,?)').bind(id,p.revision,JSON.stringify(p)).run();
  }
  incoming.tipo=p.tipo;incoming.departamentos=p.departamentos;incoming.compartida=p.compartida;
  const estado=d.aprobar?'vigente':'borrador';if(d.aprobar&&!incoming.filas.length)return respond({error:'Introduce al menos un grupo antes de aprobar'},400);
  try{
   const q=await env.DB.prepare(`UPDATE paquetes SET codigo=?,titulo=?,tipo=?,departamentos=?,compartida=?,revision=?,fecha=?,estado=?,texto=?,filas=?,version=version+1,actualizado=? WHERE id=? AND version=?`).bind(...values({...incoming,estado}),now(),id,d.version).run();
   if(!q.meta?.changes)return respond({error:'Conflicto de edición'},409);
   if(estado==='vigente')await env.DB.prepare('INSERT OR IGNORE INTO revisiones(paquete_id,revision,instantanea) VALUES (?,?,?)').bind(id,incoming.revision,JSON.stringify(await view(env,id))).run();
   await event(env,id,actor,estado==='vigente'?'aprobacion':'borrador',{revision:incoming.revision});return respond({paquete:await view(env,id)});
  }catch(e){if(String(e).includes('UNIQUE'))return respond({error:'Código duplicado'},409);throw e}
 }
 return respond({error:'Operación no admitida'},405);
}
export default {async fetch(req,env){
 const origin=req.headers.get('Origin')||'',allowed=env.FRONTEND_ORIGIN||'https://ritaqapp.github.io';
 const cors={ 'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin'};
 if(origin&&origin!==allowed)return respond({error:'Origen no autorizado'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Max-Age':'600'}});
 try{
  const url=new URL(req.url);
  if(url.pathname==='/api/health'&&req.method==='GET')return respond({ok:true,storage:'Cloudflare D1'},200,cors);
  if(url.pathname==='/api/login'&&req.method==='POST'){
   const data=await parseJSON(req),d=String(data.department||''),pw=String(data.password||'');
   if(!DEPTS.includes(d)||!env[DEPT_ENV[d]]||!pw||pw.length>256||!env.SESSION_SECRET)return respond({error:'Credenciales incorrectas'},401,cors);
   if(!safeEqual(await hash(pw),await hash(env[DEPT_ENV[d]])))return respond({error:'Credenciales incorrectas'},401,cors);
   const payload=b64(enc.encode(JSON.stringify({department:d,exp:Date.now()+4*60*60*1000})));
   return respond({token:payload+'.'+await hmac(env.SESSION_SECRET,payload),department:d,expiresIn:14400},200,cors);
  }
  const actor=await verify(req,env);if(!actor)return respond({error:'Sesión no válida. Accede de nuevo.'},401,cors);
  const r=await route(req,env,actor,url);const headers=new Headers(r.headers);Object.entries(cors).forEach(([k,v])=>headers.set(k,v));return new Response(r.body,{status:r.status,headers});
 }catch(e){return respond({error:'Error de operación: '+(e instanceof SyntaxError?'JSON no válido':String(e.message||e))},400,cors)}
 }};
