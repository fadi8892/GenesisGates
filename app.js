// Genesis Gates - GEDCOM Pro: GEDCOM import/export + sources, media, reports + Tree Pro
(function(){
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const show = el => el.classList.remove('hidden');
  const hide = el => el.classList.add('hidden');
  const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  const STORAGE = 'gg:gedcom:v1';

  function saveState(state){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE)) || { people:[], families:[], links:[], spouses:[], sources:[], media:[], opts:{large:false, spouses:true, curved:true} }; }catch{ return { people:[], families:[], links:[], spouses:[], sources:[], media:[], opts:{large:false, spouses:true, curved:true} }; } }

  let state = loadState();
  if(state.people.length===0){
    const a = { id: uid(), sex:'M', name:'Alex Pioneer', birthDate:'1970-01-01', birthPlace:'Baghdad, Iraq', city:'San Diego, USA' };
    const b = { id: uid(), sex:'F', name:'Brianna Pioneer', birthDate:'1972-02-02', birthPlace:'Erbil, Iraq', city:'Phoenix, USA' };
    const c = { id: uid(), sex:'M', name:'Child A', birthDate:'1995-04-05', birthPlace:'San Diego, USA', city:'Austin, USA' };
    state.people=[a,b,c];
    state.spouses=[[a.id,b.id]];
    state.links=[{parentId:a.id, childId:c.id},{parentId:b.id, childId:c.id}];
    saveState(state);
  }

  // --- Unlock
  function isValidCode(str){ return /^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test((str||'').toUpperCase()); }
  async function verifyCode(code){ return isValidCode(code); }
  function enterApp(){ hide(qs('#landing')); show(qs('#app')); renderPeople(); refreshSelectors(); }

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
    qsa('.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.getAttribute('data-tab'))));

    // Overview
    qs('#btnSavePerson').addEventListener('click', savePerson);
    qs('#btnClearForm').addEventListener('click', clearForm);
    qs('#btnExportJSON').addEventListener('click', exportJSON);
    qs('#fileImportJSON').addEventListener('change', importJSON);
    qs('#btnExportGED').addEventListener('click', exportGEDCOM);
    qs('#fileImportGED').addEventListener('change', importGEDCOM);

    // Reports
    qs('#btnReportA').addEventListener('click', ()=>generateReport('ancestor'));
    qs('#btnReportD').addEventListener('click', ()=>generateReport('descendant'));
    qs('#btnReportT').addEventListener('click', ()=>generateReport('timeline'));

    // Tree controls (lazy-loaded)
  });

  // --- Tabs
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

  // --- People CRUD
  function renderPeople(){
    const tbody = qs('#peopleRows'); tbody.innerHTML='';
    state.people.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2">${p.name||''}</td>
        <td class="py-2">${p.sex||''}</td>
        <td class="py-2 text-zinc-500">${p.birthDate||''} ${p.birthPlace?(' · '+p.birthPlace):''}</td>
        <td class="py-2 text-zinc-500">${p.deathDate||''} ${p.deathPlace?(' · '+p.deathPlace):''}</td>
        <td class="py-2 text-right">
          <button data-id="${p.id}" class="btnEdit text-blue-600 mr-3">Edit</button>
          <button data-id="${p.id}" class="btnDel text-red-600">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    qsa('.btnEdit').forEach(b=>b.addEventListener('click', ()=>loadToForm(b.getAttribute('data-id'))));
    qsa('.btnDel').forEach(b=>b.addEventListener('click', ()=>{ const id=b.getAttribute('data-id'); state.people=state.people.filter(x=>x.id!==id); state.links=state.links.filter(l=>l.parentId!==id && l.childId!==id); state.spouses=state.spouses.filter(pair=>pair[0]!==id && pair[1]!==id); saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawTree(); }));
  }
  function loadToForm(id){
    const p = state.people.find(x=>x.id===id); if(!p) return;
    qs('#pId').value=p.id; qs('#pName').value=p.name||''; qs('#pSex').value=p.sex||'';
    qs('#pBirthDate').value=p.birthDate||''; qs('#pBirthPlace').value=p.birthPlace||'';
    qs('#pDeathDate').value=p.deathDate||''; qs('#pDeathPlace').value=p.deathPlace||''; qs('#pNotes').value=p.notes||'';
  }
  function clearForm(){ ['pId','pName','pSex','pBirthDate','pBirthPlace','pDeathDate','pDeathPlace','pNotes'].forEach(id=>{ const el=qs('#'+id); if(el) el.value=''; }); }
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
      notes: qs('#pNotes').value.trim() || ''
    };
    const idx = state.people.findIndex(x=>x.id===id);
    if(idx>=0) state.people[idx]=person; else state.people.push(person);
    saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawTree(); clearForm();
  }

  // --- Media
  function renderMedia(){
    const grid = qs('#mediaGrid'); grid.innerHTML='';
    (state.media||[]).forEach((m,i)=>{
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

  // --- Sources/Citations (simple)
  function renderSources(){
    const list = qs('#sourceList'); list.innerHTML='';
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

  // --- Reports
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
  function generateReport(kind){
    let out='';
    if(kind==='ancestor'){
      const root = qs('#reportRootA').value;
      const lines=[];
      function parentsOf(id){
        const ps = state.links.filter(l=>l.childId===id).map(l=>l.parentId);
        return Array.from(new Set(ps));
      }
      function walk(id, depth=0){
        const p = state.people.find(x=>x.id===id); if(!p) return;
        lines.push('  '.repeat(depth)+'• '+(p.name||'Unnamed')+(p.birthDate?` (b. ${p.birthDate})`:''));
        parentsOf(id).forEach(pid=>walk(pid, depth+1));
      }
      walk(root,0); out = lines.join('\n');
    }else if(kind==='descendant'){
      const root = qs('#reportRootD').value;
      const lines=[];
      function childrenOf(id){
        const cs = state.links.filter(l=>l.parentId===id).map(l=>l.childId);
        return Array.from(new Set(cs));
      }
      function walk(id, depth=0){
        const p = state.people.find(x=>x.id===id); if(!p) return;
        lines.push('  '.repeat(depth)+'• '+(p.name||'Unnamed')+(p.birthDate?` (b. ${p.birthDate})`:''));
        childrenOf(id).forEach(cid=>walk(cid, depth+1));
      }
      walk(root,0); out = lines.join('\n');
    }else if(kind==='timeline'){
      const events=[];
      state.people.forEach(p=>{
        if(p.birthDate) events.push({date:p.birthDate, what:`Birth — ${p.name}`, person:p.id});
        if(p.deathDate) events.push({date:p.deathDate, what:`Death — ${p.name}`, person:p.id});
      });
      events.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
      out = events.map(e=>`${e.date||'----'}  |  ${e.what}`).join('\n');
    }
    qs('#reportOut').textContent = out || '(No data)';
  }

  // --- GEDCOM import/export (basic INDI/FAM)
  function exportGEDCOM(){
    function gedDate(d){
      if(!d) return '';
      // Accept YYYY-MM-DD or YYYY or YYYY-MM
      const parts = d.split('-');
      if(parts.length===3){ const [y,m,day]=parts; const mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][parseInt(m,10)-1]; return `${int(day)} ${mon} ${y}`; }
      if(parts.length===2){ const [y,m]=parts; const mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][parseInt(m,10)-1]; return `${mon} ${y}`; }
      return d;
    }
    function int(s){ try{return parseInt(s,10)}catch{return s} }
    let lines = [];
    lines.push('0 HEAD');
    lines.push('1 SOUR GenesisGates');
    lines.push('1 GEDC');
    lines.push('2 VERS 5.5.1');
    lines.push('2 FORM LINEAGE-LINKED');
    lines.push('1 CHAR UTF-8');

    // Map our IDs to GEDCOM X refs
    const xref = {};
    state.people.forEach((p,i)=> xref[p.id] = `@I${i+1}@`);
    // INDI
    state.people.forEach(p=>{
      lines.push(`0 ${xref[p.id]} INDI`);
      if(p.name) lines.push(`1 NAME ${p.name}`);
      if(p.sex) lines.push(`1 SEX ${p.sex}`);
      if(p.birthDate || p.birthPlace){ lines.push('1 BIRT'); if(p.birthDate) lines.push('2 DATE '+p.birthDate); if(p.birthPlace) lines.push('2 PLAC '+p.birthPlace); }
      if(p.deathDate || p.deathPlace){ lines.push('1 DEAT'); if(p.deathDate) lines.push('2 DATE '+p.deathDate); if(p.deathPlace) lines.push('2 PLAC '+p.deathPlace); }
    });

    // Families: derive from links+spouses (very basic)
    const fams = [];
    const famMap = new Map(); // key parentPair -> famId
    function famKey(a,b){ return [a,b].sort().join('|'); }
    state.spouses.forEach(pair=>{
      const [a,b]=pair;
      const key = famKey(a,b);
      if(!famMap.has(key)){ famMap.set(key, fams.length); fams.push({husb:a, wife:b, children:[]}); }
    });
    state.links.forEach(l=>{
      // Assign child to any family where (parentId is a or b)
      const par = l.parentId;
      fams.forEach(f=>{ if(par===f.husb || par===f.wife){ if(!f.children.includes(l.childId)) f.children.push(l.childId); } });
    });
    fams.forEach((f,i)=>{
      const fid = `@F${i+1}@`;
      lines.push(`0 ${fid} FAM`);
      if(f.husb) lines.push(`1 HUSB ${xref[f.husb]||''}`);
      if(f.wife) lines.push(`1 WIFE ${xref[f.wife]||''}`);
      f.children.forEach(cid=> lines.push(`1 CHIL ${xref[cid]||''}`));
    });

    lines.push('0 TRLR');
    const blob = 'data:text/plain;charset=utf-8,'+encodeURIComponent(lines.join('\n'));
    const a = document.createElement('a'); a.href=blob; a.download='genesis-gates.ged'; a.click();
  }

  function importGEDCOM(e){
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      const text = r.result;
      const lines = text.split(/\r?\n/);
      // Minimal GEDCOM parser for INDI + FAM with NAME/SEX/BIRT/DEAT/PLAC/DATE, HUSB/WIFE/CHIL
      const inds = {}; const fams = [];
      let current = null; let currentType = null;
      lines.forEach(raw=>{
        const line = raw.trim(); if(!line) return;
        const m = line.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z0-9_]+)?\s*(.*)?$/);
        if(!m) return;
        const level = parseInt(m[1],10);
        const xref = m[2] || null;
        const tag = m[3] || '';
        const data = (m[4]||'').trim();
        if(level===0 && xref && tag==='INDI'){ current = { id:xref, data:{}}; currentType='INDI'; inds[xref]=current.data; }
        else if(level===0 && xref && tag==='FAM'){ current = { id:xref, data:{children:[]} }; currentType='FAM'; fams.push(current.data); }
        else if(currentType==='INDI'){
          if(tag==='NAME'){ current.data.name = data; }
          else if(tag==='SEX'){ current.data.sex = data; }
          else if(tag==='BIRT'){ current._birt = true; }
          else if(tag==='DEAT'){ current._deat = true; }
          else if(tag==='DATE'){ if(current._birt) current.data.birthDate = data; if(current._deat) current.data.deathDate = data; }
          else if(tag==='PLAC'){ if(current._birt) current.data.birthPlace = data; if(current._deat) current.data.deathPlace = data; }
          else if(level===1){ current._birt=false; current._deat=false; } // reset when new level-1 tag starts
        }else if(currentType==='FAM'){
          if(tag==='HUSB'){ current.data.husb = data; }
          else if(tag==='WIFE'){ current.data.wife = data; }
          else if(tag==='CHIL'){ current.data.children.push(data); }
        }
      });
      // Convert to our internal ids
      const map = {}; const people=[];
      Object.keys(inds).forEach((xref,i)=>{
        const np = Object.assign({ id: uid() }, inds[xref]);
        map[xref]=np.id; people.push(np);
      });
      const links=[]; const spouses=[];
      fams.forEach(f=>{
        const a = map[f.husb]; const b = map[f.wife];
        if(a && b) spouses.push([a,b]);
        (f.children||[]).forEach(chref=>{
          const c = map[chref];
          if(c && a) links.push({parentId:a, childId:c});
          if(c && b) links.push({parentId:b, childId:c});
        });
      });
      state.people = people; state.links = links; state.spouses = spouses;
      saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawTree();
      alert('GEDCOM imported.');
    };
    r.readAsText(f);
  }

  // --- Settings
  function bindSettings(){
    const large = qs('#optLargeNodes'), spouses=qs('#optShowSpouses'), curved=qs('#optCurvedLinks');
    if(large && !large._bound){ large._bound=true; large.checked = !!state.opts.large; large.onchange = ()=>{ state.opts.large = large.checked; saveState(state); if(window._treeReady) drawTree(); }; }
    if(spouses && !spouses._bound){ spouses._bound=true; spouses.checked = state.opts.spouses!==false; spouses.onchange = ()=>{ state.opts.spouses = spouses.checked; saveState(state); if(window._treeReady) drawTree(); }; }
    if(curved && !curved._bound){ curved._bound=true; curved.checked = state.opts.curved!==false; curved.onchange = ()=>{ state.opts.curved = curved.checked; saveState(state); if(window._treeReady) drawTree(); }; }
  }

  // --- Export/Import JSON
  function exportJSON(){
    const a=document.createElement('a');
    a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(state,null,2));
    a.download='genesis-gates.json'; a.click();
  }
  function importJSON(e){
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload=()=>{ try{ const data=JSON.parse(r.result); state=Object.assign(state,data); saveState(state); renderPeople(); refreshSelectors(); if(window._treeReady) drawTree(); }catch{} };
    r.readAsText(f);
  }

  // --- Lazy loaders
  async function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src=src; s.defer=true;
      s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  // Tree (D3) based (similar to Tree Pro)
  let d3Loaded=false, svg, g, zoom, mini, miniCtx, collapsed=new Set();
  async function loadTree(){
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
      d3Loaded=true; window._treeReady=true;
      mini = qs('#miniMap'); miniCtx = mini.getContext('2d');
      initTreeCanvas();
      bindTreeControls();
      drawTree(); fitTree();
    }catch(e){ alert('Failed to load tree library. Refresh the page.'); }
  }
  function bindTreeControls(){
    qs('#btnFitTree').addEventListener('click', fitTree);
    qs('#btnCenterTree').addEventListener('click', centerTree);
    qs('#btnResetTree').addEventListener('click', ()=>{ collapsed.clear(); drawTree(); fitTree(); });
    qs('#btnTreeSearch').addEventListener('click', ()=>{ const q=qs('#treeSearch').value.trim(); if(q) focusByName(q); });
    qs('#rootSelect').addEventListener('change', ()=>{ drawTree(); fitTree(); });
    qs('#treeSearch').addEventListener('keydown', (e)=>{ if(e.key==='Enter') qs('#btnTreeSearch').click(); });
  }
  function initTreeCanvas(){
    const host = qs('#treeHost'); host.innerHTML='';
    svg = d3.select(host).append('svg').attr('width','100%').attr('height','100%');
    g = svg.append('g');
    zoom = d3.zoom().scaleExtent([0.3, 2.5]).on('zoom', (event)=>{ g.attr('transform', event.transform); drawMiniMap(); });
    svg.call(zoom);
  }
  function personById(id){ return state.people.find(p=>p.id===id); }
  function childrenOf(id){ return Array.from(new Set(state.links.filter(l=>l.parentId===id).map(l=>l.childId))).map(pid=>personById(pid)).filter(Boolean); }
  function spouseOf(id){ const pair = state.spouses.find(pr=>pr[0]===id || pr[1]===id); if(!pair) return null; const partnerId = pair[0]===id ? pair[1] : pair[0]; return personById(partnerId); }
  function buildHierarchy(rootId, visited=new Set()){
    const me = personById(rootId); if(!me || visited.has(rootId)) return null; visited.add(rootId);
    const kids = childrenOf(rootId).map(ch=>buildHierarchy(ch.id, visited)).filter(Boolean);
    return { id:me.id, name:me.name, _collapsed:collapsed.has(me.id), children:kids };
  }
  function drawTree(){
    if(!d3Loaded) return;
    const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
    const rootSel = qs('#rootSelect'); if(rootSel && rootSel.options.length===0){ refreshSelectors(); }
    const rootId = (qs('#rootSelect').value || (state.people[0] && state.people[0].id));
    const data = buildHierarchy(rootId) || {name:'(empty)'};
    g.selectAll('*').remove();
    const root = d3.hierarchy(data, d=> (d._collapsed ? null : d.children) );
    const nodeW = (state.opts.large ? 200 : 160), nodeH = (state.opts.large ? 60 : 44);
    const hgap = (state.opts.large ? 60 : 40), vgap = (state.opts.large ? 90 : 70);
    const treeLayout = d3.tree().nodeSize([vgap, nodeW + hgap]);
    treeLayout(root);

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
      .text(d=>d.data.name).on('click', (event,d)=>{ if(collapsed.has(d.data.id)) collapsed.delete(d.data.id); else collapsed.add(d.data.id); drawTree(); });

    nodes.append('text').attr('x', nodeW-52).attr('y', 14).attr('font-size','11px').attr('fill','#16A34A').style('cursor','pointer')
      .text('+P').on('click', (event,d)=>{ addParent(d.data.id); });
    nodes.append('text').attr('x', nodeW-24).attr('y', 14).attr('font-size','11px').attr('fill','#5850EC').style('cursor','pointer')
      .text('+C').on('click', (event,d)=>{ addChild(d.data.id); });
    nodes.append('text').attr('x', nodeW-86).attr('y', 14).attr('font-size','11px').attr('fill','#374151').style('cursor','pointer')
      .text('+S').on('click', (event,d)=>{ addSpouse(d.data.id); });

    if(state.opts.spouses !== false){
      const spouseNodes = nodes.filter(d=> spouseOf(d.data.id));
      spouseNodes.each(function(d){
        const s = spouseOf(d.data.id);
        const gNode = d3.select(this);
        gNode.append('rect').attr('x', nodeW+10).attr('y', 0).attr('rx',10).attr('ry',10).attr('width', nodeW*0.6).attr('height', nodeH)
          .attr('fill','#ffffff').attr('stroke','#E5E7EB');
        gNode.append('text').attr('x', nodeW+10+10).attr('y', nodeH/2+4).attr('font-size','12px').attr('fill','#6B7280').text(s ? s.name : 'Partner');
        g.append('line').attr('x1', d.y+80+nodeW).attr('y1', d.x).attr('x2', d.y+80+nodeW+10).attr('y2', d.x).attr('stroke','#9CA3AF').attr('stroke-width',2);
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
    const host = qs('#treeHost'); const { width, height } = host.getBoundingClientRect();
    const rootId = (qs('#rootSelect').value || (state.people[0] && state.people[0].id));
    const data = buildHierarchy(rootId) || {name:'(empty)'};
    const root = d3.hierarchy(data, d=> (d._collapsed ? null : d.children) );
    const nodeW = (state.opts.large ? 200 : 160), nodeH = (state.opts.large ? 60 : 44);
    const hgap = (state.opts.large ? 60 : 40), vgap = (state.opts.large ? 90 : 70);
    const treeLayout = d3.tree().nodeSize([vgap, nodeW + hgap]);
    treeLayout(root);
    let target = null; root.each(n=>{ if(n.data.id===p.id) target=n; });
    if(!target){ alert('Found in data but not visible (collapsed). Expand branches.'); return; }
    const x = target.x, y = target.y+80, scale=1.0;
    d3.select(host.querySelector('svg')).transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(width/2 - y*scale, height/2 - x*scale).scale(scale));
  }

  function drawMiniMap(){
    const host = qs('#treeHost'); const svgEl = host.querySelector('svg'); if(!svgEl) return;
    const bounds = g.node().getBBox(); const view = svgEl.getBoundingClientRect(); const transform = d3.zoomTransform(svgEl);
    const mini = qs('#miniMap'); const ctx = mini.getContext('2d');
    const scaleX = mini.width / Math.max(bounds.width, 1); const scaleY = mini.height / Math.max(bounds.height, 1); const scale = Math.min(scaleX, scaleY);
    ctx.clearRect(0,0,mini.width, mini.height);
    ctx.fillStyle = '#F3F4F6'; ctx.fillRect(0,0,mini.width, mini.height);
    ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 2; ctx.strokeRect(0,0,bounds.width*scale, bounds.height*scale);
    const vx = (-bounds.x*transform.k + transform.x)/ (bounds.width) * (bounds.width*scale);
    const vy = (-bounds.y*transform.k + transform.y)/ (bounds.height) * (bounds.height*scale);
    const vw = view.width/ (bounds.width) * (bounds.width*scale) / transform.k;
    const vh = view.height/ (bounds.height) * (bounds.height*scale) / transform.k;
    ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 2; ctx.strokeRect(vx, vy, vw, vh);
  }

  // --- Map (Leaflet + heat)
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
      if(Number.isFinite(parseFloat(p.lat))&&Number.isFinite(parseFloat(p.lon))){ pts.push([parseFloat(p.lat),parseFloat(p.lon), 0.6]); }
      if(qs('#chkArcs').checked && Number.isFinite(parseFloat(p.lat))&&Number.isFinite(parseFloat(p.lon))&&Number.isFinite(parseFloat(p.blat))&&Number.isFinite(parseFloat(p.blon))){
        L.polyline([[parseFloat(p.blat),parseFloat(p.blon)],[parseFloat(p.lat),parseFloat(p.lon)]], { color:'#6D28D9', weight:2, opacity:0.85 }).addTo(arcLayerGroup);
      }
    });
    heatLayer.setLatLngs(pts);
  }

  // --- Settings
  function bindSettings(){
    const large = qs('#optLargeNodes'), spouses=qs('#optShowSpouses'), curved=qs('#optCurvedLinks');
    if(large && !large._bound){ large._bound=true; large.checked = !!state.opts.large; large.onchange = ()=>{ state.opts.large = large.checked; saveState(state); if(window._treeReady) drawTree(); }; }
    if(spouses && !spouses._bound){ spouses._bound=true; spouses.checked = state.opts.spouses!==false; spouses.onchange = ()=>{ state.opts.spouses = spouses.checked; saveState(state); if(window._treeReady) drawTree(); }; }
    if(curved && !curved._bound){ curved._bound=true; curved.checked = state.opts.curved!==false; curved.onchange = ()=>{ state.opts.curved = curved.checked; saveState(state); if(window._treeReady) drawTree(); }; }
  }

})();