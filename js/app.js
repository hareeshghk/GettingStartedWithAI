/* Task Manager application - accessible, responsive, and persistent to localStorage */
(function (){
  'use strict';

  const STORAGE_KEY = 'getting-started-task-manager-v1';

  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const toast = document.getElementById('toast');
  const summaryEl = document.getElementById('task-summary');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const clearAllBtn = document.getElementById('clear-all');

  // theme storage key
  const THEME_KEY = 'getting-started-theme';

  let tasks = [];
  // current filter: 'all' | 'active' | 'completed'
  let currentFilter = 'all';

  function saveTasks(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }catch(e){ console.warn('Could not save tasks', e); }
  }

  function loadTasks(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){
      console.warn('Could not load tasks', e);
      return [];
    }
  }

  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>\"']/g, function(s){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
    });
  }

  function taskToHTML(task){
    const text = escapeHtml(task.text);
    const checked = task.completed ? 'checked' : '';
    const completedClass = task.completed ? ' completed' : '';
    return `
      <li class="task-item${completedClass}" data-id="${task.id}">
        <div class="task-left">
          <input id="task-${task.id}" class="task-toggle" type="checkbox" ${checked} aria-label="Mark task '${text}' as completed">
          <label for="task-${task.id}" class="task-label"><span class="task-text">${text}</span></label>
        </div>
        <div class="task-actions">
          <button class="btn icon delete-btn" data-action="delete" aria-label="Delete task ${text}">&times;</button>
        </div>
      </li>
    `;
  }

  function render(){
    if(!taskList) return;

    // filter tasks based on currentFilter
    let shownTasks;
    if(currentFilter === 'active'){
      shownTasks = tasks.filter(t => !t.completed);
    }else if(currentFilter === 'completed'){
      shownTasks = tasks.filter(t => t.completed);
    }else{
      shownTasks = tasks.slice(); // all
    }

    // render
    taskList.innerHTML = shownTasks.map(taskToHTML).join('\n');

    updateSummary();
  }

  function updateSummary(){
    const total = tasks.length;
    const completed = tasks.filter(t=>t.completed).length;
    if(!summaryEl) return;
    if(total === 0){
      summaryEl.textContent = 'No tasks yet.';
    }else{
      summaryEl.textContent = `${total} task${total!==1?'s':''} — ${completed} completed`;
    }
  }

  // Theme helpers ----------------------------------------------------------
  function applyTheme(theme){
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');

    const btn = document.getElementById('theme-toggle');
    if(btn){
      const isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      // simple icon-only label; screen reader gets aria-label
      btn.textContent = isDark ? '☀️' : '🌙';
    }
  }

  function getInitialTheme(){
    try{
      const saved = localStorage.getItem(THEME_KEY);
      if(saved === 'dark' || saved === 'light') return saved;
    }catch(e){}
    if(window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches) return 'dark';
    return 'light';
  }
  // -----------------------------------------------------------------------

  function setFilter(filter){
    if(!['all','active','completed'].includes(filter)) filter = 'all';
    currentFilter = filter;

    // update filter buttons UI
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    render();
  }

  function showToast(message, time = 2200){
    if(!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.setAttribute('aria-hidden', 'false');
    if(toast._timeout) clearTimeout(toast._timeout);
    toast._timeout = setTimeout(()=>{
      toast.hidden = true;
      toast.setAttribute('aria-hidden', 'true');
    }, time);
  }

  function addTask(text){
    const value = (text || input.value || '').trim();
    if(!value){
      if(input){ input.focus(); }
      return showToast('Enter a task before adding.');
    }
    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      text: value,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(task);
    saveTasks();
    render();
    if(input){ input.value = ''; input.focus(); }
    showToast('Task added');
  }

  function toggleTask(id, completed){
    const idx = tasks.findIndex(t=>t.id===id);
    if(idx === -1) return;
    tasks[idx].completed = !!completed;
    saveTasks();
    render();
    showToast(tasks[idx].completed ? 'Task completed' : 'Task marked active');
  }

  function deleteTask(id){
    const idx = tasks.findIndex(t=>t.id===id);
    if(idx === -1) return;
    const removed = tasks.splice(idx,1)[0];
    saveTasks();
    render();
    showToast('Task deleted');
  }

  function clearCompleted(){
    const any = tasks.some(t=>t.completed);
    if(!any) return showToast('No completed tasks to clear');
    if(!confirm('Remove all completed tasks?')) return;
    tasks = tasks.filter(t=>!t.completed);
    saveTasks();
    render();
    showToast('Completed tasks removed');
  }

  function clearAll(){
    if(tasks.length === 0) return showToast('No tasks to clear');
    if(!confirm('Remove all tasks? This cannot be undone.')) return;
    tasks = [];
    saveTasks();
    render();
    showToast('All tasks cleared');
  }

  function onListClick(e){
    const btn = e.target.closest('button[data-action]');
    if(btn){
      const li = btn.closest('li');
      if(!li) return;
      const id = li.dataset.id;
      if(btn.dataset.action === 'delete'){
        deleteTask(id);
      }
      return;
    }
  }

  function onListChange(e){
    const target = e.target;
    if(target && target.classList && target.classList.contains('task-toggle')){
      const li = target.closest('li');
      if(!li) return;
      const id = li.dataset.id;
      toggleTask(id, target.checked);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    tasks = loadTasks();

    // initial theme
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    // default filter
    setFilter(currentFilter);

    if(form){
      form.addEventListener('submit', function(evt){
        evt.preventDefault();
        const raw = (input && typeof input.value === 'string') ? input.value.trim() : '';
        if(!raw){
          if(input){ input.value = ''; input.focus(); }
          return showToast('Enter a task before adding.');
        }
        addTask(raw);
      });
    }
    if(taskList){
      taskList.addEventListener('click', onListClick);
      taskList.addEventListener('change', onListChange);
    }
    if(clearCompletedBtn){ clearCompletedBtn.addEventListener('click', clearCompleted); }
    if(clearAllBtn){ clearAllBtn.addEventListener('click', clearAll); }

    // wire filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function(e){
        const f = e.currentTarget.dataset.filter;
        setFilter(f);
      });
    });

    // wire theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if(themeToggle){
      // set initial appearance for toggle
      themeToggle.setAttribute('aria-pressed', document.documentElement.classList.contains('dark') ? 'true' : 'false');
      themeToggle.setAttribute('aria-label', document.documentElement.classList.contains('dark') ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';

      themeToggle.addEventListener('click', function(){
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
        try{ localStorage.setItem(THEME_KEY, newTheme); }catch(e){}
        showToast(`Switched to ${newTheme} mode`);
      });
    }

    // keyboard shortcuts to focus the input (Ctrl/Cmd+K or /)
    document.addEventListener('keydown', function(e){
      if((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !e.ctrlKey && !e.metaKey)){
        e.preventDefault();
        if(input){ input.focus(); input.select(); }
      }
    });

    // set current year in footer
    const yearEl = document.getElementById('year');
    if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

    // render after wiring everything
    render();
  });

})();
