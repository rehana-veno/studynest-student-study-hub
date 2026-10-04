const KEYS = {
  tasks: "studynest_tasks_v2",
  exams: "studynest_exams_v1",
  classes: "studynest_classes_v1",
  notes: "studynest_notes_v1",
  goal: "studynest_goal_v1",
  theme: "studynest_theme_v1",
  sessions: "studynest_sessions_v1"
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const demoTasks = [
  { id: uid(), name: "Finish biology notes", subject: "Biology", due: addDays(1), type: "Homework", priority: "High", completed: false },
  { id: uid(), name: "Math practice set", subject: "Mathematics", due: addDays(2), type: "Homework", priority: "Medium", completed: false },
  { id: uid(), name: "English presentation slides", subject: "English", due: addDays(4), type: "Assignment", priority: "Medium", completed: true },
  { id: uid(), name: "History revision", subject: "History", due: addDays(6), type: "Test", priority: "Low", completed: false },
  { id: uid(), name: "Science project outline", subject: "Science", due: addDays(8), type: "Project", priority: "High", completed: false }
];
const demoExams = [
  { id: uid(), name: "Biology Midterm", subject: "Biology", date: addDays(8), notes: "Cells, genetics, ecology" },
  { id: uid(), name: "Mathematics Test", subject: "Mathematics", date: addDays(12), notes: "Algebra and functions" }
];
const demoClasses = [
  { id: uid(), day: "Monday", time: "09:00 AM", subject: "Mathematics", room: "204" },
  { id: uid(), day: "Monday", time: "10:00 AM", subject: "Biology", room: "Lab 2" },
  { id: uid(), day: "Tuesday", time: "11:00 AM", subject: "English", room: "105" },
  { id: uid(), day: "Wednesday", time: "09:00 AM", subject: "History", room: "201" },
  { id: uid(), day: "Thursday", time: "10:00 AM", subject: "Science", room: "Lab 1" }
];
const demoNotes = [
  { id: uid(), title: "Photosynthesis", subject: "Biology", body: "Plants use light energy to convert carbon dioxide and water into glucose and oxygen." },
  { id: uid(), title: "Algebra basics", subject: "Mathematics", body: "Keep both sides of an equation balanced while isolating the unknown." }
];

let tasks = loadArray(KEYS.tasks, demoTasks);
let exams = loadArray(KEYS.exams, demoExams);
let classes = loadArray(KEYS.classes, demoClasses);
let notes = loadArray(KEYS.notes, demoNotes);
let goal = Number(localStorage.getItem(KEYS.goal) || 3);
let focusSessions = Number(localStorage.getItem(KEYS.sessions) || 0);
let timerSeconds = 25 * 60;
let timerInterval = null;

const $ = id => document.getElementById(id);
const els = {
  pageTitle: $("pageTitle"), todayText: $("todayText"),
  statTasks: $("statTasks"), statDueSoon: $("statDueSoon"), statCompleted: $("statCompleted"), statProgress: $("statProgress"), statTasksSub: $("statTasksSub"), statCompletedSub: $("statCompletedSub"),
  dashboardTaskList: $("dashboardTaskList"), allTaskList: $("allTaskList"), subjectFilter: $("subjectFilter"), searchInput: $("searchInput"), statusFilter: $("statusFilter"), priorityFilter: $("priorityFilter"), typeFilter: $("typeFilter"),
  examList: $("examList"), timetableBody: $("timetableBody"), notesGrid: $("notesGrid"), noteSearch: $("noteSearch"), planList: $("planList"), blockMinutes: $("blockMinutes"),
  progressCircle: $("progressCircle"), progressCircleText: $("progressCircleText"), progressHeadline: $("progressHeadline"), progressMessage: $("progressMessage"), progressCompleted: $("progressCompleted"), progressPending: $("progressPending"), progressExams: $("progressExams"), progressNotes: $("progressNotes"), progressSessions: $("progressSessions"), subjectProgressList: $("subjectProgressList"),
  goalNumber: $("goalNumber"), goalFill: $("goalFill"), goalMessage: $("goalMessage"), tipText: $("tipText"), nextExamTitle: $("nextExamTitle"), nextExamMeta: $("nextExamMeta"), notesCount: $("notesCount"),
  toast: $("toast"), timerDisplay: $("timerDisplay"), timerMode: $("timerMode"), timerSessions: $("timerSessions")
};

function uid(){ return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function addDays(days){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function loadArray(key, fallback){ try{ const raw=localStorage.getItem(key); if(raw) return JSON.parse(raw); }catch(e){} localStorage.setItem(key, JSON.stringify(fallback)); return structuredClone(fallback); }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function formatDate(s){ return new Date(`${s}T00:00:00`).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); }
function daysUntil(s){ const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(`${s}T00:00:00`)-t)/86400000); }
function countdown(s){ const d=daysUntil(s); if(d<0) return "Past"; if(d===0) return "Today"; if(d===1) return "Tomorrow"; return `${d} days left`; }
function dateLabel(s){ const d=daysUntil(s); if(d<0)return "Overdue"; if(d===0)return "Today"; if(d===1)return "Tomorrow"; return `In ${d} days`; }
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function emptyState(msg){return `<div class="empty">${escapeHtml(msg)}</div>`;}
function getProgress(){return tasks.length?Math.round(tasks.filter(t=>t.completed).length/tasks.length*100):0;}

function taskCard(t){
  return `<div class="task-item"><button class="task-check ${t.completed?'done':''}" data-action="toggle-task" data-id="${t.id}" aria-label="Toggle completion">${t.completed?'✓':''}</button><div class="task-main"><p class="task-title ${t.completed?'done-text':''}">${escapeHtml(t.name)}</p><p class="task-meta">${escapeHtml(t.subject)} • ${escapeHtml(t.type)} • ${formatDate(t.due)} (${dateLabel(t.due)})</p></div><div class="task-badges"><span class="badge ${t.priority.toLowerCase()}">${escapeHtml(t.priority)}</span><button class="delete-btn" data-action="delete-task" data-id="${t.id}" aria-label="Delete task">🗑️</button></div></div>`;
}
function updateStats(){
  const completed=tasks.filter(t=>t.completed).length, pending=tasks.length-completed, dueSoon=tasks.filter(t=>!t.completed&&daysUntil(t.due)>=0&&daysUntil(t.due)<=3).length, progress=getProgress();
  els.statTasks.textContent=tasks.length; els.statDueSoon.textContent=dueSoon; els.statCompleted.textContent=completed; els.statProgress.textContent=`${progress}%`; els.statTasksSub.textContent=pending?`${pending} still pending`:`All tasks complete`;
  els.statCompletedSub.textContent=`${progress}% of tasks`; els.progressCircleText.textContent=`${progress}%`; els.progressCircle.style.background=`conic-gradient(var(--accent) ${progress*3.6}deg,#eceff5 0deg)`;
  els.progressHeadline.textContent=progress===100?"All caught up!":progress>=70?"Excellent momentum":progress>=35?"You’re building momentum":"Ready to start";
  els.progressMessage.textContent=progress===100?"Everything is complete. Nice work!":"Complete more tasks to grow your progress.";
}
function renderDashboard(){
  const shown=[...tasks].filter(t=>!t.completed).sort((a,b)=>(daysUntil(a.due)-daysUntil(b.due))||priorityWeight(a.priority)-priorityWeight(b.priority)).slice(0,6);
  els.dashboardTaskList.innerHTML=shown.length?shown.map(taskCard).join(""):emptyState("No pending tasks. Enjoy the win!");
  const completedToday=tasks.filter(t=>t.completed).length; // simple project-wide goal for demo clarity
  const goalValue=Math.min(completedToday,goal); els.goalNumber.textContent=`${goalValue} / ${goal}`; els.goalFill.style.width=`${Math.min(100,completedToday/goal*100)}%`; els.goalMessage.textContent=completedToday>=goal?"Daily target reached. Great work!":`${goal-completedToday} more task${goal-completedToday===1?'':'s'} to reach today’s target.`;
  const next=[...exams].filter(e=>daysUntil(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  els.nextExamTitle.textContent=next?next.name:"No exams added"; els.nextExamMeta.textContent=next?`${next.subject} • ${formatDate(next.date)} • ${countdown(next.date)}`:"Add an exam to see its countdown.";
  els.notesCount.textContent=`${notes.length} saved note${notes.length===1?'':'s'}`;
  updateTip();
}
function priorityWeight(p){return {High:0,Medium:1,Low:2}[p]??3;}
function updateTip(){ const next=[...tasks].filter(t=>!t.completed).sort((a,b)=>priorityWeight(a.priority)-priorityWeight(b.priority)||daysUntil(a.due)-daysUntil(b.due))[0]; els.tipText.textContent=next?`Start with “${next.name}”. It is ${dateLabel(next.due).toLowerCase()} and marked ${next.priority.toLowerCase()} priority.`:"You have completed all your tasks. Take a well-earned break!"; }
function renderSubjects(){ const current=els.subjectFilter.value; const subs=[...new Set(tasks.map(t=>t.subject).filter(Boolean))].sort(); els.subjectFilter.innerHTML=`<option value="all">All subjects</option>`+subs.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(""); els.subjectFilter.value=subs.includes(current)?current:"all"; }
function renderAllTasks(){ const q=els.searchInput.value.trim().toLowerCase(),subject=els.subjectFilter.value,status=els.statusFilter.value,priority=els.priorityFilter.value,type=els.typeFilter.value; const filtered=tasks.filter(t=>!q||`${t.name} ${t.subject} ${t.type}`.toLowerCase().includes(q)).filter(t=>subject==='all'||t.subject===subject).filter(t=>status==='all'||(status==='completed'?t.completed:!t.completed)).filter(t=>priority==='all'||t.priority===priority).filter(t=>type==='all'||t.type===type).sort((a,b)=>a.due.localeCompare(b.due)); els.allTaskList.innerHTML=filtered.length?filtered.map(taskCard).join(""):emptyState("No matching tasks found."); }
function renderExams(){ const list=[...exams].sort((a,b)=>a.date.localeCompare(b.date)); els.examList.innerHTML=list.length?list.map(e=>`<article class="exam-card"><div class="exam-top"><div><h4>${escapeHtml(e.name)}</h4><div class="exam-meta">${escapeHtml(e.subject)} • ${formatDate(e.date)}</div></div><span class="countdown">${countdown(e.date)}</span></div>${e.notes?`<div class="exam-note">${escapeHtml(e.notes)}</div>`:''}<div class="exam-actions"><button class="danger-link" data-action="delete-exam" data-id="${e.id}">Delete</button></div></article>`).join(""):emptyState("No exams yet. Add your next exam to start planning."); }
function renderClasses(){ const list=[...classes].sort((a,b)=>DAYS.indexOf(a.day)-DAYS.indexOf(b.day)||a.time.localeCompare(b.time)); els.timetableBody.innerHTML=list.length?list.map(c=>`<tr><td><span class="day-pill">${escapeHtml(c.day)}</span></td><td>${escapeHtml(c.time)}</td><td><strong>${escapeHtml(c.subject)}</strong></td><td>${escapeHtml(c.room||'—')}</td><td><button class="danger-link" data-action="delete-class" data-id="${c.id}">Delete</button></td></tr>`).join(""): `<tr><td colspan="5">${emptyState("No classes added yet.")}</td></tr>`; }
function renderNotes(){ const q=els.noteSearch.value.trim().toLowerCase(); const list=notes.filter(n=>!q||`${n.title} ${n.subject} ${n.body}`.toLowerCase().includes(q)).sort((a,b)=>a.title.localeCompare(b.title)); els.notesGrid.innerHTML=list.length?list.map(n=>`<article class="note-card"><div><span class="note-subject">${escapeHtml(n.subject)}</span><h4>${escapeHtml(n.title)}</h4></div><p class="note-body">${escapeHtml(n.body)}</p><div class="note-actions"><button class="note-delete" data-action="delete-note" data-id="${n.id}">Delete</button></div></article>`).join(""):emptyState("No notes found. Save a quick revision note to build your library."); }
function renderProgress(){ const completed=tasks.filter(t=>t.completed).length; els.progressCompleted.textContent=completed; els.progressPending.textContent=tasks.length-completed; els.progressExams.textContent=exams.length; els.progressNotes.textContent=notes.length; els.progressSessions.textContent=focusSessions; const subs={}; tasks.forEach(t=>{subs[t.subject]??={done:0,total:0};subs[t.subject].total++;if(t.completed)subs[t.subject].done++;}); const entries=Object.entries(subs).sort((a,b)=>(b[1].total-b[1].done)-(a[1].total-a[1].done)); els.subjectProgressList.innerHTML=entries.length?entries.map(([s,v])=>{const pct=Math.round(v.done/v.total*100);return `<div class="subject-row"><span>${escapeHtml(s)}</span><div class="subject-bar"><span style="width:${pct}%"></span></div><span class="subject-percent">${pct}%</span></div>`}).join(""):emptyState("Add tasks to see subject progress."); }
function refresh(){ updateStats(); renderSubjects(); renderDashboard(); renderAllTasks(); renderExams(); renderClasses(); renderNotes(); renderProgress(); }

function openModal(id){const m=$(id);m.classList.add('show');m.setAttribute('aria-hidden','false');const first=m.querySelector('input,textarea,select');if(first)first.focus();}
function closeModal(id){const m=$(id);m.classList.remove('show');m.setAttribute('aria-hidden','true');const form=m.querySelector('form');if(form)form.reset();if(id==='taskModal')$("taskDate").value=addDays(1);if(id==='examModal')$("examDate").value=addDays(7);}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>els.toast.classList.remove('show'),1900);}

function goTo(section){ const btn=document.querySelector(`.nav-btn[data-section="${section}"]`); if(btn)btn.click(); }
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active-section'));$(btn.dataset.section).classList.add('active-section');els.pageTitle.textContent=btn.innerText.replace(/^[^A-Za-z]+/,'').trim();window.scrollTo({top:0,behavior:'smooth'});}));
document.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go)goTo(go.dataset.go);const action=e.target.closest('[data-action]');if(!action)return;const id=action.dataset.id;if(action.dataset.action==='toggle-task'){tasks=tasks.map(t=>t.id===id?{...t,completed:!t.completed}:t);save(KEYS.tasks,tasks);refresh();showToast('Task updated');}if(action.dataset.action==='delete-task'){tasks=tasks.filter(t=>t.id!==id);save(KEYS.tasks,tasks);refresh();showToast('Task deleted');}if(action.dataset.action==='delete-exam'){exams=exams.filter(x=>x.id!==id);save(KEYS.exams,exams);refresh();showToast('Exam deleted');}if(action.dataset.action==='delete-class'){classes=classes.filter(x=>x.id!==id);save(KEYS.classes,classes);refresh();showToast('Class deleted');}if(action.dataset.action==='delete-note'){notes=notes.filter(x=>x.id!==id);save(KEYS.notes,notes);refresh();showToast('Note deleted');}});

document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));

autoSetDates();
$('openTaskModalBtn').addEventListener('click',()=>openModal('taskModal'));$('tasksAddBtn').addEventListener('click',()=>openModal('taskModal'));$('openExamModalBtn').addEventListener('click',()=>openModal('examModal'));$('openClassModalBtn').addEventListener('click',()=>openModal('classModal'));$('openNoteModalBtn').addEventListener('click',()=>openModal('noteModal'));$('editGoalBtn').addEventListener('click',()=>{ $('goalInput').value=goal;openModal('goalModal'); });$('focusBtn').addEventListener('click',()=>{goTo('planner');$('timerDisplay').scrollIntoView({behavior:'smooth',block:'center'});});

$('taskForm').addEventListener('submit',e=>{e.preventDefault();const t={id:uid(),name:$('taskName').value.trim(),subject:$('taskSubject').value.trim(),due:$('taskDate').value,type:$('taskType').value,priority:$('taskPriority').value,completed:false};if(!t.name||!t.subject||!t.due)return;tasks.push(t);save(KEYS.tasks,tasks);refresh();closeModal('taskModal');showToast('Task added successfully');});
$('examForm').addEventListener('submit',e=>{e.preventDefault();const x={id:uid(),name:$('examName').value.trim(),subject:$('examSubject').value.trim(),date:$('examDate').value,notes:$('examNotes').value.trim()};if(!x.name||!x.subject||!x.date)return;exams.push(x);save(KEYS.exams,exams);refresh();closeModal('examModal');showToast('Exam added successfully');});
$('classForm').addEventListener('submit',e=>{e.preventDefault();const x={id:uid(),day:$('classDay').value,time:$('classTime').value.trim(),subject:$('classSubject').value.trim(),room:$('classRoom').value.trim()};if(!x.time||!x.subject)return;classes.push(x);save(KEYS.classes,classes);refresh();closeModal('classModal');showToast('Class added successfully');});
$('noteForm').addEventListener('submit',e=>{e.preventDefault();const x={id:uid(),title:$('noteTitle').value.trim(),subject:$('noteSubject').value.trim(),body:$('noteBody').value.trim()};if(!x.title||!x.subject||!x.body)return;notes.push(x);save(KEYS.notes,notes);refresh();closeModal('noteModal');showToast('Note saved');});
$('goalForm').addEventListener('submit',e=>{e.preventDefault();goal=Math.max(1,Math.min(20,Number($('goalInput').value)||3));localStorage.setItem(KEYS.goal,String(goal));refresh();closeModal('goalModal');showToast('Daily goal updated');});

[els.searchInput,els.subjectFilter,els.statusFilter,els.priorityFilter,els.typeFilter].forEach(el=>el.addEventListener('input',renderAllTasks));[els.subjectFilter,els.statusFilter,els.priorityFilter,els.typeFilter].forEach(el=>el.addEventListener('change',renderAllTasks));els.noteSearch.addEventListener('input',renderNotes);

$('generatePlanBtn').addEventListener('click',generatePlan);
function generatePlan(){const mins=Number(els.blockMinutes.value);const pending=[...tasks].filter(t=>!t.completed).sort((a,b)=>(priorityWeight(a.priority)-priorityWeight(b.priority))||(daysUntil(a.due)-daysUntil(b.due)));if(!pending.length){els.planList.innerHTML=emptyState('No pending tasks. Your study plan is clear!');return;}els.planList.innerHTML=pending.slice(0,8).map((t,i)=>`<div class="plan-item"><div class="plan-index">${i+1}</div><div class="plan-main"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.subject)} • ${t.priority} priority • ${dateLabel(t.due).toLowerCase()}</span></div><span class="plan-time">${mins} min</span></div>`).join('');showToast('Study plan generated');}

function updateTimer(){const m=Math.floor(timerSeconds/60).toString().padStart(2,'0'),s=(timerSeconds%60).toString().padStart(2,'0');els.timerDisplay.textContent=`${m}:${s}`;}
$('timerStart').addEventListener('click',()=>{if(timerInterval)return;els.timerMode.textContent='Focus session';timerInterval=setInterval(()=>{timerSeconds--;updateTimer();if(timerSeconds<=0){clearInterval(timerInterval);timerInterval=null;focusSessions++;localStorage.setItem(KEYS.sessions,String(focusSessions));els.timerMode.textContent='Session complete 🎉';els.timerSessions.textContent=`${focusSessions} focus session${focusSessions===1?'':'s'} completed today`;refresh();showToast('Focus session complete');timerSeconds=25*60;updateTimer();}},1000);showToast('Focus timer started');});
$('timerPause').addEventListener('click',()=>{clearInterval(timerInterval);timerInterval=null;showToast('Timer paused');});$('timerReset').addEventListener('click',()=>{clearInterval(timerInterval);timerInterval=null;timerSeconds=25*60;els.timerMode.textContent='Focus session';updateTimer();});

$('themeToggle').addEventListener('change',()=>{document.body.classList.toggle('dark',$('themeToggle').checked);localStorage.setItem(KEYS.theme,$('themeToggle').checked?'dark':'light');});
function autoSetDates(){els.todayText.textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});$('taskDate').value=addDays(1);$('examDate').value=addDays(7);}
if(localStorage.getItem(KEYS.theme)==='dark'){document.body.classList.add('dark');$('themeToggle').checked=true;}
els.timerSessions.textContent=`${focusSessions} focus session${focusSessions===1?'':'s'} completed today`;updateTimer();refresh();generatePlan();
