// Genesis Gates — all-in-one: Overview + GEDCOM + Tree + Map + Media + Sources + Reports + Settings

// ---------- Helpers ----------
const qs  = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');
const uid  = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const STORAGE = 'gg:state:v1';
function saveState(s){ localStorage.setItem(STORAGE, JSON.stringify(s)); }
function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE)) || {}; }catch{ return {}; } }

// ---------- Initial State ----------
let state = Object.assign({
  people: [],
  links: [],         // { parentId, childId }
  spouses: [],       // [aId, bId]
  sources: [],
  media: [],
  opts: { large:false, spouses:true, curved:true },
  geoCache: {}       // { "City, Country": {lat, lon} }
}, loadState());

// Seed with a tiny family if blank (so page is not empty)
if(state.people.length===0){
  const a = { id: uid(), sex:'M', name:'Alex Pioneer', birthDate:'1970-01-01', birthPlace:'Baghdad, Iraq', residencePlace:'San Diego, USA' };
  const b = { id: uid(), sex:'F', name:'Brianna Pioneer', birthDate:'1972-02-02', birthPlace:'Erbil, Iraq', residencePlace:'Phoenix, USA' };
  const c = { id: uid(), sex:'M', name:'Child A', birthDate:'1995-04-05', birthPlace:'San Diego, USA', residencePlace:'Austin, USA' };
  state.people=[a,b,c];
  state.spouses=[[a.id,b.id]];
  state.links=[{parentId:a.id, childId:c.id},{parentId:b.id, childId:c.id}];
  saveState(state);
}

// ---------- Unlock / Landing ----------
function isValidCode(str){ return /^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test((str||'').toUpperCase()); }
async function verifyCode(code){ return isValidCode(code); }
function enterApp(){ hide(qs('#landing')); show(qs('#app')); renderPeople(); refreshSelectors(); bindOverview(); }

document.addEventListener('DOMContentLoaded', () => {
  // landing actions
  const openBtn = qs('#btnOpenCode');
  if(openBtn){
    openBtn.addEventListener('click', async ()=>{
      const code = qs('#accessCode').value.trim();
      const status = qs('#codeStatus');
      if(!isValidCode(code)){ status.textContent='Invalid code format'; status.classList.add('text-red-600'); return; }
      status.textContent='Verifying…'; status.classList.remove('text-red-600');
      const ok = await verifyCode(code);
      if(ok) enterApp(); else { status.textContent='Invalid/expired code'; status.classList.add('text-red-600'); }
    });
  }
  const walletBtn = qs('#btnWallet'); if(walletBtn) walletBtn.addEventListener('click', ()=> enterApp());

  // tabs
  qsa('.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.getAttribute('data-tab'))));

  // header buttons
  const logout = qs('#btnLogout'); if(logout) logout.addEventListener('click', ()=> location.reload());

  const showAccess = qs('#btnShowAccess'); if(showAccess) showAccess.addEventListener('click', ()=> openAccessModal());
  const ownerBtn = qs('#btnOwner'); if(ownerBtn) ownerBtn.addEventListener('click', ()=> openOwnerModal());

  // export tip (banner)
  const tip = qs('#btnExportTip'); if(tip) tip.addEventListener('click', ()=> exportGEDCOM());

  renderPeople(); // initial table if someone skips landing by editing here
});

// ---------- Tabs ----------
function switchTab(name){
  ['overview','tree','map','media','sources','reports','settings'].forEach(n=>{
    qs('#panel-'+n).classList.toggle('hidden', n!==name);
    const btn = qs('.tab[data-tab="'+n+'"]'); if(btn) btn.classList.toggle('active', n===name);
  });
  if(name==='tree' && !window._treeReady) loadTree();
  if(name==='map' && !window._mapReady) loadMap();
  if(name==='media') renderMedia();
  if(name==='sources') renderSources();
  if(name==='reports') refreshSelectors();
  if(name==='settings') bindSettings();
}

// ---------- Overview (People CRUD) ----------
function renderPeople(){
  const tbody = qs('#peopleRows'); if(!tbody) return;
  tbody.innerHTML='';
  state.people.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="py-2">${p.name||''}</td>
      <td class="py-2">${p.sex||''}</td>
      <td class="py-2 text-zinc-500">${(p.birthDate||'')}${p.birthPlace?(' · '+p.birthPlace):''}</td>
      <td class="py-2 text-zinc-500">${(p.deathDate||'')}${p.deathPlace?(' · '+p.deathPlace):''}</td>
      <td class="py-2 text-right">
        <button data-id="${p.id}" class="btnEdit text-blue-600 mr-3">Edit</button>
        <button data-id="${p.id}" class="btnDel text-red-600">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  qsa('.btnEdit').forEach(b=>b.addEventListener('click', ()=>loadToForm(b.getAttribute('data-id'))));
  qsa('.btnDel').forEach(b=>b.addEventListener('click', ()=>{ const id=b.getAttribute('data-id'); if(!confirm('Delete this person?')) return; state.people=state.people.filter(x=>x.id!==id); state.links=state.links.filter(l=>l.parentId!==id && l.childId!==id); state.spouses=state.spouses.filter(pair=>pair[0]!==id && pair[1]!==id); saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph(); if(window._mapReady) refreshMap(); }));
}

function loadToForm(id){
  const p = state.people.find(x=>x.id===id); if(!p) return;
  qs('#pId').value=p.id; qs('#pName').value=p.name||''; qs('#pSex').value=p.sex||'';
  qs('#pBirthDate').value=p.birthDate||''; qs('#pBirthPlace').value=p.birthPlace||'';
  qs('#pDeathDate').value=p.deathDate||''; qs('#pDeathPlace').value=p.deathPlace||'';
  qs('#pResidencePlace').value=p.residencePlace||'';
}
function clearForm(){ ['pId','pName','pSex','pBirthDate','pBirthPlace','pDeathDate','pDeathPlace','pResidencePlace'].forEach(id=>{ const el=qs('#'+id); if(el) el.value=''; }); }
function savePerson(){
  const id = qs('#pId').value || uid();
  const person = {
    id,
    name: qs('#pName').value.trim() || 'Unnamed',
    sex: qs('#pSex').value || '',
    birthDate: qs('#pBirthDate').value.trim() || '',
    birthPlace: qs('#pBirthPlace').value.trim() || '',
    deathDate: qs('#pDeathDate').value.trim() || '',
    deathPlace: qs('#pDeathPlace').value.trim() || '',
    residencePlace: qs('#pResidencePlace').value.trim() || ''
  };
  const idx = state.people.findIndex(x=>x.id===id);
  if(idx>=0) state.people[idx]=person; else state.people.push(person);
  saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph(); if(window._mapReady) refreshMap(); clearForm();
}

function bindOverview(){
  const btnLocate = qs('#btnLocatePlaces');
  if(btnLocate && !btnLocate._bound){ btnLocate._bound=true; btnLocate.addEventListener('click', async ()=>{
    const birth = qs('#pBirthPlace').value.trim();
    const resi = qs('#pResidencePlace').value.trim();
    if(birth) await geocodePlace(birth);
    if(resi) await geocodePlace(resi);
    alert('Locations looked up. Save the person to persist changes.');
  });}

  const btnSave = qs('#btnSavePerson'); if(btnSave && !btnSave._bound){ btnSave._bound=true; btnSave.addEventListener('click', savePerson); }
  const btnClear = qs('#btnClearForm'); if(btnClear && !btnClear._bound){ btnClear._bound=true; btnClear.addEventListener('click', clearForm); }

  const btnExpJSON = qs('#btnExportJSON'); if(btnExpJSON && !btnExpJSON._bound){ btnExpJSON._bound=true; btnExpJSON.addEventListener('click', exportJSON); }
  const fImpJSON = qs('#fileImportJSON'); if(fImpJSON && !fImpJSON._bound){ fImpJSON._bound=true; fImpJSON.addEventListener('change', importJSON); }

  const btnExpGED = qs('#btnExportGED'); if(btnExpGED && !btnExpGED._bound){ btnExpGED._bound=true; btnExpGED.addEventListener('click', exportGEDCOM); }
  const fImpGED = qs('#fileImportGED'); if(fImpGED && !fImpGED._bound){ fImpGED._bound=true; fImpGED.addEventListener('change', (e)=>{
    if(state.people.length>0){
      const ok = confirm('Importing a GEDCOM will replace your current tree. Please export a backup first. Continue?');
      if(!ok){ e.target.value=''; return; }
    }
    importGEDCOM(e);
  });}
}

// ---------- JSON Export / Import ----------
function exportJSON(){
  const a=document.createElement('a');
  a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(state,null,2));
  a.download='genesis-gates.json'; a.click();
}
function importJSON(e){
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload=()=>{ try{ const data=JSON.parse(r.result); state=Object.assign(state,data); saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph(); if(window._mapReady) refreshMap(); alert('Import complete.'); }catch{ alert('Invalid JSON'); } };
  r.readAsText(f);
}

// ---------- GEDCOM Export / Import ----------
function exportGEDCOM(){
  const xref = {}; state.people.forEach((p,i)=> xref[p.id] = `@I${i+1}@`);
  const lines = [];
  lines.push('0 HEAD'); lines.push('1 SOUR GenesisGates'); lines.push('1 GEDC'); lines.push('2 VERS 5.5.1'); lines.push('2 FORM LINEAGE-LINKED'); lines.push('1 CHAR UTF-8');

  state.people.forEach(p=>{
    lines.push(`0 ${xref[p.id]} INDI`);
    if(p.name) lines.push(`1 NAME ${p.name}`);
    if(p.sex) lines.push(`1 SEX ${p.sex}`);
    if(p.birthDate || p.birthPlace){ lines.push('1 BIRT'); if(p.birthDate) lines.push('2 DATE '+p.birthDate); if(p.birthPlace) lines.push('2 PLAC '+p.birthPlace); }
    if(p.deathDate || p.deathPlace){ lines.push('1 DEAT'); if(p.deathDate) lines.push('2 DATE '+p.deathDate); if(p.deathPlace) lines.push('2 PLAC '+p.deathPlace); }
    if(p.residencePlace){ lines.push('1 RESI'); lines.push('2 PLAC '+p.residencePlace); }
  });

  const fams = [];
  const famMap = new Map();
  const key = (a,b)=>[a,b].sort().join('|');
  state.spouses.forEach(pair=>{
    const k = key(pair[0], pair[1]);
    if(!famMap.has(k)){ famMap.set(k, fams.length); fams.push({husb:pair[0], wife:pair[1], children:[]}); }
  });
  state.links.forEach(l=>{
    fams.forEach(f=>{ if(l.parentId===f.husb || l.parentId===f.wife){ if(!f.children.includes(l.childId)) f.children.push(l.childId); } });
  });
  fams.forEach((f,i)=>{
    const fid = `@F${i+1}@`;
    lines.push(`0 ${fid} FAM`);
    if(f.husb) lines.push(`1 HUSB ${xref[f.husb]||''}`);
    if(f.wife) lines.push(`1 WIFE ${xref[f.wife]||''}`);
    f.children.forEach(cid=> lines.push(`1 CHIL ${xref[cid]||''}`));
  });

  lines.push('0 TRLR');
  const a = document.createElement('a'); a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(lines.join('\n')); a.download='genesis-gates.ged'; a.click();
}

function importGEDCOM(e){
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    const lines = r.result.split(/\r?\n/);
    const inds = {}; const fams = [];
    let current=null, currentType=null;
    lines.forEach(raw=>{
      const line = raw.trim(); if(!line) return;
      const m = line.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z0-9_]+)?\s*(.*)?$/);
      if(!m) return;
      const level = parseInt(m[1],10);
      const xref = m[2] || null;
      const tag = m[3] || '';
      const data = (m[4]||'').trim();
      if(level===0 && xref && tag==='INDI'){ current={ id:xref, data:{} }; currentType='INDI'; inds[xref]=current.data; }
      else if(level===0 && xref && tag==='FAM'){ current={ id:xref, data:{ children:[] } }; currentType='FAM'; fams.push(current.data); }
      else if(currentType==='INDI'){
        if(tag==='NAME'){ current.data.name=data; }
        else if(tag==='SEX'){ current.data.sex=data; }
        else if(tag==='BIRT'){ current._birt=true; current._deat=false; current._resi=false; }
        else if(tag==='DEAT'){ current._deat=true; current._birt=false; current._resi=false; }
        else if(tag==='RESI'){ current._resi=true; current._birt=false; current._deat=false; }
        else if(tag==='DATE'){ if(current._birt) current.data.birthDate=data; if(current._deat) current.data.deathDate=data; }
        else if(tag==='PLAC'){ if(current._birt) current.data.birthPlace=data; if(current._deat) current.data.deathPlace=data; if(current._resi) current.data.residencePlace=data; }
        else if(level===1){ current._birt=false; current._deat=false; current._resi=false; }
      }else if(currentType==='FAM'){
        if(tag==='HUSB'){ current.data.husb=data; }
        else if(tag==='WIFE'){ current.data.wife=data; }
        else if(tag==='CHIL'){ current.data.children.push(data); }
      }
    });
    const idMap = {}; const people=[];
    Object.keys(inds).forEach((xref)=>{ const p = Object.assign({ id: uid() }, inds[xref]); idMap[xref]=p.id; people.push(p); });
    const links=[]; const spouses=[];
    fams.forEach(f=>{
      const a = idMap[f.husb]; const b = idMap[f.wife];
      if(a && b) spouses.push([a,b]);
      (f.children||[]).forEach(chref=>{
        const c = idMap[chref];
        if(c && a) links.push({parentId:a, childId:c});
        if(c && b) links.push({parentId:b, childId:c});
      });
    });
    state.people = people; state.links=links; state.spouses=spouses;
    saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph(); if(window._mapReady) refreshMap();
    alert('GEDCOM imported.');
  };
  r.readAsText(f);
}

// ---------- Geocoding + Cache ----------
async function geocodePlace(place){
  if(!place) return null;
  const key = place.trim();
  if(state.geoCache && state.geoCache[key]) return state.geoCache[key];
  try{
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(key);
    const res = await fetch(url, { headers: { 'Accept':'application/json' } });
    const arr = await res.json();
    if(arr && arr[0]){
      const out = { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
      state.geoCache = state.geoCache || {}; state.geoCache[key]=out; saveState(state);
      return out;
    }
  }catch(e){ console.warn('Geocode failed', e); }
  return null;
}

// ---------- Tree (D3) ----------
let d3Loaded=false, svg, g, zoom, diagramMode='tree';
async function loadTree(){
  try{
    await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
    d3Loaded=true; window._treeReady=true;
    const host = qs('#treeHost'); host.innerHTML='';
    svg = d3.select(host).append('svg').attr('width','100%').attr('height','100%');
    g = svg.append('g');
    zoom = d3.zoom().scaleExtent([0.3, 2.5]).on('zoom', (event)=>{ g.attr('transform', event.transform); });
    svg.call(zoom);

    qs('#btnFitTree').addEventListener('click', fitGraph);
    qs('#btnCenterTree').addEventListener('click', ()=> centerGraph(0.9));
    qs('#btnResetTree').addEventListener('click', ()=>{ collapsed.clear(); drawGraph(); fitGraph(); });
    qs('#btnTreeSearch').addEventListener('click', ()=>{ const q=qs('#treeSearch').value.trim(); if(q) focusByName(q); });
    qs('#treeSearch').addEventListener('keydown', (e)=>{ if(e.key==='Enter') qs('#btnTreeSearch').click(); });
    qsa('input[name="diagram"]').forEach(r=> r.addEventListener('change', (e)=>{ diagramMode = e.target.value; drawGraph(); fitGraph(); }));

    drawGraph(); fitGraph();
  }catch(e){ alert('Failed to load tree library. Refresh the page.'); }
}

function personById(id){ return state.people.find(p=>p.id===id); }
function childrenOf(id){ return Array.from(new Set(state.links.filter(l=>l.parentId===id).map(l=>l.childId))).map(pid=>personById(pid)).filter(Boolean); }
function spouseOf(id){ const pair = state.spouses.find(pr=>pr[0]===id || pr[1]===id); if(!pair) return null; const partnerId = pair[0]===id ? pair[1] : pair[0]; return personById(partnerId); }

const collapsed = new Set();
function buildHierarchy(rootId, visited=new Set()){
  const me = personById(rootId); if(!me || visited.has(rootId)) return null; visited.add(rootId);
  const kids = childrenOf(rootId).map(ch=>buildHierarchy(ch.id, visited)).filter(Boolean);
  return { id:me.id, name:me.name, _collapsed:collapsed.has(me.id), children:kids };
}

function refreshSelectors(){
  const selA = qs('#reportRootA'), selD=qs('#reportRootD'), rootSel=qs('#rootSelect');
  [selA, selD, rootSel].forEach(sel=>{
    if(!sel) return;
    const v = sel.value;
    sel.innerHTML='';
    state.people.forEach(p=>{
      const opt=document.createElement('option'); opt.value=p.id; opt.textContent=p.name; sel.appendChild(opt);
    });
    if(v) sel.value=v;
  });
}

function drawGraph(){
  if(!d3Loaded) return;
  const rootId = (qs('#rootSelect') && qs('#rootSelect').value) || (state.people[0] && state.people[0].id);
  const data = buildHierarchy(rootId) || {name:'(empty)'};
  g.selectAll('*').remove();
  if(diagramMode==='tree'){
    drawTree(data);
  }else{
    drawCircles(data);
  }
}

function drawTree(data){
  const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
  const root = d3.hierarchy(data, d=> (d._collapsed ? null : d.children) );
  const nodeW = (state.opts.large ? 200 : 160), nodeH = (state.opts.large ? 60 : 44);
  const hgap = (state.opts.large ? 60 : 40), vgap = (state.opts.large ? 90 : 70);
  const layout = d3.tree().nodeSize([vgap, nodeW + hgap]);
  layout(root);

  const curved = state.opts.curved !== false;
  const linkGen = curved
    ? d3.linkHorizontal().x(d=>d.y+80).y(d=>d.x)
    : function(d){ return `M${d.source.y+80},${d.source.x} L${d.target.y+80},${d.target.x}`; };

  g.selectAll('path.link').data(root.links()).enter().append('path').attr('class','link')
    .attr('d', linkGen).attr('fill','none').attr('stroke','#D1D5DB').attr('stroke-width',2);

  const nodes = g.selectAll('g.node').data(root.descendants()).enter().append('g').attr('class','node')
    .attr('transform', d=>`translate(${d.y+80},${d.x- nodeH/2})`);

  nodes.append('rect').attr('rx',10).attr('ry',10).attr('width', nodeW).attr('height', nodeH).attr('fill','#ffffff').attr('stroke','#E5E7EB');

  nodes.append('circle').attr('cx', 14).attr('cy', nodeH/2).attr('r', 10).attr('fill','#E0E7FF');
  nodes.append('text').attr('x',14).attr('y', nodeH/2+4).attr('text-anchor','middle').attr('font-size','10px').attr('fill','#111827')
    .text(d=> (d.data.name||'?').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase());

  nodes.append('text').attr('x', 32).attr('y', nodeH/2+4).attr('font-size','12px').attr('fill','#111827').style('cursor','pointer')
    .text(d=>d.data.name).on('click', (event,d)=>{ if(collapsed.has(d.data.id)) collapsed.delete(d.data.id); else collapsed.add(d.data.id); drawGraph(); });

  // quick add controls
  nodes.append('text').attr('x', nodeW-52).attr('y', 14).attr('font-size','11px').attr('fill','#16A34A').style('cursor','pointer')
    .text('+P').on('click', (event,d)=>{ addParent(d.data.id); });
  nodes.append('text').attr('x', nodeW-24).attr('y', 14).attr('font-size','11px').attr('fill','#5850EC').style('cursor','pointer')
    .text('+C').on('click', (event,d)=>{ addChild(d.data.id); });
  nodes.append('text').attr('x', nodeW-86).attr('y', 14).attr('font-size','11px').attr('fill','#374151').style('cursor','pointer')
    .text('+S').on('click', (event,d)=>{ addSpouse(d.data.id); });
}

function drawCircles(data){
  const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
  const root = d3.hierarchy(data, d=> (d._collapsed ? null : d.children) );
  const radius = Math.min(width, height) / 2 - 40;
  const cluster = d3.cluster().size([2*Math.PI, radius]);
  cluster(root);
  const centerX = width/2, centerY = height/2;

  const lineGen = d3.linkRadial().angle(d=>d.x).radius(d=>d.y);
  g.selectAll('path.rlink').data(root.links()).enter().append('path')
    .attr('class','rlink').attr('d', lineGen).attr('transform', `translate(${centerX},${centerY})`)
    .attr('fill','none').attr('stroke','#D1D5DB').attr('stroke-width',2);

  const nodes = g.selectAll('g.rnode').data(root.descendants()).enter().append('g')
    .attr('class','rnode')
    .attr('transform', d=>`translate(${centerX + Math.cos(d.x - Math.PI/2)*d.y}, ${centerY + Math.sin(d.x - Math.PI/2)*d.y})`);

  nodes.append('circle').attr('r', 14).attr('fill','#ffffff').attr('stroke','#E5E7EB');
  nodes.append('text').attr('y', -18).attr('text-anchor','middle').attr('font-size','11px').attr('fill','#111827')
    .text(d=>d.data.name);

  nodes.append('text').attr('x', -20).attr('y', 4).attr('font-size','11px').attr('fill','#16A34A').style('cursor','pointer').text('+P')
    .on('click', (e,d)=> addParent(d.data.id));
  nodes.append('text').attr('x', 4).attr('y', 4).attr('font-size','11px').attr('fill','#5850EC').style('cursor','pointer').text('+C')
    .on('click', (e,d)=> addChild(d.data.id));
  nodes.append('text').attr('x', -6).attr('y', 20).attr('font-size','11px').attr('fill','#374151').style('cursor','pointer').text('+S')
    .on('click', (e,d)=> addSpouse(d.data.id));

  nodes.selectAll('text').on('dblclick', (e,d)=>{ if(collapsed.has(d.data.id)) collapsed.delete(d.data.id); else collapsed.add(d.data.id); drawGraph(); });
}

function fitGraph(){
  const host = qs('#treeHost'); const svgEl = host.querySelector('svg'); if(!svgEl) return;
  const bounds = g.node().getBBox(); const margin = 40;
  const { width, height } = host.getBoundingClientRect();
  const scale = Math.max(0.3, Math.min(2.5, Math.min((width-margin)/bounds.width, (height-margin)/bounds.height)));
  const translate = [ (width - bounds.width*scale)/2 - bounds.x*scale, (height - bounds.height*scale)/2 - bounds.y*scale ];
  d3.select(svgEl).transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
}
function centerGraph(scale=0.9){
  const host = qs('#treeHost'); const svgEl = host.querySelector('svg');
  const { width, height } = host.getBoundingClientRect();
  d3.select(svgEl).transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(width*0.05, height*0.05).scale(scale));
}
function focusByName(q){
  if(!q) return;
  const p = state.people.find(pp=> (pp.name||'').toLowerCase().includes(q.toLowerCase())); if(!p) { alert('No match'); return; }
  fitGraph();
}

function addChild(parentId){
  const child = { id: uid(), name:'New Child' };
  state.people.push(child);
  state.links.push({ parentId, childId: child.id });
  saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph();
}
function addParent(childId){
  const parent = { id: uid(), name:'New Parent' };
  state.people.push(parent);
  state.links.push({ parentId: parent.id, childId: childId });
  saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph();
}
function addSpouse(aId){
  const partner = { id: uid(), name:'New Partner' };
  state.people.push(partner);
  state.spouses.push([aId, partner.id]);
  saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawGraph();
}

// ---------- Media ----------
function renderMedia(){
  const grid = qs('#mediaGrid'); if(!grid) return;
  grid.innerHTML='';
  (state.media||[]).forEach((m)=>{
    const div=document.createElement('div');
    div.className='rounded-xl overflow-hidden border';
    div.innerHTML = `<img src="${m.url}" class="w-full h-32 object-cover"><div class="p-2 text-xs">${m.caption||''}</div>`;
    grid.appendChild(div);
  });
  const file = qs('#fileMedia');
  if(file && !file._bound){
    file._bound=true;
    file.addEventListener('change', e=>{
      const files = e.target.files || [];
      Array.from(files).forEach(f=>{
        const url = URL.createObjectURL(f);
        state.media.push({url, caption:f.name});
      });
      saveState(state); renderMedia();
    });
  }
}

// ---------- Sources ----------
function renderSources(){
  const list = qs('#sourceList'); if(!list) return; list.innerHTML='';
  (state.sources||[]).forEach((s,i)=>{
    const div=document.createElement('div');
    div.className='rounded-xl border p-3';
    div.innerHTML = `<div class="text-sm font-medium">${s.title||'Source ' + (i+1)}</div><div class="text-xs text-zinc-500">${s.detail||''}</div>`;
    list.appendChild(div);
  });
  const btnAdd = qs('#btnAddSource');
  if(btnAdd && !btnAdd._bound){
    btnAdd._bound=true;
    btnAdd.addEventListener('click', ()=>{
      const title = prompt('Source title'); const detail=prompt('Details / citation / URL');
      state.sources = state.sources || []; state.sources.push({title, detail});
      saveState(state); renderSources();
    });
  }
  const btnExp = qs('#btnExportSources');
  if(btnExp && !btnExp._bound){
    btnExp._bound=true;
    btnExp.addEventListener('click', ()=>{
      const a=document.createElement('a');
      a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(state.sources||[],null,2));
      a.download='genesis-gates-sources.json'; a.click();
    });
  }
}

// ---------- Reports ----------
function generateReport(kind){
  let out='';
  if(kind==='ancestor'){
    const root = qs('#reportRootA').value;
    const lines=[];
    function parentsOf(id){ const ps = state.links.filter(l=>l.childId===id).map(l=>l.parentId); return Array.from(new Set(ps)); }
    function walk(id, depth=0){ const p = personById(id); if(!p) return; lines.push('  '.repeat(depth)+'• '+(p.name||'Unnamed')+(p.birthDate?` (b. ${p.birthDate})`:'')); parentsOf(id).forEach(pid=>walk(pid, depth+1)); }
    walk(root,0); out = lines.join('\n');
  }else if(kind==='descendant'){
    const root = qs('#reportRootD').value;
    const lines=[];
    function children(id){ const cs = state.links.filter(l=>l.parentId===id).map(l=>l.childId); return Array.from(new Set(cs)); }
    function walk(id, depth=0){ const p = personById(id); if(!p) return; lines.push('  '.repeat(depth)+'• '+(p.name||'Unnamed')+(p.birthDate?` (b. ${p.birthDate})`:'')); children(id).forEach(cid=>walk(cid, depth+1)); }
    walk(root,0); out = lines.join('\n');
  }else if(kind==='timeline'){
    const events=[];
    state.people.forEach(p=>{ if(p.birthDate) events.push({date:p.birthDate, what:`Birth — ${p.name}`}); if(p.deathDate) events.push({date:p.deathDate, what:`Death — ${p.name}`}); });
    events.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    out = events.map(e=>`${e.date||'----'}  |  ${e.what}`).join('\n');
  }
  qs('#reportOut').textContent = out || '(No data)';
}
document.addEventListener('DOMContentLoaded', ()=>{
  const a=qs('#btnReportA'), d=qs('#btnReportD'), t=qs('#btnReportT');
  if(a) a.addEventListener('click', ()=>generateReport('ancestor'));
  if(d) d.addEventListener('click', ()=>generateReport('descendant'));
  if(t) t.addEventListener('click', ()=>generateReport('timeline'));
});

// ---------- Map (Leaflet + heat + arcs) ----------
let map, heatLayer, arcLayerGroup;
async function loadMap(){
  try{
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    await loadScript('https://unpkg.com/leaflet.heat/dist/leaflet-heat.js');
    initMap();
    window._mapReady = true;
  }catch(e){ alert('Map libraries failed to load. Check your connection and reload.'); }
}
function initMap(){
  map = L.map('map', { zoomAnimation: true, scrollWheelZoom: true }).setView([30,10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 10, attribution:'© OpenStreetMap' }).addTo(map);
  heatLayer = L.heatLayer([], { radius: 22, blur: 18, maxZoom: 10 }).addTo(map);
  arcLayerGroup = L.layerGroup().addTo(map);
  refreshMap();
  qs('#chkHeat').addEventListener('change', ()=>{ if(qs('#chkHeat').checked){ heatLayer.addTo(map);} else { map.removeLayer(heatLayer);} });
  qs('#chkArcs').addEventListener('change', ()=>{ if(qs('#chkArcs').checked){ arcLayerGroup.addTo(map);} else { map.removeLayer(arcLayerGroup);} });
  qs('#btnGeoAll').addEventListener('click', geocodeAllPlaces);
}
async function geocodeAllPlaces(){
  const status = qs('#geoStatus'); status.textContent='Geocoding…';
  for(const p of state.people){
    if(p.birthPlace && (!p.bLat || !p.bLon)){ const res = await geocodePlace(p.birthPlace); if(res){ p.bLat=res.lat; p.bLon=res.lon; } }
    if(p.residencePlace && (!p.rLat || !p.rLon)){ const res2 = await geocodePlace(p.residencePlace); if(res2){ p.rLat=res2.lat; p.rLon=res2.lon; } }
  }
  saveState(state); refreshMap(); status.textContent='Done.'; setTimeout(()=> status.textContent='', 2000);
}
function refreshMap(){
  if(!heatLayer || !arcLayerGroup) return;
  const pts = []; arcLayerGroup.clearLayers();
  state.people.forEach(p=>{
    const rLat = parseFloat(p.rLat), rLon = parseFloat(p.rLon);
    const bLat = parseFloat(p.bLat), bLon = parseFloat(p.bLon);
    if(Number.isFinite(rLat)&&Number.isFinite(rLon)){ pts.push([rLat, rLon, 0.7]); }
    if(qs('#chkArcs').checked && Number.isFinite(rLat)&&Number.isFinite(rLon)&&Number.isFinite(bLat)&&Number.isFinite(bLon)){
      L.polyline([[bLat,bLon],[rLat,rLon]], { color:'#6D28D9', weight:2, opacity:0.85 }).addTo(arcLayerGroup);
    }
  });
  heatLayer.setLatLngs(pts);
}

// ---------- Settings ----------
function bindSettings(){
  const large = qs('#optLargeNodes'), spouses=qs('#optShowSpouses'), curved=qs('#optCurvedLinks');
  if(large && !large._bound){ large._bound=true; large.checked = !!state.opts.large; large.onchange = ()=>{ state.opts.large = large.checked; saveState(state); if(window._treeReady) drawGraph(); }; }
  if(spouses && !spouses._bound){ spouses._bound=true; spouses.checked = state.opts.spouses!==false; spouses.onchange = ()=>{ state.opts.spouses = spouses.checked; saveState(state); if(window._treeReady) drawGraph(); }; }
  if(curved && !curved._bound){ curved._bound=true; curved.checked = state.opts.curved!==false; curved.onchange = ()=>{ state.opts.curved = curved.checked; saveState(state); if(window._treeReady) drawGraph(); }; }
}

// ---------- Utilities ----------
async function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script'); s.src=src; s.defer=true;
    s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

// ---------- Access / Owner Modals (simple local UX) ----------
function openAccessModal(){
  const m = qs('#accessModal'); if(!m) return; show(m); m.classList.add('flex');
  const close = ()=>{ hide(m); m.classList.remove('flex'); };
  qs('#btnCloseAccess').onclick = close;
  qs('#btnCopyShare').onclick = ()=>{ const t = qs('#shareCode').textContent||''; navigator.clipboard.writeText(t); };
  qs('#btnGenCode').onclick = ()=>{ const treeId = (qs('#shareTreeId').value||'default').trim(); const days = parseInt(qs('#shareExpiry').value,10) || 14; const code = genAccessCode(treeId, days); qs('#shareCode').textContent = code; };
}
function genAccessCode(treeId, days){
  // Simple unsigned base32-like groups — matches the validator
  const base32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';
  function group(){ return Array.from({length:5},()=> base32[Math.floor(Math.random()*base32.length)]).join(''); }
  return [group(),group(),group(),group(),group()].join('-');
}

function openOwnerModal(){
  const m = qs('#ownerModal'); if(!m) return; show(m); m.classList.add('flex');
  const close = ()=>{ hide(m); m.classList.remove('flex'); };
  qs('#btnOwnerClose').onclick = close;
  const status = qs('#ownerStatus');
  const existing = localStorage.getItem('gg:ownerKey');
  status.textContent = existing ? 'Key present.' : 'No key yet.';
  qs('#btnOwnerCreate').onclick = ()=>{
    const pass = qs('#ownerPass').value.trim();
    if(!pass){ alert('Enter a passphrase'); return; }
    const key = 'GG-' + btoa(pass).slice(0,16);
    localStorage.setItem('gg:ownerKey', key);
    status.textContent = 'Key created.';
  };
}
