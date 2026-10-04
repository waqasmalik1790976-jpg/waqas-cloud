const SUPABASE_URL="https://mmqawrbkirthcfxbjehp.supabase.co";
const SUPABASE_KEY="sb_publishable_IhVAMfcAeNI4-aiIn5fm2w_vY9tnfVD";
const BUCKET="waqas";
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
let user=null, files=[], mode="login", currentView="overview", currentWorkbook=null, currentSheet=0, currentFile=null;

const $=id=>document.getElementById(id);
const toast=(msg,bad=false)=>{const d=document.createElement("div");d.className="toast"+(bad?" bad":"");d.textContent=msg;$("toast").appendChild(d);setTimeout(()=>d.remove(),3000)};
const fmt=n=>{if(!n)return"0 B";const u=["B","KB","MB","GB"];let i=0;while(n>=1024&&i<3){n/=1024;i++}return n.toFixed(i?1:0)+" "+u[i]};
const icon=f=>{const e=f.name.split(".").pop().toLowerCase();return e==="xlsx"||e==="xls"?"▦":e==="pdf"?"◫":["png","jpg","jpeg","webp"].includes(e)?"▧":e==="doc"||e==="docx"?"▤":"•"};
const isExcel=f=>/\.(xlsx|xls)$/i.test(f.name);

async function init(){
  const {data:{session}}=await db.auth.getSession();
  if(session){user=session.user;showApp();await loadFiles()}
  db.auth.onAuthStateChange((_e,s)=>{if(s){user=s.user;showApp();loadFiles()}else{user=null;$("app").classList.add("hidden");$("auth").classList.remove("hidden")}});
}
function showApp(){ $("auth").classList.add("hidden");$("app").classList.remove("hidden");$("userEmail").textContent=user.email||"User";$("avatar").textContent=(user.email||"W")[0].toUpperCase() }
async function auth(e){
 e.preventDefault();$("authMsg").textContent="Working...";
 const email=$("email").value.trim(),password=$("password").value;
 let r=mode==="login"?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password});
 if(r.error){$("authMsg").textContent=r.error.message;return}
 $("authMsg").textContent=mode==="login"?"Signed in.":"Account created. Check email if confirmation is enabled.";
 if(r.data.session){user=r.data.session.user;showApp();loadFiles()}
}
async function loadFiles(){
 if(!user)return;
 const {data,error}=await db.storage.from(BUCKET).list("",{limit:100,sortBy:{column:"created_at",order:"desc"}});
 if(error){toast(error.message,true);return}
 files=(data||[]).filter(x=>x.name&&!x.name.endsWith("/"));
 render();updateStats();
}
function updateStats(){
 const total=files.reduce((a,f)=>a+(f.metadata?.size||f.metadata?.size_bytes||0),0);
 $("fileCount").textContent=files.length;$("used").textContent=fmt(total);$("sideUsed").textContent=fmt(total);
 const pct=Math.min(100,total/(5*1024**3)*100);$("sidePct").textContent=Math.round(pct)+"%";$("sideProgress").style.width=pct+"%";
 $("docCount").textContent=files.filter(f=>/\.(pdf|doc|docx|txt)$/i.test(f.name)).length;
 $("sheetCount").textContent=files.filter(isExcel).length;$("recentCount").textContent=Math.min(5,files.length);
}
function render(){
 const q=$("search").value.toLowerCase().trim();
 let list=files.filter(f=>f.name.toLowerCase().includes(q));
 if(currentView==="starred") list=list.filter(f=>localStorage.getItem("star_"+f.name)==="1");
 if(currentView==="recent") list=list.slice(0,8);
 $("fileGrid").innerHTML="";
 $("empty").classList.toggle("hidden",list.length>0);
 list.forEach(f=>{
   const c=document.createElement("div");c.className="file-card glass";
   const star=localStorage.getItem("star_"+f.name)==="1";
   c.innerHTML=`<div class="file-top"><div class="file-icon">${icon(f)}</div><button class="file-menu star" title="Star">${star?"★":"☆"}</button></div><div class="file-name" title="${f.name}">${f.name}</div><div class="file-meta">${fmt(f.metadata?.size||f.metadata?.size_bytes||0)} · ${f.created_at?new Date(f.created_at).toLocaleDateString():"Cloud"}</div><div class="file-actions">${isExcel(f)?'<button class="open">Open Excel</button>': '<button class="open">Preview</button>'}<button class="download">Download</button><button class="delete">Delete</button></div>`;
   c.querySelector(".star").onclick=e=>{e.stopPropagation();localStorage.setItem("star_"+f.name,star?"0":"1");render()};
   c.querySelector(".open").onclick=e=>{e.stopPropagation();isExcel(f)?openExcel(f):downloadFile(f)};
   c.querySelector(".download").onclick=e=>{e.stopPropagation();downloadFile(f)};
   c.querySelector(".delete").onclick=e=>{e.stopPropagation();deleteFile(f)};
   $("fileGrid").appendChild(c);
 });
}
async function downloadFile(f){
 const {data,error}=await db.storage.from(BUCKET).download(f.name);
 if(error){toast(error.message,true);return}
 const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=f.name;a.click();URL.revokeObjectURL(a.href);
}
async function deleteFile(f){
 if(!confirm("Delete "+f.name+"?"))return;
 const {error}=await db.storage.from(BUCKET).remove([f.name]);
 if(error)toast(error.message,true);else{toast("File deleted");await loadFiles()}
}
function triggerUpload(){$("fileInput").click()}
async function uploadFiles(list){
 if(!user||!list?.length)return;
 for(const f of list){
   const {error}=await db.storage.from(BUCKET).upload(f.name,f,{upsert:true});
   if(error)toast(f.name+": "+error.message,true);else toast(f.name+" uploaded");
 }
 await loadFiles()
}
async function openExcel(f){
 $("editor").classList.remove("hidden");$("editorName").textContent=f.name;$("editorStatus").textContent="Loading...";
 const {data,error}=await db.storage.from(BUCKET).download(f.name);
 if(error){toast(error.message,true);$("editor").classList.add("hidden");return}
 try{
   const buf=await data.arrayBuffer();currentWorkbook=XLSX.read(buf,{type:"array",cellFormula:true});currentFile=f;currentSheet=0;
   renderSheets();renderSheet();$("editorStatus").textContent="Ready to edit";
 }catch(e){toast("Could not read this Excel file",true);$("editor").classList.add("hidden")}
}
function renderSheets(){
 $("sheetTabs").innerHTML="";
 currentWorkbook.SheetNames.forEach((n,i)=>{const b=document.createElement("button");b.textContent=n;b.className=i===currentSheet?"active":"";b.onclick=()=>{currentSheet=i;renderSheets();renderSheet()};$("sheetTabs").appendChild(b)})
}
function renderSheet(){
 const ws=currentWorkbook.Sheets[currentWorkbook.SheetNames[currentSheet]];
 const range=XLSX.utils.decode_range(ws["!ref"]||"A1:A1");let html="<table><thead><tr><th>#</th>";
 for(let c=range.s.c;c<=range.e.c;c++)html+=`<th>${XLSX.utils.encode_col(c)}</th>`;
 html+="</tr></thead><tbody>";
 for(let r=range.s.r;r<=range.e.r;r++){
   html+=`<tr><td>${r+1}</td>`;
   for(let c=range.s.c;c<=range.e.c;c++){
     const addr=XLSX.utils.encode_cell({r,c}),cell=ws[addr],val=cell?.v??"";
     html+=`<td contenteditable="true" data-r="${r}" data-c="${c}" data-a="${addr}">${escapeHtml(String(val))}</td>`;
   } html+="</tr>"
 }
 html+="</tbody></table>";$("sheetArea").innerHTML=html;
 $("sheetArea").querySelectorAll("td[data-a]").forEach(td=>{
   td.addEventListener("focus",()=>{$("cellRef").textContent=td.dataset.a;$("formula").value=td.textContent});
   td.addEventListener("input",()=>{$("formula").value=td.textContent});
 });
 $("formula").oninput=()=>{const td=document.querySelector(`td[data-a="${$("cellRef").textContent}"]`);if(td){td.textContent=$("formula").value;td.dispatchEvent(new Event("input"))}}
}
const escapeHtml=s=>s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function saveExcel(){
 if(!currentWorkbook||!currentFile)return;
 const ws=currentWorkbook.Sheets[currentWorkbook.SheetNames[currentSheet]];
 $("sheetArea").querySelectorAll("td[data-a]").forEach(td=>{
   const addr=td.dataset.a,v=td.textContent;
   if(!ws[addr])ws[addr]={t:"s",v};
   else{ws[addr].v=v;ws[addr].t="s"}
 });
 const out=XLSX.write(currentWorkbook,{bookType:"xlsx",type:"array"});
 const blob=new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 const {error}=await db.storage.from(BUCKET).upload(currentFile.name,blob,{upsert:true,contentType:blob.type});
 if(error)toast(error.message,true);else{toast("Excel saved to cloud");$("editorStatus").textContent="Saved just now";await loadFiles()}
}
$("authForm").onsubmit=auth;
document.querySelectorAll(".auth-tabs button").forEach(b=>b.onclick=()=>{mode=b.dataset.auth;document.querySelectorAll(".auth-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("authBtn").innerHTML=mode==="login"?'Enter workspace <span>→</span>':'Create my cloud <span>→</span>'});
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("filesTitle").textContent=currentView==="overview"?"Recent files":currentView==="starred"?"Starred files":currentView==="recent"?"Recent files":"My files";render();$("sidebar").classList?.remove("show")});
$("search").oninput=render;$("refresh").onclick=loadFiles;$("uploadTop").onclick=triggerUpload;$("uploadSide").onclick=triggerUpload;$("heroUpload").onclick=triggerUpload;$("emptyUpload").onclick=triggerUpload;$("viewAll").onclick=()=>{currentView="files";document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view==="files"));render()};
$("fileInput").onchange=e=>uploadFiles([...e.target.files]);
$("logout").onclick=()=>db.auth.signOut();$("closeEditor").onclick=()=>{$("editor").classList.add("hidden");currentWorkbook=null};$("saveEdit").onclick=saveExcel;
$("downloadEdit").onclick=()=>{if(!currentWorkbook)return;const out=XLSX.write(currentWorkbook,{bookType:"xlsx",type:"array"});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([out]));a.download=currentFile?.name||"edited.xlsx";a.click()};
$("menu").onclick=()=>document.querySelector(".sidebar").classList.toggle("show");$("closeSide").onclick=()=>document.querySelector(".sidebar").classList.remove("show");
["dragenter","dragover"].forEach(e=>document.addEventListener(e,x=>{x.preventDefault();$("dropZone").classList.remove("hidden")}));
["dragleave","drop"].forEach(e=>document.addEventListener(e,x=>{x.preventDefault();if(e==="drop"){uploadFiles([...x.dataTransfer.files])}$("dropZone").classList.add("hidden")}));
init();