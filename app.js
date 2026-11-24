const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "studypilot-v1";
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let data = loadData();
let taskFilter = "all";
let editingTask = null;
let editingNote = null;
let timerSeconds = 25 * 60;
let timerInitial = timerSeconds;
let timerInterval = null;
let timerRunning = false;
let toastTimeout;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? {
      tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
      notes: Array.isArray(saved.notes) ? saved.notes : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      focusByDate: saved.focusByDate || {},
      theme: saved.theme || "dark"
    } : {tasks: [], notes: [], expenses: [], focusByDate: {}, theme: "dark"};
  } catch { return {tasks: [], notes: [], expenses: [], focusByDate: {}, theme: "dark"}; }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function money(value) { return new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(value); }
function prettyDate(date) {
  if (!date) return "No due date";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
function toast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  clearTimeout(toastTimeout); toastTimeout = setTimeout(()=>$("toast").classList.remove("show"),2200);
}
function showDialog(id) { $(id).showModal(); }
function closeDialog(id) { $(id).close(); }
function setView(name) {
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
  $(`${name}View`).classList.add("active-view");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("pageCrumb").textContent = ({overview:"Overview",tasks:"My tasks",planner:"Study planner",focus:"Focus room",notes:"Quick notes",expenses:"Expenses"})[name];
  renderAll();
}
function taskMarkup(task, showActions = false) {
  return `<div class="task-row ${task.done?"completed":""}">
    <input class="task-check" type="checkbox" data-toggle-task="${task.id}" ${task.done?"checked":""} aria-label="Complete task">
    <div class="task-info"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.subject||"Personal")} · ${prettyDate(task.date)}</small></div>
    <span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)}</span>
    ${showActions?`<div class="task-actions"><button class="small-action" data-edit-task="${task.id}" title="Edit">✎</button><button class="small-action" data-delete-task="${task.id}" title="Delete">×</button></div>`:""}
  </div>`;
}
function renderTasks() {
  const pending = data.tasks.filter(t=>!t.done), done = data.tasks.filter(t=>t.done);
  $("navTaskCount").textContent = pending.length;
  $("completedStat").textContent = done.length;
  $("pendingStat").textContent = pending.length;
  $("taskProgress").style.width = `${data.tasks.length ? done.length/data.tasks.length*100 : 0}%`;
  const todayTasks = data.tasks.filter(t=>!t.done && (!t.date || t.date===todayISO())).slice(0,5);
  $("todayTasks").innerHTML = todayTasks.length ? todayTasks.map(t=>taskMarkup(t)).join("") : `<div class="empty-state"><span>✦</span>Nothing urgent today. Enjoy the breathing room.</div>`;
  const filtered = data.tasks.filter(t=>taskFilter==="all" || (taskFilter==="active"?!t.done:t.done));
  $("allTasks").innerHTML = filtered.length ? filtered.map(t=>taskMarkup(t,true)).join("") : `<div class="empty-state"><span>✓</span>No tasks in this view. Add one when you're ready.</div>`;
  $("taskSummary").textContent = `${pending.length} pending · ${done.length} completed`;
  const dated = data.tasks.filter(t=>t.date && !t.done).sort((a,b)=>a.date.localeCompare(b.date));
  $("upcomingList").innerHTML = dated.slice(0,3).map(t=>`<div class="upcoming-item"><div class="date-square">${new Date(`${t.date}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.subject||"Personal")}</small></div></div>`).join("") || `<div class="empty-state">No upcoming deadlines yet.</div>`;
  $("plannerList").innerHTML = dated.length ? dated.map(t=>`<div class="planner-item"><div class="planner-date"><b>${new Date(`${t.date}T00:00:00`).getDate()}</b><small>${new Date(`${t.date}T00:00:00`).toLocaleDateString("en-IN",{month:"short"}).toUpperCase()}</small></div><div style="flex:1"><strong>${escapeHTML(t.title)}</strong><p>${escapeHTML(t.subject||"Personal")} · ${escapeHTML(t.priority)} priority</p></div><button class="small-action" data-edit-task="${t.id}">✎</button></div>`).join("") : `<div class="empty-state">Your planner is clear. Add a task with a due date to see it here.</div>`;
}
function renderNotes() {
  $("notesGrid").innerHTML = data.notes.length ? data.notes.map(n=>`<article class="note-card"><button class="note-delete" data-delete-note="${n.id}" title="Delete note">×</button><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body||"")}</p><small>Updated ${prettyDate(n.updated.slice(0,10))} · <button class="text-button" data-edit-note="${n.id}">Edit note</button></small></article>`).join("") : `<div class="panel empty-state" style="grid-column:1/-1"><span>▤</span>Your notes will live here. Capture that brilliant idea before it escapes.</div>`;
}
function renderExpenses() {
  const month = todayISO().slice(0,7);
  const current = data.expenses.filter(e=>e.date.startsWith(month));
  const total = current.reduce((sum,e)=>sum+Number(e.amount),0);
  $("spendingStat").textContent = money(total);
  $("expenseTotal").textContent = money(total);
  $("expenseCount").textContent = current.length;
  const sorted = [...data.expenses].sort((a,b)=>b.date.localeCompare(a.date));
  $("expenseList").innerHTML = sorted.length ? sorted.map(e=>`<div class="expense-item"><div class="expense-symbol">${({Food:"☕",Travel:"↗",Study:"▤",Shopping:"◇",Other:"₹"})[e.category]||"₹"}</div><div><strong>${escapeHTML(e.name)}</strong><small>${escapeHTML(e.category)} · ${prettyDate(e.date)}</small></div><span class="expense-amount">−${money(Number(e.amount))}</span><button class="small-action" data-delete-expense="${e.id}" title="Delete">×</button></div>`).join("") : `<div class="empty-state">No expenses yet. Add your first transaction.</div>`;
}
function renderAll() {
  renderTasks(); renderNotes(); renderExpenses();
  $("focusStat").textContent = data.focusByDate[todayISO()] || 0;
  $("previewTimer").textContent = formatTime(timerSeconds);
}
function openTask(task = null) {
  editingTask = task?.id || null;
  $("taskDialogTitle").textContent = task ? "Edit task" : "Create a task";
  $("taskTitle").value = task?.title || ""; $("taskSubject").value = task?.subject || "";
  $("taskDate").value = task?.date || ""; $("taskPriority").value = task?.priority || "Medium";
  showDialog("taskDialog"); $("taskTitle").focus();
}
function openNote(note = null) {
  editingNote = note?.id || null;
  $("noteDialogTitle").textContent = note ? "Edit note" : "New note";
  $("noteTitle").value = note?.title || ""; $("noteBody").value = note?.body || "";
  showDialog("noteDialog"); $("noteTitle").focus();
}
function formatTime(seconds) { const m=Math.floor(seconds/60),s=seconds%60; return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
function updateTimer() {
  $("bigTimer").textContent = formatTime(timerSeconds);
  $("previewTimer").textContent = formatTime(timerSeconds);
  $("timerCaption").textContent = timerRunning ? "YOU'RE IN THE ZONE" : "TIME TO FOCUS";
  $("timerStart").textContent = timerRunning ? "Pause session" : "Start session";
}
function stopTimer() { clearInterval(timerInterval); timerInterval=null; timerRunning=false; updateTimer(); }
function startTimer() {
  if(timerRunning){stopTimer();return;}
  timerRunning=true; updateTimer();
  timerInterval=setInterval(()=>{
    timerSeconds--; updateTimer();
    if(timerSeconds<=0){
      stopTimer();
      if(timerInitial===25*60){data.focusByDate[todayISO()]=(data.focusByDate[todayISO()]||0)+25;saveData();renderAll();toast("Focus session complete. Beautiful work! ✦");}
      else toast("Break complete. Ready for another round?");
      if("Notification" in window && Notification.permission==="granted") new Notification("StudyPilot",{body:"Your timer is complete."});
    }
  },1000);
}
function chooseTimer(minutes) {
  stopTimer(); timerSeconds=minutes*60; timerInitial=timerSeconds;
  document.querySelectorAll(".mode-button").forEach(b=>b.classList.toggle("selected",Number(b.dataset.minutes)===minutes));
  updateTimer();
}
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.go)));
$("quickAdd").addEventListener("click",()=>openTask());
$("addTaskBtn").addEventListener("click",()=>openTask());
$("addNoteBtn").addEventListener("click",()=>openNote());
$("addExpenseBtn").addEventListener("click",()=>{$("expenseDate").value=todayISO();showDialog("expenseDialog");});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
document.querySelectorAll(".filter-tab").forEach(b=>b.addEventListener("click",()=>{taskFilter=b.dataset.filter;document.querySelectorAll(".filter-tab").forEach(x=>x.classList.toggle("selected",x===b));renderTasks();}));
document.addEventListener("click",e=>{
  const toggle=e.target.closest("[data-toggle-task]");
  if(toggle){const t=data.tasks.find(x=>x.id===toggle.dataset.toggleTask);if(t){t.done=toggle.checked;saveData();renderAll();toast(t.done?"Task completed!":"Task moved back to pending.");}}
  const edit=e.target.closest("[data-edit-task]");
  if(edit){const t=data.tasks.find(x=>x.id===edit.dataset.editTask);if(t)openTask(t);}
  const del=e.target.closest("[data-delete-task]");
  if(del){data.tasks=data.tasks.filter(x=>x.id!==del.dataset.deleteTask);saveData();renderAll();toast("Task deleted.");}
  const noteEdit=e.target.closest("[data-edit-note]");
  if(noteEdit){const n=data.notes.find(x=>x.id===noteEdit.dataset.editNote);if(n)openNote(n);}
  const noteDel=e.target.closest("[data-delete-note]");
  if(noteDel){data.notes=data.notes.filter(x=>x.id!==noteDel.dataset.deleteNote);saveData();renderNotes();toast("Note deleted.");}
  const expenseDel=e.target.closest("[data-delete-expense]");
  if(expenseDel){data.expenses=data.expenses.filter(x=>x.id!==expenseDel.dataset.deleteExpense);saveData();renderExpenses();toast("Expense deleted.");}
});
$("taskForm").addEventListener("submit",e=>{
  e.preventDefault();const item={id:editingTask||uid(),title:$("taskTitle").value.trim(),subject:$("taskSubject").value.trim(),date:$("taskDate").value,priority:$("taskPriority").value,done:editingTask?(data.tasks.find(t=>t.id===editingTask)?.done||false):false};
  if(!item.title)return;
  if(editingTask)data.tasks=data.tasks.map(t=>t.id===editingTask?item:t);else data.tasks.unshift(item);
  saveData();closeDialog("taskDialog");renderAll();toast(editingTask?"Task updated.":"Task added. Let's go!");
});
$("noteForm").addEventListener("submit",e=>{
  e.preventDefault();const item={id:editingNote||uid(),title:$("noteTitle").value.trim(),body:$("noteBody").value.trim(),updated:new Date().toISOString()};
  if(editingNote)data.notes=data.notes.map(n=>n.id===editingNote?item:n);else data.notes.unshift(item);
  saveData();closeDialog("noteDialog");renderNotes();toast("Note saved.");
});
$("expenseForm").addEventListener("submit",e=>{
  e.preventDefault();const amount=Number($("expenseAmount").value);if(!Number.isFinite(amount)||amount<=0)return;
  data.expenses.unshift({id:uid(),name:$("expenseName").value.trim(),amount,date:$("expenseDate").value,category:$("expenseCategory").value});
  saveData();closeDialog("expenseDialog");renderExpenses();toast("Expense saved.");
});
document.querySelectorAll(".mode-button").forEach(b=>b.addEventListener("click",()=>chooseTimer(Number(b.dataset.minutes))));
$("timerStart").addEventListener("click",startTimer);
$("timerReset").addEventListener("click",()=>{stopTimer();timerSeconds=timerInitial;updateTimer();});
$("themeToggle").addEventListener("click",()=>{data.theme=data.theme==="dark"?"light":"dark";document.body.classList.toggle("light",data.theme==="light");saveData();});
if(data.theme==="light")document.body.classList.add("light");
const now=new Date();
$("todayLabel").textContent=now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
$("longDate").textContent=now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
$("expenseDate").value=todayISO();
renderAll();updateTimer();
