const SUPABASE_URL = "https://mmqawrbkirthcfxbjehp.supabase.co";
const SUPABASE_KEY = "sb_publishable_IhVAMfcAeNI4-aiIn5fm2w_vY9tnfVD";
const BUCKET = "waqas";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
let files = [], signUpMode = false;
let currentExcel = null;
let currentExcelName = "";
let currentSheetIndex = 0;

function toast(message){ const t=$("toast"); t.textContent=message; t.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),2800); }
function formatBytes(n){ if(!n) return "0 B"; const u=["B","KB","MB","GB"]; const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3); return `${(n/Math.pow(1024,i)).toFixed(i?1:0)} ${u[i]}`; }
function icon(name){ const ext=(name.split(".").pop()||"").toLowerCase(); if(["jpg","jpeg","png","gif","webp"].includes(ext))return"▧"; if(["xlsx","xls","csv"].includes(ext))return"▤"; if(["pdf"].includes(ext))return"▱"; if(["zip","rar","7z"].includes(ext))return"▦"; if(["doc","docx","txt"].includes(ext))return"▥"; return"◫"; }
function showApp(user){ $("authView").hidden=true; $("appView").hidden=false; $("userEmail").textContent=user?.email||""; loadFiles(); }
function showAuth(){ $("authView").hidden=false; $("appView").hidden=true; }

$("toggleAuth").onclick=()=>{ signUpMode=!signUpMode; $("authBtn").textContent=signUpMode?"Create account":"Sign in"; $("toggleAuth").textContent=signUpMode?"Already have an account? Sign in":"Create a new account"; $("authMsg").textContent=""; };

$("authForm").onsubmit=async e=>{
  e.preventDefault(); $("authMsg").textContent="Working…";
  const email=$("email").value.trim(), password=$("password").value;
  const result=signUpMode ? await db.auth.signUp({email,password}) : await db.auth.signInWithPassword({email,password});
  if(result.error){ $("authMsg").textContent=result.error.message; return; }
  if(signUpMode && !result.data.session){ $("authMsg").style.color="#9aa9c0"; $("authMsg").textContent="Account created. Check your email if confirmation is enabled, then sign in."; return; }
  $("authMsg").textContent=""; showApp(result.data.user);
};

$("logoutBtn").onclick=async()=>{ await db.auth.signOut(); showAuth(); toast("Logged out"); };
$("fileInput").onchange=e=>uploadFiles([...e.target.files]);

async function uploadFiles(selected){
  if(!selected.length)return;
  for(const file of selected){
    $("statusText").textContent=`Uploading ${file.name}…`;
    const path=`${file.name}`;
    const {error}=await db.storage.from(BUCKET).upload(path,file,{upsert:true,contentType:file.type||"application/octet-stream"});
    if(error) toast(`Upload failed: ${error.message}`); else toast(`${file.name} uploaded`);
  }
  $("fileInput").value=""; await loadFiles();
}

async function loadFiles(){
  $("statusText").textContent="Loading files…";
  const {data,error}=await db.storage.from(BUCKET).list("",{limit:1000,sortBy:{column:"name",order:"asc"}});
  if(error){ $("statusText").textContent=error.message; toast("Could not load files"); return; }
  files=(data||[]).filter(x=>x.name);
  renderFiles();
}
function renderFiles(){
  const q=$("searchInput").value.toLowerCase().trim();
  const filtered=files.filter(f=>f.name.toLowerCase().includes(q));
  $("fileCount").textContent=files.length;
  const total=files.reduce((sum,f)=>sum+(Number(f.metadata?.size)||0),0);
  $("storageUsed").textContent=formatBytes(total);
  $("statusText").textContent=`${files.length} file${files.length===1?"":"s"} in your cloud`;
  $("fileList").innerHTML="";
  $("emptyState").hidden=filtered.length!==0;
  filtered.forEach(f=>{
    const row=document.createElement("div"); row.className="file-row";
    const size=formatBytes(Number(f.metadata?.size)||0);
    const date=f.updated_at?new Date(f.updated_at).toLocaleDateString():"";
    row.innerHTML=`<div class="file-main"><div class="file-icon">${icon(f.name)}</div><div style="min-width:0"><div class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div><div class="file-meta">${size} · ${date}</div></div></div><div class="file-actions"><button class="ghost" data-action="open">Open</button><button class="ghost" data-action="download">Download</button><button class="ghost danger" data-action="delete">Delete</button></div>`;
    row.querySelector('[data-action="open"]').onclick=()=>openFile(f.name);
    row.querySelector('[data-action="download"]').onclick=()=>downloadFile(f.name);
    row.querySelector('[data-action="delete"]').onclick=()=>deleteFile(f.name);
    const openBtn=row.querySelector('[data-action="open"]');
    const ext=(f.name.split(".").pop()||"").toLowerCase();
    if(!["xlsx","xls","csv"].includes(ext)){ openBtn.textContent="Open"; openBtn.disabled=true; openBtn.title="Excel editor supports XLSX, XLS and CSV"; }
    $("fileList").appendChild(row);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
$("searchInput").oninput=renderFiles;

async function downloadFile(name){
  const {data,error}=await db.storage.from(BUCKET).download(name);
  if(error){toast(`Download failed: ${error.message}`);return;}
  const url=URL.createObjectURL(data), a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}
async function deleteFile(name){
  if(!confirm(`Delete "${name}"?`))return;
  const {error}=await db.storage.from(BUCKET).remove([name]);
  if(error){toast(`Delete failed: ${error.message}`);return;}
  toast(`${name} deleted`); loadFiles();
}

const dz=$("dropZone");
["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag")}));
["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag")}));
dz.addEventListener("drop",e=>uploadFiles([...e.dataTransfer.files]));
dz.onclick=()=> $("fileInput").click();

// ---------- Excel editor ----------
async function openFile(name){
  const ext=(name.split(".").pop()||"").toLowerCase();
  if(!["xlsx","xls","csv"].includes(ext)){toast("Only Excel/CSV files can be opened in the editor");return;}
  $("editorStatus").textContent="Downloading file…";
  $("editorFileName").textContent=name;
  $("excelModal").hidden=false;
  try{
    const {data,error}=await db.storage.from(BUCKET).download(name);
    if(error) throw error;
    const buffer=await data.arrayBuffer();
    currentExcel=XLSX.read(buffer,{type:"array",cellFormula:true,cellStyles:true});
    currentExcelName=name; currentSheetIndex=0;
    renderSheetTabs(); renderExcelSheet();
    $("editorStatus").textContent=`${currentExcel.SheetNames.length} sheet${currentExcel.SheetNames.length===1?"":"s"} loaded`;
  }catch(err){
    $("editorModal").hidden=true;
    toast(`Open failed: ${err.message||err}`);
  }
}

function renderSheetTabs(){
  const box=$("sheetTabs"); box.innerHTML="";
  currentExcel.SheetNames.forEach((name,i)=>{
    const b=document.createElement("button"); b.textContent=name; b.className=i===currentSheetIndex?"active":"";
    b.onclick=()=>{captureCurrentSheet(); currentSheetIndex=i; renderSheetTabs(); renderExcelSheet();};
    box.appendChild(b);
  });
}

function getSheetMatrix(ws){
  const range=XLSX.utils.decode_range(ws["!ref"]||"A1:A1");
  const rows=[];
  for(let r=range.s.r;r<=range.e.r;r++){
    const row=[];
    for(let c=range.s.c;c<=range.e.c;c++){
      const addr=XLSX.utils.encode_cell({r,c}); const cell=ws[addr];
      let v="";
      if(cell){ v=cell.f ? "="+cell.f : (cell.v ?? ""); }
      row.push(v);
    }
    rows.push(row);
  }
  return rows;
}

function renderExcelSheet(){
  const ws=currentExcel.Sheets[currentExcel.SheetNames[currentSheetIndex]];
  const matrix=getSheetMatrix(ws);
  const table=$("excelTable"); table.innerHTML="";
  const maxCols=Math.max(1,...matrix.map(r=>r.length));
  const colGroup=document.createElement("colgroup");
  for(let c=0;c<maxCols;c++){ const col=document.createElement("col"); col.style.width="130px"; colGroup.appendChild(col); }
  table.appendChild(colGroup);
  matrix.forEach((row,r)=>{
    const tr=document.createElement("tr");
    const th=document.createElement("th"); th.textContent=r+1; th.className="row-number"; tr.appendChild(th);
    for(let c=0;c<maxCols;c++){
      const td=document.createElement("td"); td.contentEditable="true"; td.spellcheck=false; td.dataset.r=r; td.dataset.c=c; td.textContent=row[c]??"";
      tr.appendChild(td);
    }
    table.appendChild(tr);
  });
  if(!matrix.length){ const tr=document.createElement("tr"); const td=document.createElement("td"); td.textContent="Empty sheet"; tr.appendChild(td); table.appendChild(tr); }
}

function captureCurrentSheet(){
  if(!currentExcel)return;
  const table=$("excelTable"); if(!table.rows.length)return;
  const aoa=[];
  for(let r=0;r<table.rows.length;r++){
    const row=[];
    for(let c=1;c<table.rows[r].cells.length;c++) row.push(table.rows[r].cells[c].textContent);
    aoa.push(row);
  }
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  // Keep a simple Excel-friendly column width.
  ws["!cols"]=Array(Math.max(...aoa.map(r=>r.length),1)).fill({wch:18});
  currentExcel.Sheets[currentExcel.SheetNames[currentSheetIndex]]=ws;
}

function buildExcelBlob(){
  captureCurrentSheet();
  const out=XLSX.write(currentExcel,{bookType:"xlsx",type:"array"});
  return new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

$("saveExcelBtn").onclick=async()=>{
  if(!currentExcel)return;
  try{
    $("editorStatus").textContent="Saving…";
    const blob=buildExcelBlob();
    const {error}=await db.storage.from(BUCKET).upload(currentExcelName,blob,{upsert:true,contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    if(error)throw error;
    $("editorStatus").textContent="Saved to cloud ✓";
    toast("Excel file saved to cloud");
    await loadFiles();
  }catch(err){ $("editorStatus").textContent="Save failed"; toast(`Save failed: ${err.message||err}`); }
};

$("downloadExcelBtn").onclick=()=>{
  if(!currentExcel)return;
  try{
    const blob=buildExcelBlob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=currentExcelName.replace(/\.(xls|csv)$/i,"")+".xlsx"; a.click(); URL.revokeObjectURL(url); toast("Excel downloaded");
  }catch(err){toast(`Download failed: ${err.message||err}`);}
};

$("closeExcelBtn").onclick=()=>{ $("excelModal").hidden=true; currentExcel=null; currentExcelName=""; };
$("excelModal").addEventListener("click",e=>{ if(e.target===$("excelModal")) $("closeExcelBtn").click(); });

db.auth.getSession().then(({data})=>{ if(data.session?.user) showApp(data.session.user); else showAuth(); });
db.auth.onAuthStateChange((_event,session)=>{ if(session?.user) showApp(session.user); else showAuth(); });
