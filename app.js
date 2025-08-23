// Genesis Gates - Tree Pro (collapsible, spouse links, search, mini‑map)
(function(){
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const show = el => el.classList.remove('hidden');
  const hide = el => el.classList.add('hidden');
  const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  const STORAGE = 'gg:v4';

  function saveState(state){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE)) || { people:[], links:[], spouses:[], opts:{large:false, spouses:true, curved:true} }; }catch{ return { people:[], links:[], spouses:[], opts:{large:false, spouses:true, curved:true} }; } }

  let state = loadState();
  if(state.people.length===0){
    const a = { id: uid(), name:'Alex Pioneer', birth:'Baghdad, Iraq', city:'San Diego, USA', lat:32.7157, lon:-117.1611, blat:33.3152, blon:44.3661 };
    const b = { id: uid(), name:'Brianna Pioneer', birth:'Erbil, Iraq', city:'Phoenix, USA', lat:33.4484, lon:-112.0740, blat:36.1911, blon:44.0092 };
    const c = { id: uid(), name:'Child A', birth:'San Diego, USA', city:'Austin, USA', lat:30.2672, lon:-97.7431, blat:32.7157, blon:-117.1611 };
    const d = { id: uid(), name:'Child B', birth:'Phoenix, USA', city:'Tempe, USA', lat:33.4255, lon:-111.94, blat:33.4484, blon:-112.0740 };
    state.people = [a,b,c,d];
    state.links = [{parentId:a.id, childId:c.id},{parentId:b.id, childId:c.id},{parentId:a.id, childId:d.id}];
    state.spouses = [[a.id,b.id]];
    state.opts = { large:false, spouses:true, curved:true };
    saveState(state);
  }

  // --- Unlock
  function isValidCode(str){ return /^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test((str||'').toUpperCase()); }
  async function verifyCode(code){ return isValidCode(code); }
  function enterApp(){ hide(qs('#landing')); show(qs('#app')); renderPeople(); buildRootSelect(); bindSettings(); }

  document.addEventListener('DOMContentLoaded', () => {
    qs('#btnOpenCode').addEventListener('click', async ()=>{
      const code = qs('#accessCode').value.trim();
      const status = qs('#codeStatus');
      if(!isValidCode(code)){ status.textContent='Invalid code format'; status.classList.add('text-red-600'); return; }
      status.textContent='Verifying…'; status.classList.remove('text-red-600');
      const ok = await verifyCode(code);
      if(ok) enterApp(); else { status.textContent='Invalid/expired code'; status.classList.add('text-red-600'); }
    });
    qs('#btnWallet').addEventListener('click', ()=> enterApp());
    qs('#docsLink').addEventListener('click', e=>{ e.preventDefault(); alert('Genesis Gates: private family atlas with access codes, tree view, and AI tools.'); });

    // Tabs
    qsa('.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.getAttribute('data-tab'))));

    // People CRUD
    qs('#btnClearForm').addEventListener('click', clearForm);
    qs('#btnSavePerson').addEventListener('click', savePerson);
    qs('#btnExport').addEventListener('click', exportJSON);
    qs('#fileImport').addEventListener('change', importJSON);

    // Modals / owner
    qs('#btnLogout').addEventListener('click', ()=>{ hide(qs('#app')); show(qs('#landing')); });
    qs('#btnShowAccess').addEventListener('click', ()=>{ const m=qs('#accessModal'); m.classList.remove('hidden'); m.classList.add('flex'); });
    qs('#btnCloseAccess').addEventListener('click', ()=>{ const m=qs('#accessModal'); m.classList.add('hidden'); m.classList.remove('flex'); });
    qs('#btnCopyShare').addEventListener('click', async ()=>{ await navigator.clipboard.writeText(qs('#shareCode').textContent); alert('Access code copied'); });

    qs('#btnOwner').addEventListener('click', ()=>{ const m=qs('#ownerModal'); m.classList.remove('hidden'); m.classList.add('flex'); });
    qs('#btnOwnerClose').addEventListener('click', ()=>{ const m=qs('#ownerModal'); m.classList.add('hidden'); m.classList.remove('flex'); });
    qs('#btnOwnerCreate').addEventListener('click', ()=>{
      qs('#ownerStatus').textContent = 'Owner key stored locally (demo). Ready to generate viewer codes.';
      alert('Owner key ready (demo). Use Get Access Code to generate codes.');
    });

    // Tree controls
    qs('#btnFitTree').addEventListener('click', fitTree);
    qs('#btnCenterTree').addEventListener('click', centerTree);
    qs('#btnResetTree').addEventListener('click', ()=>{ collapsed.clear(); drawTree(); fitTree(); });
    qs('#btnTreeSearch').addEventListener('click', ()=>{ const q=qs('#treeSearch').value.trim(); if(q) focusByName(q); });

    renderPeople();
  });

  // --- People table with quick links
  function renderPeople(){
    const tbody = qs('#peopleRows'); tbody.innerHTML='';
    state.people.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2">${p.name}</td>
        <td class="py-2 text-zinc-500">${p.birth||''}</td>
        <td class="py-2 text-zinc-500">${p.city||''}</td>
        <td class="py-2 text-center">
          <button class="btnAddParent text-emerald-600" data-id="${p.id}" title="Add a parent">+ Parent</button>
          <span class="mx-1">·</span>
          <button class="btnAddChild text-indigo-600" data-id="${p.id}" title="Add a child">+ Child</button>
          <span class="mx-1">·</span>
          <button class="btnAddSpouse text-zinc-700" data-id="${p.id}" title="Add a spouse/partner">+ Spouse</button>
        </td>
        <td class="py-2 text-right">
          <button data-id="${p.id}" class="btnEdit text-blue-600 mr-3">Edit</button>
          <button data-id="${p.id}" class="btnDel text-red-600">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    qsa('.btnEdit').forEach(b=>b.addEventListener('click', ()=>loadToForm(b.getAttribute('data-id'))));
    qsa('.btnDel').forEach(b=>b.addEventListener('click', ()=>{ const id=b.getAttribute('data-id'); state.people=state.people.filter(x=>x.id!==id); state.links=state.links.filter(l=>l.parentId!==id && l.childId!==id); state.spouses=state.spouses.filter(pair=>pair[0]!==id && pair[1]!==id); saveState(state); renderPeople(); if(window._mapReady) refreshMap(); if(window._treeReady) { buildRootSelect(); drawTree(); } }));
    qsa('.btnAddChild').forEach(b=>b.addEventListener('click', ()=>addChild(b.getAttribute('data-id'))));
    qsa('.btnAddParent').forEach(b=>b.addEventListener('click', ()=>addParent(b.getAttribute('data-id'))));
    qsa('.btnAddSpouse').forEach(b=>b.addEventListener('click', ()=>addSpouse(b.getAttribute('data-id'))));
  }
  function loadToForm(id){
    const p = state.people.find(x=>x.id===id); if(!p) return;
    qs('#pId').value=p.id; qs('#pName').value=p.name||''; qs('#pBirth').value=p.birth||''; qs('#pCity').value=p.city||'';
    qs('#pLat').value=p.lat||''; qs('#pLon').value=p.lon||''; qs('#pBLat').value=p.blat||''; qs('#pBLon').value=p.blon||'';
  }
  function clearForm(){ ['pId','pName','pBirth','pCity','pLat','pLon','pBLat','pBLon'].forEach(id=>qs('#'+id).value=''); }
  function savePerson(){
    const id = qs('#pId').value || uid();
    const person = {
      id,
      name: qs('#pName').value.trim() || 'Unnamed',
      birth: qs('#pBirth').value.trim() || '',
      city: qs('#pCity').value.trim() || '',
      lat: parseFloat(qs('#pLat').value)||null,
      lon: parseFloat(qs('#pLon').value)||null,
      blat: parseFloat(qs('#pBLat').value)||null,
      blon: parseFloat(qs('#pBLon').value)||null,
    };
    const idx = state.people.findIndex(x=>x.id===id);
    if(idx>=0) state.people[idx]=person; else state.people.push(person);
    saveState(state); renderPeople(); if(window._mapReady) refreshMap(); if(window._treeReady) { buildRootSelect(); drawTree(); } clearForm();
  }
  function addChild(parentId){
    const child = { id: uid(), name:'New Child', birth:'', city:'', lat:null, lon:null, blat:null, blon:null };
    state.people.push(child);
    state.links.push({ parentId, childId: child.id });
    saveState(state); renderPeople(); if(window._treeReady){ buildRootSelect(); drawTree(); }
  }
  function addParent(childId){
    const parent = { id: uid(), name:'New Parent', birth:'', city:'', lat:null, lon:null, blat:null, blon:null };
    state.people.push(parent);
    state.links.push({ parentId: parent.id, childId: childId });
    saveState(state); renderPeople(); if(window._treeReady){ buildRootSelect(); drawTree(); }
  }
  function addSpouse(aId){
    const partner = { id: uid(), name:'New Partner', birth:'', city:'', lat:null, lon:null, blat:null, blon:null };
    state.people.push(partner);
    state.spouses.push([aId, partner.id]);
    saveState(state); renderPeople(); if(window._treeReady){ buildRootSelect(); drawTree(); }
  }

  // Export / import
  function exportJSON(){
    const a=document.createElement('a');
    a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(state,null,2));
    a.download='genesis-gates.json'; a.click();
  }
  function importJSON(e){
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload=()=>{ try{ const data=JSON.parse(r.result); state.people=data.people||[]; state.links=data.links||[]; state.spouses=data.spouses||[]; state.opts=data.opts||state.opts; saveState(state); renderPeople(); if(window._mapReady) refreshMap(); if(window._treeReady){ buildRootSelect(); drawTree(); } }catch{} };
    r.readAsText(f);
  }

  // --- Tabs
  function switchTab(name){
    ['overview','tree','map','ai','privacy','settings'].forEach(n=>{
      qs('#panel-'+n).classList.toggle('hidden', n!==name);
      const btn = qs('.tab[data-tab="'+n+'"]'); if(btn) btn.classList.toggle('active', n===name);
    });
    if(name==='map' && !window._mapReady) loadMap();
    if(name==='ai' && !window._aiReady) loadAI();
    if(name==='tree' && !window._treeReady) loadTree();
    if(name==='settings') readSettings();
  }
  window.switchTab = switchTab;

  // --- Lazy loader
  async function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src=src; s.defer=true;
      s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  // --- Tree (D3) ---
  let d3Loaded=false, svg, g, zoom, mini, miniCtx, collapsed=new Set();
  async function loadTree(){
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
      d3Loaded=true; window._treeReady=true;
      mini = qs('#miniMap'); miniCtx = mini.getContext('2d');
      buildRootSelect();
      initTreeCanvas();
      drawTree();
      fitTree();
      // Bind search enter
      qs('#treeSearch').addEventListener('keydown', (e)=>{ if(e.key==='Enter') qs('#btnTreeSearch').click(); });
    }catch(e){ alert('Failed to load tree library. Refresh the page.'); }
  }
  function buildRootSelect(){
    const sel = qs('#rootSelect'); if(!sel) return;
    const current = sel.value;
    sel.innerHTML = '';
    state.people.forEach(p=>{
      const opt=document.createElement('option'); opt.value=p.id; opt.textContent=p.name; sel.appendChild(opt);
    });
    if(current) sel.value=current;
    sel.addEventListener('change', drawTree);
  }
  function initTreeCanvas(){
    const host = qs('#treeHost'); host.innerHTML = '';
    svg = d3.select(host).append('svg').attr('width','100%').attr('height','100%');
    g = svg.append('g');
    zoom = d3.zoom().scaleExtent([0.3, 2.5]).on('zoom', (event)=>{ g.attr('transform', event.transform); drawMiniMap(); });
    svg.call(zoom);
  }
  function personById(id){ return state.people.find(p=>p.id===id); }
  function childrenOf(id){
    const kidIds = state.links.filter(l=>l.parentId===id).map(l=>l.childId);
    // dedupe
    return Array.from(new Set(kidIds)).map(cid=>personById(cid)).filter(Boolean);
  }
  function spouseOf(id){
    const pair = state.spouses.find(pr=>pr[0]===id || pr[1]===id);
    if(!pair) return null;
    const partnerId = pair[0]===id ? pair[1] : pair[0];
    return personById(partnerId);
  }
  function buildHierarchy(rootId, visited=new Set()){
    const me = personById(rootId); if(!me || visited.has(rootId)) return null;
    visited.add(rootId);
    const kids = childrenOf(rootId).map(ch=>buildHierarchy(ch.id, visited)).filter(Boolean);
    const node = { id:me.id, name:me.name, _collapsed:collapsed.has(me.id), children: kids };
    return node;
  }
  function drawTree(){
    if(!d3Loaded) return;
    const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
    const rootId = (qs('#rootSelect').value || (state.people[0] && state.people[0].id));
    const data = buildHierarchy(rootId) || {name:'(empty)'};
    g.selectAll('*').remove();
    const root = d3.hierarchy(data, d=> (d._collapsed ? null : d.children) );
    const nodeW = state.opts.large ? 200 : 160;
    const nodeH = state.opts.large ? 60 : 44;
    const hgap = state.opts.large ? 60 : 40;
    const vgap = state.opts.large ? 90 : 70;
    const treeLayout = d3.tree().nodeSize([vgap, nodeW + hgap]);
    treeLayout(root);

    // Links
    const curved = state.opts.curved !== false;
    const linkGen = curved
      ? d3.linkHorizontal().x(d=>d.y+80).y(d=>d.x)
      : function(d){ return `M${d.source.y+80},${d.source.x} L${d.target.y+80},${d.target.x}`; };

    g.selectAll('path.link')
      .data(root.links())
      .enter().append('path')
      .attr('class','link')
      .attr('d', linkGen)
      .attr('fill','none').attr('stroke','#D1D5DB').attr('stroke-width',2);

    // Nodes
    const nodes = g.selectAll('g.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class','node')
      .attr('transform', d=>`translate(${d.y+80},${d.x- nodeH/2})`);

    // Rect background
    nodes.append('rect').attr('rx',10).attr('ry',10)
      .attr('width', nodeW).attr('height', nodeH)
      .attr('fill','#ffffff').attr('stroke','#E5E7EB').attr('filter','drop-shadow(0 1px 1px rgba(0,0,0,0.05))');

    // Avatar circle (initials)
    nodes.append('circle').attr('cx', 14).attr('cy', nodeH/2).attr('r', 10).attr('fill','#E0E7FF');
    nodes.append('text').attr('x',14).attr('y', nodeH/2+4).attr('text-anchor','middle').attr('font-size','10px').attr('fill','#111827')
      .text(d=> (d.data.name||'?').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase());

    // Name text (click to collapse/expand)
    nodes.append('text').attr('x', 32).attr('y', nodeH/2+4).attr('font-size','12px').attr('fill','#111827').style('cursor','pointer')
      .text(d=>d.data.name).on('click', (event,d)=>{ // toggle collapse
        if(collapsed.has(d.data.id)) collapsed.delete(d.data.id); else collapsed.add(d.data.id);
        drawTree();
      });

    // Quick add buttons
    nodes.append('text').attr('x', nodeW-52).attr('y', 14).attr('font-size','11px').attr('fill','#16A34A').style('cursor','pointer')
      .text('+P').on('click', (event,d)=>{ addParent(d.data.id); });
    nodes.append('text').attr('x', nodeW-24).attr('y', 14).attr('font-size','11px').attr('fill','#5850EC').style('cursor','pointer')
      .text('+C').on('click', (event,d)=>{ addChild(d.data.id); });
    nodes.append('text').attr('x', nodeW-86).attr('y', 14).attr('font-size','11px').attr('fill','#374151').style('cursor','pointer')
      .text('+S').on('click', (event,d)=>{ addSpouse(d.data.id); });

    // Spouse visuals (optional)
    if(state.opts.spouses !== false){
      const spouseNodes = nodes.filter(d=> spouseOf(d.data.id));
      spouseNodes.each(function(d){
        const s = spouseOf(d.data.id);
        const gNode = d3.select(this);
        // small spouse card to the right of main node
        gNode.append('rect').attr('x', nodeW+10).attr('y', 0).attr('rx',10).attr('ry',10)
          .attr('width', nodeW*0.6).attr('height', nodeH)
          .attr('fill','#ffffff').attr('stroke','#E5E7EB');
        gNode.append('text').attr('x', nodeW+10+10).attr('y', nodeH/2+4).attr('font-size','12px').attr('fill','#6B7280').text(s ? s.name : 'Partner');
        // marriage line
        g.append('line')
          .attr('x1', d.y+80+nodeW).attr('y1', d.x)
          .attr('x2', d.y+80+nodeW+10).attr('y2', d.x)
          .attr('stroke','#9CA3AF').attr('stroke-width',2);
      });
    }

    drawMiniMap();
  }

  function fitTree(){
    const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
    const bounds = g.node().getBBox(); const margin = 40;
    const scale = Math.max(0.3, Math.min(2.5, Math.min((width-margin)/bounds.width, (height-margin)/bounds.height)));
    const translate = [ (width - bounds.width*scale)/2 - bounds.x*scale, (height - bounds.height*scale)/2 - bounds.y*scale ];
    d3.select(host.querySelector('svg')).transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  }
  function centerTree(){
    const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
    d3.select(host.querySelector('svg')).transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(60, 40).scale(0.9));
  }
  function focusByName(q){
    if(!q) return;
    const p = state.people.find(pp=> (pp.name||'').toLowerCase().includes(q.toLowerCase())); if(!p) { alert('No match'); return; }
    // Recompute current root layout to find coords
    const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
    const rootId = (qs('#rootSelect').value || (state.people[0] && state.people[0].id));
    const data = buildHierarchy(rootId) || {name:'(empty)'};
    const root = d3.hierarchy(data, d=> (d._collapsed ? null : d.children) );
    const nodeW = state.opts.large ? 200 : 160;
    const nodeH = state.opts.large ? 60 : 44;
    const hgap = state.opts.large ? 60 : 40;
    const vgap = state.opts.large ? 90 : 70;
    const treeLayout = d3.tree().nodeSize([vgap, nodeW + hgap]);
    treeLayout(root);
    // find node with id
    let target = null;
    root.each(n=>{ if(n.data.id===p.id) target=n; });
    if(!target){ alert('Found in data but not visible (collapsed). Expand branches.'); return; }
    const x = target.x, y = target.y+80;
    const scale = 1.0;
    d3.select(host.querySelector('svg')).transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(width/2 - y*scale, height/2 - x*scale).scale(scale));
  }

  function drawMiniMap(){
    if(!miniCtx) return;
    const host = qs('#treeHost'); const svgEl = host.querySelector('svg'); if(!svgEl) return;
    const bounds = g.node().getBBox();
    const view = svgEl.getBoundingClientRect();
    const transform = d3.zoomTransform(svgEl);
    const scaleX = mini.width / Math.max(bounds.width, 1);
    const scaleY = mini.height / Math.max(bounds.height, 1);
    const scale = Math.min(scaleX, scaleY);
    miniCtx.clearRect(0,0,mini.width, mini.height);
    // background
    miniCtx.fillStyle = '#F3F4F6'; miniCtx.fillRect(0,0,mini.width, mini.height);
    // tree bbox
    miniCtx.strokeStyle = '#D1D5DB'; miniCtx.lineWidth = 2; miniCtx.strokeRect(0,0,bounds.width*scale, bounds.height*scale);
    // viewport rect
    const vx = (-bounds.x*transform.k + transform.x)/ (bounds.width) * (bounds.width*scale);
    const vy = (-bounds.y*transform.k + transform.y)/ (bounds.height) * (bounds.height*scale);
    const vw = view.width/ (bounds.width) * (bounds.width*scale) / transform.k;
    const vh = view.height/ (bounds.height) * (bounds.height*scale) / transform.k;
    miniCtx.strokeStyle = '#3B82F6'; miniCtx.lineWidth = 2; miniCtx.strokeRect(vx, vy, vw, vh);
  }

  // Settings
  function bindSettings(){
    const large = qs('#optLargeNodes'), spouses=qs('#optShowSpouses'), curved=qs('#optCurvedLinks');
    if(large){ large.checked = !!state.opts.large; large.onchange = ()=>{ state.opts.large = large.checked; saveState(state); if(window._treeReady) drawTree(); }; }
    if(spouses){ spouses.checked = state.opts.spouses!==false; spouses.onchange = ()=>{ state.opts.spouses = spouses.checked; saveState(state); if(window._treeReady) drawTree(); }; }
    if(curved){ curved.checked = state.opts.curved!==false; curved.onchange = ()=>{ state.opts.curved = curved.checked; saveState(state); if(window._treeReady) drawTree(); }; }
  }
  function readSettings(){
    bindSettings();
  }

  // --- Map (Leaflet + heat) ---
  let map, heatLayer, arcLayerGroup;
  async function loadMap(){
    try{
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await loadScript('https://unpkg.com/leaflet.heat/dist/leaflet-heat.js');
      initMap();
      window._mapReady = true;
    }catch(e){ alert('Map libraries failed to load. Refresh.'); }
  }
  function initMap(){
    map = L.map('map', { zoomAnimation: true, scrollWheelZoom: true }).setView([30,10], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 8, attribution:'© OpenStreetMap' }).addTo(map);
    heatLayer = L.heatLayer([], { radius: 20, blur: 15, maxZoom: 8 }).addTo(map);
    arcLayerGroup = L.layerGroup().addTo(map);
    refreshMap();
    qs('#chkHeat').addEventListener('change', ()=>{ if(qs('#chkHeat').checked){ heatLayer.addTo(map);} else { map.removeLayer(heatLayer);} });
    qs('#chkArcs').addEventListener('change', ()=>{ if(qs('#chkArcs').checked){ arcLayerGroup.addTo(map);} else { map.removeLayer(arcLayerGroup);} });
  }
  function refreshMap(){
    if(!heatLayer || !arcLayerGroup) return;
    const pts = []; arcLayerGroup.clearLayers();
    state.people.forEach(p=>{
      if(Number.isFinite(p.lat)&&Number.isFinite(p.lon)){ pts.push([p.lat,p.lon, 0.6]); }
      if(qs('#chkArcs').checked && Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Number.isFinite(p.blat)&&Number.isFinite(p.blon)){
        L.polyline([[p.blat,p.blon],[p.lat,p.lon]], { color:'#6D28D9', weight:2, opacity:0.85 }).addTo(arcLayerGroup);
      }
    });
    heatLayer.setLatLngs(pts);
  }

  // --- AI (lazy) ---
  async function loadAI(){ window._aiReady=true; await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'); }
  qs('#ocrFile') && qs('#ocrFile').addEventListener('change', async e=>{
    const file = e.target.files && e.target.files[0]; if(!file) return;
    const textarea = qs('#ocrText'); textarea.value='Processing…';
    try{ const { data } = await Tesseract.recognize(file, 'eng'); textarea.value = data.text || ''; }
    catch(e){ textarea.value = 'OCR failed. Try a clearer image.'; }
  });

})();