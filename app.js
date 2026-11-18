import { firebaseConfig } from './firebase-config.js';

const CATS=['Voli e trasporti lunghi','Alloggio','Trasporti locali e veicolo','Cibo e drink','Attività e divertimento','Regali e shopping','Assicurazione / visti / SIM'];
const COLORS=['#183b61','#8cb0a7','#d0a451','#dc917a','#9c83b5','#ba795c','#8c9a9f'];
const EMOJI=['✈️','🏨','🚕','🍝','🎟️','🛍️','🧾'];
const $=sel=>document.querySelector(sel);
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const datefmt=s=>s?new Date(`${s}T12:00:00`).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'}):'—';
const sum=t=>(t.expenses||[]).reduce((acc,e)=>acc+Number(e.amount||0),0);
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const duration=t=>Math.max(1,Math.round((new Date(`${t.endDate}T12:00:00`)-new Date(`${t.startDate}T12:00:00`))/86400000)+1);
const tripYear=t=>Number(t.startDate?.slice(0,4))||new Date().getFullYear();
const num=v=>Number(String(v).replace(',','.'));
let trips=[];let page={screen:'home',year:null,id:null};let modal=null;let chart=null;let map=null;let cloud=null;let activeUser=null;let unsubscribe=null;let inCloud=false;
let authReady=false; let authError='';
// Preferenza del solo dispositivo: i dati restano sempre su Firebase.
let amountsVisible = localStorage.getItem('viaggi-home-amounts') === 'show';
const homeAmount = n => amountsVisible ? fmt(n) : '••••••';

function toast(message){const el=$('#toast');el.textContent=message;el.style.display='block';setTimeout(()=>{if(el.textContent===message)el.style.display='none'},3500)}
function uid(){return 'new-'+(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`)}
async function initFirebase(){
  if(!firebaseConfig?.apiKey||!firebaseConfig?.projectId){authError='Configurazione Firebase mancante.';authReady=true;render();return;}
  try{
    const version='11.10.0';
    const appmod=await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`);
    const authmod=await import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`);
    const firemod=await import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`);
    const app=appmod.initializeApp(firebaseConfig);const auth=authmod.getAuth(app);const db=firemod.getFirestore(app);
    cloud={auth,db,...authmod,...firemod};
    authmod.onAuthStateChanged(auth,user=>{
      if(unsubscribe){unsubscribe();unsubscribe=null}
      activeUser=user;inCloud=!!user;authReady=true;authError='';
      trips=[];page={screen:'home',year:null,id:null};modal=null;render();
      if(user){
        const q=firemod.collection(db,'users',user.uid,'trips');
        unsubscribe=firemod.onSnapshot(q,snap=>{
          trips=snap.docs.map(x=>({id:x.id,...x.data()}));render();
        },err=>{authError='Errore nel caricamento dei dati: '+err.message;trips=[];render()});
      }
    },err=>{authReady=true;authError='Errore di autenticazione: '+err.message;render()});
  }catch(err){console.error(err);authError='Impossibile collegarsi a Firebase: '+err.message;authReady=true;render()}
}
async function locatePlace(place){
  if(!place)return null;try{const response=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(place),{headers:{'Accept-Language':'it'}});if(!response.ok)return null;const data=await response.json();return data[0]?{lat:Number(data[0].lat),lng:Number(data[0].lon)}:null}catch{return null}
}
async function login(email,password){
  if(!cloud)throw new Error('Firebase non è ancora disponibile');
  await cloud.signInWithEmailAndPassword(cloud.auth,email,password);
}
async function logout(){if(cloud)await cloud.signOut(cloud.auth)}
async function store(t){
  if(!inCloud||!activeUser)throw new Error('Accedi per salvare il viaggio');
  await cloud.setDoc(cloud.doc(cloud.db,'users',activeUser.uid,'trips',t.id),t);
}
async function removeTrip(id){
  if(!inCloud||!activeUser)throw new Error('Accedi per eliminare il viaggio');
  await cloud.deleteDoc(cloud.doc(cloud.db,'users',activeUser.uid,'trips',id));
}
const selectYear=y=>{page={screen:'year',year:y,id:null};render();window.scrollTo(0,0)};
const selectTrip=id=>{page={screen:'trip',year:null,id};render();window.scrollTo(0,0)};
const goHome=()=>{page={screen:'home',year:null,id:null};render();window.scrollTo(0,0)};
function authScreen(){
  const note=authError?`<p role="alert" style="color:#a22;font-size:14px;overflow-wrap:anywhere">${esc(authError)}</p>`:'';
  return `<div class="app-shell"><main class="main" style="min-height:95vh;display:flex;align-items:center;justify-content:center;padding:24px"><section class="panel" style="width:min(100%,430px);padding:30px 24px;text-align:center;background:#fffaf0;border:1px solid #d7c4a1;border-radius:20px;box-shadow:0 12px 40px #102a4920"><img src="assets/icon.svg" alt="" style="width:74px;height:74px;margin:auto"><h1 style="font-family:Playfair Display,serif;color:#183b61;margin:12px 0 0">Viaggi</h1><p style="color:#736b5e;margin:4px 0 26px">Around the World · Diario privato</p>${note}${!authReady?'<p>Collegamento a Firebase…</p>':`<form id="login-form" style="text-align:left;display:grid;gap:12px"><label for="login-email">Email</label><input id="login-email" type="email" autocomplete="username" required placeholder="La tua email" style="width:100%;padding:14px;border-radius:10px;border:1px solid #bdb7aa;font-size:16px"><label for="login-password">Password</label><input id="login-password" type="password" autocomplete="current-password" required placeholder="La tua password" style="width:100%;padding:14px;border-radius:10px;border:1px solid #bdb7aa;font-size:16px"><button class="btn primary" type="submit" ${!cloud?'disabled':''} style="margin-top:10px;justify-content:center">🔐 Accedi</button></form>`}<p style="font-size:12px;color:#716b62;margin-top:22px">Accesso riservato. Non è prevista la registrazione.</p></section></main></div>`;
}
function render(){
  if(chart){chart.destroy();chart=null}if(map){map.remove();map=null}
  if(!activeUser){$('#app').innerHTML=authScreen();return}
  let content=page.screen==='home'?home():page.screen==='year'?yearPage(page.year):tripPage(page.id);
  $('#app').innerHTML=`<div class="app-shell"><header class="topbar"><button class="brand" data-action="home"><img src="assets/icon.svg" alt=""><span><b>Viaggi</b><small>Around the World</small></span></button><div class="top-actions"><span class="pill">☁️ Privato</span><button class="btn ghost tiny" data-action="logout">Esci</button><button class="btn gold tiny" data-action="new">+ Viaggio</button></div></header><main class="main">${authError?`<p class="notice">${esc(authError)}</p>`:''}${content}</main><footer class="footer">✈️ Il tuo mondo, i tuoi viaggi, le tue spese · Firebase</footer></div>${modal?modalHtml():''}`;
  if(page.screen==='trip'){const t=trips.find(t=>t.id===page.id);if(t){drawChart(t);drawMap(t)}}
}
function home(){
 const total=round(trips.reduce((a,t)=>a+sum(t),0));const ys=[...new Set(trips.map(tripYear))].sort((a,b)=>a-b);
 return `<section class="hero"><div class="eyebrow">✧ Colleziona momenti, non cose ✧</div><h1>Around the World</h1><p>Un diario personale di destinazioni, ricordi e spese. Ogni viaggio è una storia da conservare.</p></section><div class="stats"><div class="stat"><strong>${trips.length}</strong><small>Viaggi</small></div><div class="stat"><strong>${ys.length}</strong><small>Anni</small></div><div class="stat"><strong class="home-amount" aria-label="Totale ${amountsVisible?'visibile':'nascosto'}">${homeAmount(total)}</strong><small>Spesa totale</small></div></div><div class="section-head"><h2>Il tuo diario</h2><div class="inline-actions"><button class="btn privacy-toggle" data-action="toggle-amounts" title="${amountsVisible?'Nascondi i totali':'Mostra i totali'}" aria-label="${amountsVisible?'Nascondi i totali':'Mostra i totali'}" aria-pressed="${amountsVisible}">${amountsVisible?'👁️ Nascondi':'🙈 Mostra'}</button><button class="btn primary" data-action="new">+ Nuovo viaggio</button></div></div><div class="years">${ys.map(y=>{const list=trips.filter(t=>tripYear(t)===y);return `<button class="year-card" data-year="${y}"><div class="year">${y} ✧</div><div class="foot"><small>${list.length} ${list.length===1?'viaggio':'viaggi'}</small><strong class="home-amount">${homeAmount(list.reduce((a,t)=>a+sum(t),0))}</strong></div></button>`}).join('')||'<div class="panel empty">Nessun viaggio ancora. Aggiungine uno!</div>'}</div><div class="panel"><div class="section-head"><h2>Il tuo archivio</h2></div><p class="muted">Puoi aggiungere nuovi viaggi, aggiornare le spese e modificare le date in qualsiasi momento.</p><div class="inline-actions"><button class="btn" data-action="export">⬇️ Esporta backup JSON</button><button class="btn" data-action="import-json">⬆️ Importa viaggi / backup</button><input id="backup-input" type="file" accept="application/json,.json" hidden></div><p class="muted" style="font-size:12px">Per importare i viaggi storici seleziona il file privato viaggi-storici.json dal telefono. Non caricarlo su GitHub.</p></div>`;
}
function yearPage(year){const list=trips.filter(t=>tripYear(t)===year).sort((a,b)=>a.startDate.localeCompare(b.startDate));const total=round(list.reduce((a,t)=>a+sum(t),0));return `<button class="back" data-action="home">← Tutti gli anni</button><div class="section-head"><div><div class="eyebrow">L'anno dei ricordi</div><h1 style="font-size:45px;margin:8px 0">${year}</h1><p class="subtitle muted">${list.length} viaggi · ${fmt(total)}</p></div><button class="btn primary" data-action="new">+ Viaggio</button></div><div class="trip-list">${list.map(t=>`<button class="trip-card" data-trip="${esc(t.id)}"><div class="trip-icon">🌍</div><h3>${esc(t.name)}</h3><small>${datefmt(t.startDate)} – ${datefmt(t.endDate)}</small><div class="money">${fmt(sum(t))}</div>${t.review?'<div class="source-chip">⚠️ Anno da verificare</div>':''}</button>`).join('')}</div>`}
function tripPage(id){const t=trips.find(t=>t.id===id);if(!t){page.screen='home';return home()}const total=round(sum(t));const catValues=CATS.map((c,i)=>({name:c,value:round(t.expenses.filter(e=>e.category===c).reduce((a,e)=>a+Number(e.amount),0)),color:COLORS[i]}));return `<button class="back" data-year="${tripYear(t)}">← Viaggi ${tripYear(t)}</button><div class="section-head"><div><div class="eyebrow">✧ Passaporto dei ricordi</div><h1 style="margin:8px 0 4px;font-size:clamp(33px,5vw,49px)">${esc(t.name)}</h1><p class="muted">${datefmt(t.startDate)} – ${datefmt(t.endDate)} · ${duration(t)} giorni</p></div><div class="inline-actions"><button class="btn" data-action="edit-trip">✏️ Modifica</button><button class="btn danger" data-action="delete-trip">Elimina</button></div></div><div class="stats"><div class="stat"><strong class="home-amount" aria-label="Totale ${amountsVisible?'visibile':'nascosto'}">${homeAmount(total)}</strong><small>Spesa totale</small></div><div class="stat"><strong>${fmt(round(total/duration(t)))}</strong><small>Media al giorno</small></div><div class="stat"><strong>${(t.expenses||[]).length}</strong><small>Voci di spesa</small></div></div>${t.review?`<div class="notice">⚠️ Da verificare: il documento TXT del viaggio indica un anno diverso dal riepilogo PDF. Puoi correggere le date da “Modifica”.</div>`:''}${t.reportedTotal!=null&&Math.abs(total-t.reportedTotal)>.01?`<div class="notice">Totale riportato nel PDF: ${fmt(t.reportedTotal)}. Somma delle categorie: ${fmt(total)}. Verifica la differenza.</div>`:''}<div class="split"><section class="panel"><h2 class="section-title">Dove sono finiti i soldi?</h2><div class="chart-holder"><canvas id="pie" aria-label="Ripartizione delle spese per categoria"></canvas></div></section><section class="panel"><h2 class="section-title">Categorie</h2><ul class="breakdown">${catValues.filter(x=>x.value>0).map(x=>`<li><span><i class="dot" style="background:${x.color}"></i>${esc(x.name)}</span><b>${fmt(x.value)}</b></li>`).join('')||'<li>Non hai ancora spese.</li>'}</ul></section></div><section class="panel"><div class="section-head"><h2>Le tue spese</h2><button class="btn primary" data-action="add-expense">+ Aggiungi spesa</button></div>${(t.expenses||[]).length? t.expenses.map(e=>`<div class="expense-row"><div><b>${esc(e.description||e.category)}</b><small>${esc(e.category)} · ${datefmt(e.date)}${e.summary?' · riepilogo PDF':''}</small></div><strong>${fmt(e.amount)}</strong><button class="btn tiny" data-expense="${esc(e.id)}">✏️</button></div>`).join(''):'<p class="muted">Nessuna spesa. Aggiungi la prima!</p>'}</section><section class="panel"><div class="section-head"><h2>📍 Mappa del viaggio</h2><button class="btn tiny" data-action="expand-map">Espandi</button></div><div id="map" class="map"></div><p class="muted" style="font-size:12px">Le tappe sono una traccia indicativa, non un percorso GPS. Puoi aggiungerle e riordinarle da “Modifica”.</p></section>${t.notes?`<section class="panel"><h2>Ricordi</h2><p>${esc(t.notes).replaceAll('\n','<br>')}</p></section>`:''}${t.originalNotes?`<section class="panel"><details><summary><b>📜 Note di spesa originali</b> (dal file caricato)</summary><p class="notice">Le note originali sono conservate per consultazione: non vengono sommate di nuovo alle categorie del PDF, per evitare duplicazioni.</p><div class="original">${esc(t.originalNotes)}</div></details></section>`:''}`}
function drawChart(t){if(!window.Chart)return;const vals=CATS.map(c=>round(t.expenses.filter(e=>e.category===c).reduce((a,e)=>a+Number(e.amount),0)));if(!vals.some(v=>v>0))return;chart=new Chart($('#pie'),{type:'doughnut',data:{labels:CATS,datasets:[{data:vals,backgroundColor:COLORS,borderWidth:2,borderColor:'#fffdf7'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.raw)}`}}}}})}
const KNOWN={'Madrid':[40.4168,-3.7038],'Ios':[36.7226,25.2819],'Ibiza':[38.9067,1.4206],'Vieste':[41.881,16.175],'Barcellona':[41.3874,2.1686],'Sardegna':[40.1209,9.0129],'Sestriere':[44.9596,6.8771],'Londra':[51.5074,-0.1278],'Saragozza':[41.6488,-0.8891],'León':[42.5987,-5.5671],'Oviedo':[43.3614,-5.8494],'Somo':[43.4521,-3.7444],'Santander':[43.4623,-3.81],'Bilbao':[43.263,-2.935],'Tolosa':[43.6047,1.4442],'Marrakech':[31.6295,-7.9811],'Rabat':[34.0209,-6.8416],'Fès':[34.064,-4.9747],'Alicante':[38.3452,-0.481],'Benidorm':[38.5411,-0.1225],'Tabarca':[38.1653,-0.48],'Vilnius':[54.6872,25.2797],'Riga':[56.9496,24.1052],'Bratislava':[48.1486,17.1077],'Vienna':[48.2082,16.3738],'Isola d’Elba':[42.7782,10.1927],'Tenerife':[28.2916,-16.6291],'Vietnam':[16.0471,108.2062],'Nord Est Europa':[54.6872,25.2797],'Indonesia':[-8.4095,115.1889],'Albania':[41.1533,20.1683],'Islanda':[64.9631,-19.0208]};
function drawMap(t,expand=false){
  const target = modal?.type==='map' ? document.querySelector('.sheet #map') : document.querySelector('main #map');
  if (!target) return;
  // I marker usano coordinate del viaggio oppure coordinate note delle tappe,
  // mai coordinate ricavate per approssimazione da un nome ambiguo.
  const points=[];
  for(const stop of t.stops||[]){
    const lat=Number(stop.lat),lng=Number(stop.lng);
    const valid=stop.lat!=null&&stop.lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
    const coords=valid?[lat,lng]:KNOWN[stop.name];
    if(coords)points.push({coords,label:stop.name});
  }
  if(!points.length&&Number.isFinite(Number(t.lat))&&Number.isFinite(Number(t.lng))&&t.lat!=null&&t.lng!=null){
    points.push({coords:[Number(t.lat),Number(t.lng)],label:t.place||t.name});
  }
  if(!points.length&&KNOWN[t.place])points.push({coords:KNOWN[t.place],label:t.place});
  if(!window.L){target.innerHTML='<p class="map-message">Impossibile caricare la mappa. Riprova con una connessione Internet.</p>';return}
  map=L.map(target,{scrollWheelZoom:false,zoomControl:true,preferCanvas:false});
  // CARTO è un fornitore di tile distinto da OSM; se non è raggiungibile, riprova con OSM.
  let tile=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    subdomains:'abcd',attribution:'&copy; OpenStreetMap contributors &copy; CARTO',maxZoom:19,
    crossOrigin:true,updateWhenIdle:false,keepBuffer:4
  }).addTo(map);
  let fallbackUsed=false;
  tile.on('tileerror',()=>{
    if(fallbackUsed||!map)return;
    fallbackUsed=true;
    map.removeLayer(tile);
    tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; OpenStreetMap contributors',maxZoom:19,keepBuffer:4
    }).addTo(map);
  });
  for(const p of points)L.marker(p.coords).addTo(map).bindPopup(esc(p.label));
  if(points.length>1){
    L.polyline(points.map(p=>p.coords),{color:'#a77c38',weight:4,opacity:.85,dashArray:'8,7'}).addTo(map);
    map.fitBounds(L.latLngBounds(points.map(p=>p.coords)),{padding:[40,40],maxZoom:11});
  }else if(points.length){
    map.setView(points[0].coords,10);
  }else map.setView([20,0],2);
  // Safari iOS spesso crea la mappa prima che il contenitore raggiunga le misure finali.
  const current=map;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(map===current){current.invalidateSize({pan:false}); if(points.length===1)current.panTo(points[0].coords,{animate:false})}
  }));
  setTimeout(()=>{if(map===current)current.invalidateSize({pan:false})},400);
  setTimeout(()=>{if(map===current)current.invalidateSize({pan:false})},1200);
}
function textField(label,name,value='',type='text',wide=false){return `<div class="field${wide?' wide':''}"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${['name','startDate','endDate'].includes(name)?'required':''}></div>`}
function modalHtml(){
 if(modal.type==='trip') {const t=modal.item||{name:'',startDate:new Date().toISOString().slice(0,10),endDate:new Date().toISOString().slice(0,10),place:'',stops:[],notes:''};return `<div class="sheet"><div class="sheet-content"><div class="sheet-head"><h2>${modal.item?'Modifica viaggio':'✈️ Nuovo viaggio'}</h2><button class="btn tiny" data-action="close">✕</button></div><form id="trip-form"><div class="fields">${textField('Nome del viaggio','name',t.name,'text',true)}${textField('Data di partenza','startDate',t.startDate,'date')}${textField('Data di ritorno','endDate',t.endDate,'date')}${textField('Destinazione / luogo','place',t.place||t.name,'text',true)}<div class="field wide"><label for="stops">Tappe nell'ordine del viaggio (una per riga)</label><textarea name="stops" id="stops" placeholder="Marrakech&#10;Rabat&#10;Fès">${esc((t.stops||[]).map(s=>s.name).join('\n'))}</textarea></div><div class="field wide"><label for="notes">Ricordi / note</label><textarea name="notes" id="notes" placeholder="Scrivi un ricordo del viaggio...">${esc(t.notes||'')}</textarea></div></div><p class="notice">Dopo aver creato il viaggio potrai aggiungere voli, hotel, cibo e tutte le spese. Per una nuova destinazione puoi usare “Cerca posizione” nella scheda.</p><div class="sheet-foot"><button type="button" class="btn" data-action="close">Annulla</button><button class="btn primary" type="submit">${modal.item?'Salva modifiche':'Crea viaggio'}</button></div></form></div></div>`}
 if(modal.type==='expense'){const e=modal.item||{description:'',category:CATS[0],amount:'',date:trips.find(t=>t.id===page.id)?.startDate||new Date().toISOString().slice(0,10)};return `<div class="sheet"><div class="sheet-content"><div class="sheet-head"><h2>${modal.item?'Modifica spesa':'💶 Aggiungi spesa'}</h2><button class="btn tiny" data-action="close">✕</button></div><form id="expense-form"><div class="fields">${textField('Descrizione','description',e.description,'text',true)}<div class="field wide"><label for="category">Categoria</label><select name="category" id="category">${CATS.map((c,i)=>`<option value="${esc(c)}" ${c===e.category?'selected':''}>${EMOJI[i]} ${esc(c)}</option>`).join('')}</select></div>${textField('Importo (€)','amount',e.amount,'number')}${textField('Data','date',e.date,'date')}</div><div class="sheet-foot">${modal.item?'<button type="button" class="btn danger" data-action="delete-expense">Elimina spesa</button>':''}<button type="button" class="btn" data-action="close">Annulla</button><button class="btn primary" type="submit">Salva spesa</button></div></form></div></div>`}
 if(modal.type==='map'){return `<div class="sheet"><div class="sheet-content"><div class="sheet-head"><h2>🌍 Mappa</h2><button class="btn tiny" data-action="close">✕</button></div><div id="map" class="map big"></div><p class="muted" style="font-size:12px">Le linee mostrano l'ordine delle tappe, non strade o voli reali.</p></div></div>`}
}
function openModal(type,item=null){modal={type,item};render()}
function closeModal(){modal=null;render()}
function actionHandler(action){const t=trips.find(t=>t.id===page.id);switch(action){case'home':goHome();break;case'toggle-amounts':amountsVisible=!amountsVisible;localStorage.setItem('viaggi-home-amounts',amountsVisible?'show':'hide');render();break;case'new':openModal('trip');break;case'close':closeModal();break;case'logout':logout();break;case'export':exportBackup();break;case'import-json':$('#backup-input')?.click();break;case'edit-trip':openModal('trip',t);break;case'add-expense':openModal('expense');break;case'expand-map':openModal('map');break;case'delete-trip':if(t&&confirm(`Eliminare definitivamente “${t.name}”?`)){removeTrip(t.id).then(goHome).catch(e=>toast(e.message))}break;case'delete-expense':if(t&&modal?.item&&confirm('Eliminare questa spesa?')){store({...t,expenses:t.expenses.filter(e=>e.id!==modal.item.id)}).then(closeModal).catch(e=>toast(e.message))}break;}}
document.addEventListener('click',e=>{if(!activeUser)return;const expense=e.target.closest('[data-expense]');if(expense){const t=trips.find(t=>t.id===page.id);openModal('expense',t?.expenses.find(x=>x.id===expense.dataset.expense));return}const trip=e.target.closest('[data-trip]');if(trip){selectTrip(trip.dataset.trip);return}const year=e.target.closest('[data-year]');if(year){selectYear(Number(year.dataset.year));return}const act=e.target.closest('[data-action]');if(act)actionHandler(act.dataset.action)});
document.addEventListener('submit',async e=>{
 if(e.target.id==='login-form'){
   e.preventDefault();const form=e.target;const btn=form.querySelector('button[type=submit]');btn.disabled=true;
   try{await login(form.querySelector('#login-email').value.trim(),form.querySelector('#login-password').value)}
   catch(err){authError=err.code==='auth/invalid-credential'?'Email o password non corretti.':err.code==='auth/too-many-requests'?'Troppi tentativi. Riprova più tardi.':err.message;render()}
   return;
 }
 if(!activeUser)return;
 if(!['trip-form','expense-form'].includes(e.target.id))return;e.preventDefault();const form=e.target;const values=Object.fromEntries(new FormData(form));const btn=form.querySelector('[type=submit]');btn.disabled=true;try{
 if(form.id==='trip-form'){
  if(values.endDate<values.startDate)throw new Error('La data di ritorno deve essere successiva o uguale alla partenza');
  const old=modal?.item;const stops=values.stops.split('\n').map(s=>s.trim()).filter(Boolean).map(name=>({name,...(old?.stops?.find(s=>s.name===name)||{})}));
  const t={...(old||{}),id:old?.id||uid(),name:values.name.trim(),place:values.place.trim()||values.name.trim(),startDate:values.startDate,endDate:values.endDate,stops,notes:values.notes||'',expenses:old?.expenses||[],lat:old?.lat??null,lng:old?.lng??null};
  if(!t.name)throw new Error('Inserisci un nome');if(!old||t.place!==old.place){const loc=KNOWN[t.place]?{lat:KNOWN[t.place][0],lng:KNOWN[t.place][1]}:await locatePlace(t.place);if(loc)Object.assign(t,loc)}await store(t);modal=null;selectTrip(t.id);toast(t.lat==null?'Viaggio salvato! Posizione non trovata, puoi modificare il luogo.':'Viaggio salvato!');
 }else{
  const t=trips.find(t=>t.id===page.id);if(!t)throw new Error('Viaggio non trovato');const amount=num(values.amount);if(!Number.isFinite(amount)||amount<0)throw new Error('Inserisci un importo valido');const old=modal?.item;const x={id:old?.id||uid(),category:values.category,description:values.description.trim()||values.category,amount:round(amount),date:values.date,summary:false};const expenses=old?t.expenses.map(e=>e.id===old.id?x:e):[...t.expenses,x];await store({...t,expenses});modal=null;render();toast('Spesa salvata!');
 }
}catch(err){btn.disabled=false;toast(err.message)}});
function exportBackup(){const blob=new Blob([JSON.stringify({version:1,exportDate:new Date().toISOString(),trips},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`viaggi-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
document.addEventListener('change',async e=>{
 if(e.target.id!=='backup-input'||!activeUser||!inCloud)return;
 try{
   const raw=JSON.parse(await e.target.files[0].text());
   const items=Array.isArray(raw)?raw:raw.trips;
   if(!Array.isArray(items)||items.some(t=>!t||typeof t.id!=='string'||!Array.isArray(t.expenses)||!t.startDate))throw new Error('Formato JSON non valido');
   if(!confirm(`Importare ${items.length} viaggi su Firebase? Quelli con lo stesso ID saranno aggiornati.`))return;
   for(let i=0;i<items.length;i+=400){const batch=cloud.writeBatch(cloud.db);for(const t of items.slice(i,i+400))batch.set(cloud.doc(cloud.db,'users',activeUser.uid,'trips',t.id),t);await batch.commit()}
   toast('Viaggi importati su Firebase!');
 }catch(err){toast('Errore importazione: '+err.message)}
 finally{e.target.value=''}
});
render();initFirebase();
