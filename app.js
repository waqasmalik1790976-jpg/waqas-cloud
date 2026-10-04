const SUPABASE_URL = "https://mmqawrbkirthcfxbjehp.supabase.co";
const SUPABASE_KEY = "sb_publishable_IhVAMfcAeNI4-aiIn5fm2w_vY9tnfVD";
const BUCKET = "waqas";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
let files = [], signUpMode = false;

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
    row.innerHTML=`<div class="file-main"><div class="file-icon">${icon(f.name)}</div><div style="min-width:0"><div class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div><div class="file-meta">${size} · ${date}</div></div></div><div class="file-actions"><button class="ghost" data-action="download">Download</button><button class="ghost danger" data-action="delete">Delete</button></div>`;
    row.querySelector('[data-action="download"]').onclick=()=>downloadFile(f.name);
    row.querySelector('[data-action="delete"]').onclick=()=>deleteFile(f.name);
    $("fileList").appendChild(row);
  });
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
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

db.auth.getSession().then(({data})=>{ if(data.session?.user) showApp(data.session.user); else showAuth(); });
db.auth.onAuthStateChange((_event,session)=>{ if(session?.user) showApp(session.user); else showAuth(); });
