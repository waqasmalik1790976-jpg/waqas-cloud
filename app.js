const SUPABASE_URL="https://mmqawrbkirthcfxbjehp.supabase.co";
const SUPABASE_KEY="sb_publishable_IhVAmfcAeNI4-aiIn5fm2w_vY9tnfVD";
const BUCKET="waqas";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let files=[], currentExcel=null, workbook=null, currentSheet=null;

const $=id=>document.getElementById(id);
const toast=(m)=>{const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)};
const fmtSize=n=>{if(n<1024)return n+" B";if(n<1024**2)return (n/1024).toFixed(1)+" KB";if(n<1024**3)return (n/1024**2).toFixed(1)+" MB";return (n/1024**3).toFixed(2)+" GB"};
const isExcel=n=>/\.(xlsx|xls|csv)$/i.test(n||"");
const typeOf=n=>{const x=(n||"").split(".").pop().toUpperCase();return x||"FILE"};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function setView(v){document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$(v+"View").classList.remove("hidden");document.querySelectorAll(".nav").forEach(n=>n.classList.remove("active"));const b=document.querySelector(`.nav[data-view="${v}"]`);if(b)b.classList.add("active")}
document.querySelectorAll(".nav[data-view]").forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll(".linkBtn").forEach(b=>b.onclick=()=>setView("files"));

async function session(){
 const {data}=await db.auth.getSession();
 if(data.session){$("loginPanel").classList.add("hidden");$("avatar").textContent=(data.session.user.email||"W")[0].toUpperCase();await loadFiles()}
 else {$("loginPanel").classList.remove("hidden");document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"))}
}
$("loginBtn").onclick=async()=>{
 const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error){$("authMsg").textContent=error.message;return} $("authMsg").textContent="";await session()
};
$("signupBtn").onclick=async()=>{
 const {data,error}=await db.auth.signUp({email:$("email").value.trim(),password:$("password").value});
 $("authMsg").textContent=error?error.message:(data.session?"Account created.":"Account created. Check your email if confirmation is enabled.");
};
$("logoutBtn").onclick=async()=>{await db.auth.signOut();location.reload()};
$("uploadNav").onclick=$("heroUpload").onclick=$("filesUpload").onclick=()=> $("fileInput").click();
$("fileInput").onchange=async e=>{if(e.target.files.length)await uploadFiles([...e.target.files]);e.target.value=""};
$("refreshBtn").onclick=loadFiles;
$("search").oninput=renderFiles;

async function uploadFiles(list){
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 for(const f of list){
   const path=`${session.user.id}/${Date.now()}_${f.name}`;
   const {error}=await db.storage.from(BUCKET).upload(path,f,{upsert:false});
   if(error)toast("Upload failed: "+error.message); else toast(f.name+" uploaded");
 }
 await loadFiles();
}
async function loadFiles(){
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 const {data,error}=await db.storage.from(BUCKET).list(session.user.id,{limit:1000,sortBy:{column:"created_at",order:"desc"}});
 if(error){toast("Could not load files: "+error.message);return}
 files=(data||[]).filter(x=>x.name!=="").map(x=>({...x,path:`${session.user.id}/${x.name}`}));
 renderAll();
}
function renderAll(){renderStats();renderFiles();renderRecent();renderHistory();renderCharts()}
function renderStats(){
 const total=files.reduce((a,f)=>a+(f.metadata?.size||0),0), ex=files.filter(f=>isExcel(f.name)).length;
 $("kFiles").textContent=files.length;$("kStorage").textContent=fmtSize(total);$("kExcel").textContent=ex;$("kRecent").textContent=files.slice(0,7).length;
 $("storageText").textContent=fmtSize(total)+" used";const pct=Math.min(100,total/(5*1024**3)*100);$("storagePct").textContent=Math.round(pct)+"%";$("storageBar").style.width=pct+"%";
}
function renderFiles(){
 const q=$("search").value.toLowerCase();const arr=files.filter(f=>f.name.toLowerCase().includes(q));
 $("fileGrid").innerHTML=arr.map(f=>`<div class="fileItem"><div class="fileIcon">${isExcel(f.name)?"▤":"□"}</div><h4 title="${esc(f.name)}">${esc(f.name.replace(/^\\d+_/,""))}</h4><p>${typeOf(f.name)} · ${fmtSize(f.metadata?.size||0)}</p><div class="actions"><button class="open" onclick="openFile('${esc(f.path)}','${esc(f.name)}')">${isExcel(f.name)?"Open & edit":"Download"}</button><button onclick="downloadFile('${esc(f.path)}','${esc(f.name)}')">⇩</button><button onclick="deleteFile('${esc(f.path)}')">Delete</button></div></div>`).join("");
 $("emptyFiles").classList.toggle("hidden",arr.length>0);
}
function renderRecent(){
 const arr=files.slice(0,6);$("recentBody").innerHTML=arr.map(f=>row(f)).join("");$("emptyRecent").classList.toggle("hidden",arr.length>0);
}
function renderHistory(){$("historyBody").innerHTML=files.map(f=>row(f,true)).join("")}
function row(f,history=false){return `<tr><td><span class="fileName">${esc(f.name.replace(/^\\d+_/,""))}</span></td><td><span class="typePill">${typeOf(f.name)}</span></td><td>${fmtSize(f.metadata?.size||0)}</td><td>${f.created_at?new Date(f.created_at).toLocaleString():"—"}</td><td class="rowActions"><button onclick="downloadFile('${esc(f.path)}','${esc(f.name)}')">⇩</button> <button onclick="deleteFile('${esc(f.path)}')">×</button></td></tr>`}
async function downloadFile(path,name){
 const {data,error}=await db.storage.from(BUCKET).download(path);if(error){toast(error.message);return}
 const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=name.replace(/^\\d+_/,"");a.click();URL.revokeObjectURL(a.href);
}
async function deleteFile(path){if(!confirm("Delete this file?"))return;const {error}=await db.storage.from(BUCKET).remove([path]);if(error)toast(error.message);else{toast("File deleted");await loadFiles()}}
window.downloadFile=downloadFile;window.deleteFile=deleteFile;
window.openFile=async(path,name)=>{
 if(!isExcel(name)){await downloadFile(path,name);return}
 const {data,error}=await db.storage.from(BUCKET).download(path);if(error){toast(error.message);return}
 currentExcel={path,name};workbook=XLSX.read(await data.arrayBuffer(),{type:"array"});$("excelName").textContent=name.replace(/^\\d+_/,"");$("excelEmpty").classList.add("hidden");$("excelEditor").classList.remove("hidden");renderSheetTabs();showSheet(workbook.SheetNames[0]);setView("excel");
};
function renderSheetTabs(){$("sheetTabs").innerHTML=workbook.SheetNames.map((s,i)=>`<button class="sheetTab ${i===0?"active":""}" onclick="showSheet('${esc(s)}')">${esc(s)}</button>`).join("")}
window.showSheet=(name)=>{
 currentSheet=name;document.querySelectorAll(".sheetTab").forEach(b=>b.classList.toggle("active",b.textContent===name));
 const ws=workbook.Sheets[name], range=XLSX.utils.decode_range(ws["!ref"]||"A1:A1");let html="<thead><tr><th>#</th>";
 for(let c=range.s.c;c<=range.e.c;c++)html+=`<th>${XLSX.utils.encode_col(c)}</th>`;html+="</tr></thead><tbody>";
 for(let r=range.s.r;r<=range.e.r;r++){html+=`<tr><th>${r+1}</th>`;for(let c=range.s.c;c<=range.e.c;c++){const addr=XLSX.utils.encode_cell({r,c}),v=ws[addr]?.v??"";html+=`<td contenteditable="true" data-cell="${addr}">${esc(v)}</td>`}html+="</tr>"}html+="</tbody>";$("sheetTable").innerHTML=html;
 $("sheetTable").querySelectorAll("td").forEach(td=>{td.onclick=()=>{$("formulaBar").value=td.textContent};td.oninput=()=>{const ws=workbook.Sheets[currentSheet];ws[td.dataset.cell]={t:"s",v:td.textContent};$("formulaBar").value=td.textContent}});
};
$("formulaBar").onchange=()=>{const cell=document.activeElement?.dataset?.cell;if(cell){workbook.Sheets[currentSheet][cell]={t:"s",v:$("formulaBar").value};document.activeElement.textContent=$("formulaBar").value}};
$("saveExcel").onclick=async()=>{
 if(!currentExcel||!workbook)return;const out=XLSX.write(workbook,{bookType:"xlsx",type:"array"});const blob=new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 const {error}=await db.storage.from(BUCKET).upload(currentExcel.path,blob,{upsert:true,contentType:blob.type});if(error)toast("Save failed: "+error.message);else{toast("Excel saved to cloud");await loadFiles()}
};
$("downloadAll").onclick=()=>{if(files.length)downloadFile(files[0].path,files[0].name);else toast("No files to download")};
$("insightsBtn").onclick=()=>{const ex=files.filter(f=>isExcel(f.name)).length;toast(`Cloud summary: ${files.length} files, ${ex} Excel files`)}
function renderCharts(){
 const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], vals=days.map((_,i)=>files.filter(f=>{const d=new Date(f.created_at||Date.now());return d.getDay()===((i+1)%7)}).length);
 const max=Math.max(1,...vals);$("bars").innerHTML=vals.map(v=>`<div class="barGroup"><i class="bar a" style="height:${20+v/max*70}%"></i><i class="bar b" style="height:${15+v/max*45}%"></i><i class="bar c" style="height:${10+v/max*30}%"></i></div>`).join("");$("days").innerHTML=days.map(d=>`<span>${d}</span>`).join("");
 const counts={Excel:files.filter(f=>isExcel(f.name)).length,PDF:files.filter(f=>/\.pdf$/i.test(f.name)).length,Images:files.filter(f=>/\.(png|jpg|jpeg|webp)$/i.test(f.name)).length,Other:files.filter(f=>!isExcel(f.name)&&!/\.pdf$/i.test(f.name)&&!/\.(png|jpg|jpeg|webp)$/i.test(f.name)).length};
 const total=files.length||1;let a=counts.Excel/total*100,b=counts.PDF/total*100,c=counts.Images/total*100; $("donut").style.background=`conic-gradient(var(--purple) 0 ${a}%,var(--green) ${a}% ${a+b}%,var(--peach) ${a+b}% ${a+b+c}%,var(--lav) ${a+b+c}% 100%)`;$("donutTotal").textContent=files.length;
 $("legend").innerHTML=`<div><i class="dot" style="background:var(--purple)"></i>Excel ${counts.Excel}</div><div><i class="dot" style="background:var(--green)"></i>PDF ${counts.PDF}</div><div><i class="dot" style="background:var(--peach)"></i>Images ${counts.Images}</div><div><i class="dot" style="background:var(--lav)"></i>Other ${counts.Other}</div>`;
}
session();
