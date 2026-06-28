// ===== Firebase SDK =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// // ===== ここに自分のFirebase設定を貼り付け =====
// const firebaseConfig = {
//   apiKey: "AIzaSyBDVPo7SX0-ChoewUh5E1OF3XAuRunup6Y",
//   authDomain: "task-app-4efdd.firebaseapp.com",
//   databaseURL: "https://task-app-4efdd-default-rtdb.firebaseio.com",
//   projectId: "task-app-4efdd",
//   storageBucket: "task-app-4efdd.firebasestorage.app",
//   messagingSenderId: "1079941910666",
//   appId: "1:1079941910666:web:fa1f92a0bb06bc94ba5d73",
//   measurementId: "G-TWY5RC496F"
// };
// =====================
// Firebase設定（自分のものに書き換えてください）
// =====================
const firebaseConfig = {
  apiKey: "AIzaSyBDVPo7SX0-ChoewUh5E1OF3XAuRunup6Y",
  authDomain: "task-app-4efdd.firebaseapp.com",
  databaseURL: "https://task-app-4efdd-default-rtdb.firebaseio.com",
  projectId: "task-app-4efdd",
  storageBucket: "task-app-4efdd.firebasestorage.app",
  messagingSenderId: "1079941910666",
  appId: "1:1079941910666:web:fa1f92a0bb06bc94ba5d73",
  measurementId: "G-TWY5RC496F"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =====================
// 状態管理
// =====================
let tasks = [];
let energyLevel = 'low';
let editingTaskId = null;

const foodMenu = [
  "レトルトカレー＋レトルトご飯 🍛",
  "袋麺（醤油ラーメン）🍜",
  "ツナ缶＋レトルトご飯 🐟",
  "サバ缶＋レトルトご飯 🐟",
  "焼き鳥缶＋レトルトご飯 🍗",
  "おでん缶 🍢",
  "パスタ＋レトルトソース 🍝",
  "そうめん＋めんつゆ 🍝",
  "無菌パック豆腐＋ポン酢 🥢",
  "カップ麺 🍜"
];

// =====================
// 日付ユーティリティ
// =====================
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}

// =====================
// ヘッダー初期化
// =====================
function initHeader() {
  const d = new Date();
  const days = ['日','月','火','水','木','金','土'];
  document.getElementById('today-date').textContent =
    `${d.getMonth()+1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

// =====================
// タブ切り替え
// =====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// =====================
// エネルギーレベル
// =====================
document.querySelectorAll('.energy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.energy-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    energyLevel = btn.dataset.level;
    renderTasks();
  });
});

// =====================
// タスク機能
// =====================
function loadTasks() {
  db.ref('tasks').on('value', snap => {
    tasks = [];
    snap.forEach(child => {
      tasks.push({ id: child.key, ...child.val() });
    });
    renderTasks();
    loadTodayStatus();
  });
}

function getVisibleTasks() {
  if (energyLevel === 'low')  return tasks.slice(0, 3);
  if (energyLevel === 'mid')  return tasks.slice(0, 6);
  return tasks;
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const todayKey = getTodayKey();
  list.innerHTML = '';

  const visible = getVisibleTasks();

  visible.forEach(task => {
    const li = document.createElement('li');
    li.dataset.id = task.id;

    const checkbox = document.createElement('span');
    checkbox.textContent = task.done ? '✅' : '⬜';

    const name = document.createElement('span');
    name.textContent = task.name;

    const score = document.createElement('span');
    score.className = 'task-score';
    score.textContent = `${task.score ?? 0}pt`;

    if (task.done) li.classList.add('done');

    li.appendChild(checkbox);
    li.appendChild(name);
    li.appendChild(score);

    li.addEventListener('click', () => toggleTask(task.id, task.done, task.score ?? 0));
    list.appendChild(li);
  });

  updateScore();
}

function toggleTask(id, currentDone, score) {
  const todayKey = getTodayKey();
  const newDone = !currentDone;

  db.ref(`tasks/${id}`).update({ done: newDone });
  db.ref(`history/${todayKey}/${id}`).update({ done: newDone });

  if (newDone) launchConfetti();
}

function updateScore() {
  const todayKey = getTodayKey();
  db.ref(`history/${todayKey}`).once('value', snap => {
    let total = 0;
    snap.forEach(child => {
      const val = child.val();
      if (val.done) {
        const task = tasks.find(t => t.id === child.key);
        if (task) total += task.score ?? 0;
      }
    });
    document.getElementById('score-display').textContent = `${total} 点`;
  });
}

function loadTodayStatus() {
  const todayKey = getTodayKey();
  db.ref(`history/${todayKey}`).once('value', snap => {
    const statusMap = {};
    snap.forEach(child => { statusMap[child.key] = child.val().done; });
    tasks.forEach(task => {
      task.done = statusMap[task.id] ?? false;
    });
    renderTasks();
  });
}

// =====================
// コンフェッティ
// =====================
function launchConfetti() {
  const colors = ['#667eea','#764ba2','#f6d365','#fda085','#84fab0'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-10px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

// =====================
// カレンダーモーダル
// =====================
document.getElementById('calendar-btn').addEventListener('click', () => {
  document.getElementById('calendar-modal').classList.remove('hidden');
});
document.getElementById('calendar-close').addEventListener('click', () => {
  document.getElementById('calendar-modal').classList.add('hidden');
});

document.getElementById('date-picker').addEventListener('change', e => {
  const dateKey = e.target.value;
  const list = document.getElementById('past-task-list');
  list.innerHTML = '';

  db.ref(`history/${dateKey}`).once('value', snap => {
    if (!snap.exists()) {
      list.innerHTML = '<li>記録なし</li>';
      return;
    }
    snap.forEach(child => {
      const task = tasks.find(t => t.id === child.key);
      if (!task) return;
      const li = document.createElement('li');
      li.innerHTML = `<span>${task.name}</span><span>${child.val().done ? '✅' : '⬜'}</span>`;
      list.appendChild(li);
    });
  });
});

// =====================
// タスク編集モーダル
// =====================
document.getElementById('edit-btn').addEventListener('click', () => {
  renderEditList();
  document.getElementById('edit-modal').classList.remove('hidden');
});
document.getElementById('edit-close').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
  editingTaskId = null;
});

function renderEditList() {
  const list = document.getElementById('edit-task-list');
  list.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${task.name}（${task.score ?? 0}pt）</span>
      <button data-id="${task.id}">🗑️</button>
    `;
    li.querySelector('button').addEventListener('click', () => {
      db.ref(`tasks/${task.id}`).remove();
    });
    list.appendChild(li);
  });
}

document.getElementById('add-task-btn').addEventListener('click', () => {
  const name = document.getElementById('new-task-name').value.trim();
  const score = parseInt(document.getElementById('new-task-score').value) || 0;
  if (!name) return;
  db.ref('tasks').push({ name, score, done: false });
  document.getElementById('new-task-name').value = '';
  document.getElementById('new-task-score').value = '';
  setTimeout(renderEditList, 300);
});

// =====================
// お金機能
// =====================
function loadMoney() {
  const monthKey = getMonthKey();
  db.ref(`money/${monthKey}`).on('value', snap => {
    const data = snap.val() || {};
    const budget = data.budget || 0;
    const spent = data.spent || 0;
    const remaining = budget - spent;
    document.getElementById('remaining-display').textContent =
      `¥${remaining.toLocaleString()}`;

    document.getElementById('delivery-count').textContent = data.deliveryCount || 0;
    document.getElementById('savings-display').textContent =
      `¥${(data.savings || 0).toLocaleString()}`;
  });
}

document.getElementById('spend-btn').addEventListener('click', () => {
  const amount = parseInt(document.getElementById('spend-input').value);
  if (!amount || amount <= 0) return;
  const monthKey = getMonthKey();
  db.ref(`money/${monthKey}/spent`).once('value', snap => {
    const current = snap.val() || 0;
    db.ref(`money/${monthKey}/spent`).set(current + amount);
    document.getElementById('spend-input').value = '';
  });
});

document.getElementById('set-budget-btn').addEventListener('click', () => {
  document.getElementById('budget-modal').classList.remove('hidden');
});
document.getElementById('budget-close').addEventListener('click', () => {
  document.getElementById('budget-modal').classList.add('hidden');
});
document.getElementById('budget-save-btn').addEventListener('click', () => {
  const budget = parseInt(document.getElementById('budget-input').value);
  if (!budget || budget <= 0) return;
  const monthKey = getMonthKey();
  db.ref(`money/${monthKey}`).update({ budget, spent: 0 });
  document.getElementById('budget-modal').classList.add('hidden');
  document.getElementById('budget-input').value = '';
});

document.getElementById('delivery-add-btn').addEventListener('click', () => {
  const monthKey = getMonthKey();
  db.ref(`money/${monthKey}/deliveryCount`).once('value', snap => {
    db.ref(`money/${monthKey}/deliveryCount`).set((snap.val() || 0) + 1);
  });
});

document.getElementById('delivery-undo-btn').addEventListener('click', () => {
  const monthKey = getMonthKey();
  db.ref(`money/${monthKey}/deliveryCount`).once('value', snap => {
    const current = snap.val() || 0;
    if (current > 0) db.ref(`money/${monthKey}/deliveryCount`).set(current - 1);
  });
});

document.getElementById('add-saving-btn').addEventListener('click', () => {
  const monthKey = getMonthKey();
  db.ref(`money/${monthKey}/savings`).once('value', snap => {
    db.ref(`money/${monthKey}/savings`).set((snap.val() || 0) + 300);
  });
});

// =====================
// 食事機能
// =====================
document.getElementById('suggest-btn').addEventListener('click', () => {
  const suggestion = foodMenu[Math.floor(Math.random() * foodMenu.length)];
  document.getElementById('food-suggestion').textContent = suggestion;
});

function loadPantry() {
  db.ref('pantry').on('value', snap => {
    const list = document.getElementById('pantry-list');
    list.innerHTML = '';
    snap.forEach(child => {
      const item = child.val();
      const li = document.createElement('li');
      if (item.outOfStock) li.classList.add('out-of-stock');
      li.innerHTML = `
        <span>${item.outOfStock ? '❌' : '✅'}</span>
        <span>${item.name}</span>
        <button class="delete-pantry" data-id="${child.key}">🗑️</button>
      `;
      li.addEventListener('click', e => {
        if (e.target.classList.contains('delete-pantry')) return;
        db.ref(`pantry/${child.key}`).update({ outOfStock: !item.outOfStock });
      });
      li.querySelector('.delete-pantry').addEventListener('click', () => {
        db.ref(`pantry/${child.key}`).remove();
      });
      list.appendChild(li);
    });
  });
}

document.getElementById('pantry-add-btn').addEventListener('click', () => {
  const name = document.getElementById('pantry-input').value.trim();
  if (!name) return;
  db.ref('pantry').push({ name, outOfStock: false });
  document.getElementById('pantry-input').value = '';
});

// =====================
// 初期化
// =====================
initHeader();
loadTasks();
loadMoney();
loadPantry();
