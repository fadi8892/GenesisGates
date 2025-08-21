// External JS for Genesis Gates (lazy-loaded libs)
(function(){
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const show = el => el.classList.remove('hidden');
  const hide = el => el.classList.add('hidden');
  const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  const STORAGE = 'gg:v2';

  function saveState(state){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE)) || { people:[], key:null, pubJwk:null }; }catch{ return { people:[], key:null, pubJwk:null }; } }

  let state = loadState();
  if(state.people.length===0){
    state.people = [
      { id: uid(), name:'Alex Pioneer', birth:'Baghdad, Iraq', city:'San Diego, USA', lat:32.7157, lon:-117.1611, blat:33.3152, blon:44.3661 },
      { id: uid(), name:'Brianna Pioneer', birth:'Erbil, Iraq', city:'Phoenix, USA', lat:33.4484, lon:-112.0740, blat:36.1911, blon:44.0092 }
    ];
    saveState(state);
  }

  // --- Landing + Access code
  function isValidCode(str){ return /^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test((str||'').toUpperCase()); }
  async function verifyCode(code){ return isValidCode(code); }
  function enterApp(){ hide(qs('#landing')); show(qs('#app')); renderPeople(); }

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
    qs('#docsLink').addEventListener('click', e=>{ e.preventDefault(); alert('Genesis Gates: private family atlas with access codes, wallet login, heatmaps, and AI tools.'); });

    // Tabs
    qsa('.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.getAttribute('data-tab'))));

    // People CRUD
    qs('#btnClearForm').addEventListener('click', clearForm);
    qs('#btnSavePerson').addEventListener('click', savePerson);
    qs('#btnExport').addEventListener('click', exportJSON);
    qs('#fileImport').addEventListener('change', importJSON);
    qs('#btnGeo').addEventListener('click', geocode);

    // Modals and owner
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

    renderPeople();
  });

  function renderPeople(){
    const tbody = qs('#peopleRows'); tbody.innerHTML='';
    state.people.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2">${p.name}</td>
        <td class="py-2 text-zinc-500">${p.birth}</td>
        <td class="py-2 text-zinc-500">${p.city}</td>
        <td class="py-2 text-right">
          <button data-id="${p.id}" class="btnEdit text-blue-600 mr-3">Edit</button>
          <button data-id="${p.id}" class="btnDel text-red-600">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    qsa('.btnEdit').forEach(b=>b.addEventListener('click', ()=>loadToForm(b.getAttribute('data-id'))));
    qsa('.btnDel').forEach(b=>b.addEventListener('click', ()=>{ const id=b.getAttribute('data-id'); state.people=state.people.filter(x=>x.id!==id); saveState(state); renderPeople(); if(window._mapReady) refreshMap(); }));
  }
  function loadToForm(id){
    const p = state.people.find(x=>x.id===id); if(!p) return;
    qs('#pId').value=p.id; qs('#pName').value=p.name; qs('#pBirth').value=p.birth; qs('#pCity').value=p.city;
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
    saveState(state); renderPeople(); if(window._mapReady) refreshMap(); clearForm();
  }
  function exportJSON(){
    const a=document.createElement('a');
    a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({people:state.people},null,2));
    a.download='genesis-gates.json'; a.click();
  }
  function importJSON(e){
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload=()=>{ try{ const data=JSON.parse(r.result); state.people=data.people||[]; saveState(state); renderPeople(); if(window._mapReady) refreshMap(); }catch{} };
    r.readAsText(f);
  }
  async function geocode(){
    const city = qs('#pCity').value.trim(); if(!city) return;
    try{
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(city));
      const arr = await res.json(); if(arr && arr[0]){ qs('#pLat').value=arr[0].lat; qs('#pLon').value=arr[0].lon; }
      const birth = qs('#pBirth').value.trim(); if(birth){ const res2=await fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(birth)); const a2=await res2.json(); if(a2&&a2[0]){ qs('#pBLat').value=a2[0].lat; qs('#pBLon').value=a2[0].lon; } }
    }catch(e){ alert('Geocoding failed; enter coordinates manually.'); }
  }

  // --- Tabs and map (lazy load) ---
  function switchTab(name){
    ['overview','map','ai','privacy'].forEach(n=>{
      qs('#panel-'+n).classList.toggle('hidden', n!==name);
      const btn = qs('.tab[data-tab="'+n+'"]'); if(btn) btn.classList.toggle('active', n===name);
    });
    if(name==='map' && !window._mapReady) loadMap();
    if(name==='ai' && !window._aiReady) loadAI();
  }
  window.switchTab = switchTab; // expose for tab buttons

  async function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src=src; s.defer=true;
      s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  async function loadMap(){
    try{
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await loadScript('https://unpkg.com/leaflet.heat/dist/leaflet-heat.js');
      initMap();
      window._mapReady = true;
    }catch(e){
      alert('Map libraries failed to load. Check your connection and refresh.');
    }
  }

  let map, heatLayer, arcLayerGroup;
  function initMap(){
    map = L.map('map').setView([30,10], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 6, attribution:'© OpenStreetMap' }).addTo(map);
    heatLayer = L.heatLayer([], { radius: 20, blur: 15, maxZoom: 6 }).addTo(map);
    arcLayerGroup = L.layerGroup().addTo(map);
    refreshMap();
    qs('#chkHeat').addEventListener('change', ()=>{ if(qs('#chkHeat').checked){ heatLayer.addTo(map);} else { map.removeLayer(heatLayer);} });
    qs('#chkArcs').addEventListener('change', ()=>{ if(qs('#chkArcs').checked){ arcLayerGroup.addTo(map);} else { map.removeLayer(arcLayerGroup);} });
  }
  function refreshMap(){
    if(!heatLayer || !arcLayerGroup) return;
    const pts = [];
    arcLayerGroup.clearLayers();
    state.people.forEach(p=>{
      if(Number.isFinite(p.lat)&&Number.isFinite(p.lon)){ pts.push([p.lat,p.lon, 0.6]); }
      if(qs('#chkArcs').checked && Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Number.isFinite(p.blat)&&Number.isFinite(p.blon)){
        L.polyline([[p.blat,p.blon],[p.lat,p.lon]], { color:'#6D28D9', weight:2, opacity:0.85 }).addTo(arcLayerGroup);
      }
    });
    heatLayer.setLatLngs(pts);
  }

  // --- AI lazy load ---
  async function loadAI(){ window._aiReady=true; await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'); }
  qs('#ocrFile') && qs('#ocrFile').addEventListener('change', async e=>{
    const file = e.target.files && e.target.files[0]; if(!file) return;
    const textarea = qs('#ocrText'); textarea.value='Processing…';
    try{ const { data } = await Tesseract.recognize(file, 'eng'); textarea.value = data.text || ''; }
    catch(e){ textarea.value = 'OCR failed. Try a clearer image.'; }
  });

  // Face models (on demand)
  let faceModelsLoaded=false;
  qs('#btnLoadFace') && qs('#btnLoadFace').addEventListener('click', async ()=>{
    const status = qs('#faceStatus'); status.textContent = 'Loading models…';
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
      const base='https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
      await window.faceapi.nets.ssdMobilenetv1.loadFromUri(base);
      await window.faceapi.nets.faceLandmark68Net.loadFromUri(base);
      await window.faceapi.nets.faceRecognitionNet.loadFromUri(base);
      faceModelsLoaded=true; status.textContent='Models ready';
    }catch(e){ status.textContent='Failed to load models'; }
  });
  qs('#faceFile') && qs('#faceFile').addEventListener('change', async e=>{
    const file = e.target.files && e.target.files[0]; if(!file) return;
    if(!faceModelsLoaded){ alert('Click "Load models" first'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const canvas = qs('#faceCanvas'); canvas.innerHTML=''; canvas.appendChild(img);
      try{
        const detections = await window.faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        qs('#faceCount').textContent = (detections && detections.length) ? detections.length : 0;
      }catch(e){ qs('#faceCount').textContent = '0'; }
    };
    img.src = url;
  });

  // --- Generate viewer code (demo) ---
  qs('#btnGenCode').addEventListener('click', async ()=>{
    const treeId = qs('#shareTreeId').value.trim()||'default';
    const days = qs('#shareExpiry').value.trim()||'14';
    const token = btoa(JSON.stringify({t:treeId, e:Date.now()+parseInt(days)*86400000})).replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,25);
    const blocks = token.match(/.{1,5}/g).slice(0,5).join('-');
    qs('#shareCode').textContent = blocks;
  });

})();