const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_MEALS = {
  breakfast: [
    'French Toast', 'Scrambled Eggs & Toast', 'Avocado Toast', 'Pancakes',
    'Yogurt Parfait', 'Oatmeal with Berries', 'Bagel with Cream Cheese',
    'Breakfast Burrito', 'Veggie Omelette', 'Granola & Milk',
    'Waffles with Syrup', 'Hard-Boiled Eggs & Fruit', 'Smoothie Bowl',
    'Blueberry Muffins', 'Cereal & Milk',
  ],
  lunch: [
    'PB&J Sandwich', 'Grilled Cheese', 'Caesar Salad', 'Turkey Wrap',
    'Tomato Soup & Grilled Cheese', 'BLT Sandwich', 'Chicken Quesadilla',
    'Tuna Salad Sandwich', 'Veggie Burrito Bowl', 'Caprese Sandwich',
    'Minestrone Soup', 'Ham & Cheese Panini', 'Cobb Salad',
    'Leftover Pasta', 'Greek Salad with Pita',
  ],
  dinner: [
    'Spaghetti & Meatballs', 'Hamburgers', 'Tacos', 'Grilled Chicken & Veggies',
    'Stir-Fry with Rice', 'Salmon with Roasted Potatoes', 'Pizza Night',
    'Beef Stew', 'Chicken Alfredo', 'BBQ Ribs', 'Veggie Chili',
    'Shrimp Fajitas', 'Pork Chops & Mashed Potatoes', 'Lasagna',
    'Butter Chicken & Naan', 'Pulled Pork Sliders',
  ],
};

const plan = {};
const openState = {};
DAYS.forEach(d => openState[d] = true);

let pendingBan = null;

/* ── Cookies ── */
function getCookie(name) {
  const match = document.cookie.split('; ').find(r => r.startsWith(name + '='));
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match.split('=')[1])); } catch { return null; }
}

function setCookie(name, data) {
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(data))}; expires=${exp.toUTCString()}; path=/`;
}

const getCustom = () => getCookie('customMeals') || { breakfast: [], lunch: [], dinner: [] };
const getSaved  = () => getCookie('savedWeeks')  || [];
const getBanned = () => getCookie('bannedMeals') || [];

/* ── Meal pool ── */
function getPool(type) {
  const banned = getBanned();
  const all = [...DEFAULT_MEALS[type], ...(getCustom()[type] || [])];
  const available = all.filter(m => !banned.includes(m));
  return available.length ? available : all; // fallback if everything is banned
}

function pick(type) {
  const pool = getPool(type);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── Plan ── */
function randomizeAll() {
  DAYS.forEach(day => {
    plan[day] = { breakfast: pick('breakfast'), lunch: pick('lunch'), dinner: pick('dinner') };
  });
  renderWeek();
}

function randomizeMeal(day, type) {
  plan[day][type] = pick(type);
  renderWeek();
}

/* ── Accordion ── */
// Toggle the class on the live element so the CSS transition can run
// (re-rendering the whole week would recreate the node in its final state, skipping the animation).
function applyOpenState(day) {
  const card = document.querySelector(`.day-card[data-day="${day}"]`);
  if (card) card.classList.toggle('open', openState[day]);
}

function updateToggleAllLabel() {
  const allOpen = DAYS.every(d => openState[d]);
  document.getElementById('toggleAllBtn').textContent = allOpen ? 'Collapse All' : 'Expand All';
}

function toggleDay(day) {
  openState[day] = !openState[day];
  applyOpenState(day);
  updateToggleAllLabel();
}

function toggleAllDays() {
  const allOpen = DAYS.every(d => openState[d]);
  DAYS.forEach(d => { openState[d] = !allOpen; applyOpenState(d); });
  updateToggleAllLabel();
}

/* ── Render week ── */
function renderWeek() {
  updateToggleAllLabel();
  document.getElementById('week').innerHTML = DAYS.map(day => `
    <div class="day-card ${openState[day] ? 'open' : ''}" data-day="${day}">
      <div class="day-header" onclick="toggleDay('${day}')">
        <span>${day}</span>
        <i class="chevron">▼</i>
      </div>
      <div class="meals-wrap">
        <div class="meals">
          ${mealRow(day, 'breakfast', 'b')}
          ${mealRow(day, 'lunch',     'l')}
          ${mealRow(day, 'dinner',    'd')}
        </div>
      </div>
    </div>
  `).join('');
}

function esc(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function mealRow(day, type, cls) {
  const meal = plan[day][type];
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return `
    <div class="meal-row">
      <span class="meal-label ${cls}">${label}</span>
      <span class="meal-text">${meal}</span>
      <div class="meal-actions">
        <button class="btn-roll" title="Randomize" onclick="randomizeMeal('${day}','${type}')">🎲</button>
        <div class="meal-menu">
          <button class="btn-menu" title="Options" aria-haspopup="true" onclick="toggleMealMenu(event, this)">⋮</button>
          <div class="menu-dropdown">
            <button onclick="editMeal('${day}','${type}')">✏️ Edit</button>
            <button class="menu-danger" onclick="promptBan('${esc(meal)}')">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ── Meal row menu ── */
function toggleMealMenu(event, btn) {
  event.stopPropagation();
  const menu = btn.parentElement;
  const isOpen = menu.classList.contains('open');
  closeAllMealMenus();
  if (!isOpen) menu.classList.add('open');
}

function closeAllMealMenus() {
  document.querySelectorAll('.meal-menu.open').forEach(m => m.classList.remove('open'));
}

function editMeal(day, type) {
  const next = prompt('Edit meal:', plan[day][type]);
  if (next === null) return;
  const val = next.trim();
  if (val) plan[day][type] = val;
  renderWeek();
}

/* ── Ban ── */
function promptBan(meal) {
  pendingBan = meal;
  document.getElementById('modalMsg').textContent =
    `"${meal}" will be removed from all suggestion lists. You can restore it from the Banned Meals section.`;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  pendingBan = null;
  document.getElementById('modalOverlay').classList.add('hidden');
}

function confirmBan() {
  if (!pendingBan) return;
  const banned = getBanned();
  if (!banned.includes(pendingBan)) {
    banned.push(pendingBan);
    setCookie('bannedMeals', banned);
  }
  // Re-roll any day currently showing the banned meal
  DAYS.forEach(day => {
    ['breakfast', 'lunch', 'dinner'].forEach(type => {
      if (plan[day][type] === pendingBan) plan[day][type] = pick(type);
    });
  });
  closeModal();
  renderWeek();
  renderBanned();
}

function unban(meal) {
  const banned = getBanned().filter(m => m !== meal);
  setCookie('bannedMeals', banned);
  renderBanned();
}

function renderBanned() {
  const banned = getBanned();
  document.getElementById('bannedCount').textContent = banned.length ? `(${banned.length})` : '';
  const el = document.getElementById('bannedList');
  if (!banned.length) {
    el.innerHTML = '<p class="empty-note">No banned meals yet. Click 🚫 next to any meal to remove it from suggestions forever.</p>';
    return;
  }
  el.innerHTML = `<div class="banned-grid">${
    banned.map(m => `
      <span class="banned-tag">${m}
        <button onclick="unban('${esc(m)}')" title="Restore">✕</button>
      </span>`).join('')
  }</div>`;
}

/* ── Save / load weeks ── */
function saveWeek() {
  const name = document.getElementById('weekNameInput').value.trim();
  if (!name) { alert('Please enter a name for this week.'); return; }
  const weeks = getSaved();
  const idx = weeks.findIndex(w => w.name === name);
  const entry = { name, plan: JSON.parse(JSON.stringify(plan)) };
  if (idx > -1) weeks[idx] = entry; else weeks.push(entry);
  setCookie('savedWeeks', weeks);
  document.getElementById('weekNameInput').value = '';
  renderSaved();
}

function loadWeek(idx) {
  const saved = getSaved()[idx];
  if (!saved) return;
  DAYS.forEach(d => plan[d] = { ...saved.plan[d] });
  renderWeek();
}

function deleteWeek(idx) {
  const weeks = getSaved();
  weeks.splice(idx, 1);
  setCookie('savedWeeks', weeks);
  renderSaved();
}

function renderSaved() {
  const weeks = getSaved();
  const el = document.getElementById('savedList');
  if (!weeks.length) {
    el.innerHTML = '<p class="empty-note">No saved weeks yet.</p>';
    return;
  }
  el.innerHTML = weeks.map((w, i) => `
    <div class="saved-item">
      <span class="saved-item-name">📅 ${w.name}</span>
      <div class="saved-item-actions">
        <button class="btn-sm btn-load" onclick="loadWeek(${i})">Load</button>
        <button class="btn-sm btn-del-week" onclick="deleteWeek(${i})">Delete</button>
      </div>
    </div>`).join('');
}

/* ── Custom meals ── */
function addCustomMeal() {
  const input = document.getElementById('customInput');
  const cat   = document.getElementById('customCategory').value;
  const val   = input.value.trim();
  if (!val) return;
  const data = getCustom();
  if (!data[cat].includes(val)) {
    data[cat].push(val);
    setCookie('customMeals', data);
  }
  input.value = '';
  renderCustomLists();
}

function deleteCustomMeal(cat, idx) {
  const data = getCustom();
  data[cat].splice(idx, 1);
  setCookie('customMeals', data);
  renderCustomLists();
}

function renderCustomLists() {
  const data = getCustom();
  const cats = [
    { key: 'breakfast', label: '🌅 Breakfast', cls: 'b' },
    { key: 'lunch',     label: '☀️ Lunch',     cls: 'l' },
    { key: 'dinner',    label: '🌙 Dinner',    cls: 'd' },
  ];
  document.getElementById('customLists').innerHTML = cats.map(c => `
    <div class="custom-category ${c.cls}">
      <h3>${c.label}</h3>
      ${!data[c.key].length
        ? '<p class="empty-note">No custom meals saved yet.</p>'
        : data[c.key].map((m, i) => `
          <div class="custom-item">
            <span>${m}</span>
            <button class="btn-del" onclick="deleteCustomMeal('${c.key}', ${i})">✕</button>
          </div>`).join('')
      }
    </div>`).join('');
}

/* ── Sidebar (mobile hamburger slide-in) ── */
function setSidebar(open) {
  document.getElementById('sidebar').classList.toggle('open', open);
  document.getElementById('sidebarBackdrop').classList.toggle('open', open);
  const btn = document.getElementById('menuToggle');
  btn.classList.toggle('active', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function toggleSidebar() {
  setSidebar(!document.getElementById('sidebar').classList.contains('open'));
}

function closeSidebar() {
  setSidebar(false);
}

/* ── Init ── */
DAYS.forEach(day => {
  plan[day] = { breakfast: pick('breakfast'), lunch: pick('lunch'), dinner: pick('dinner') };
});

document.getElementById('customInput').addEventListener('keydown', e => { if (e.key === 'Enter') addCustomMeal(); });
document.getElementById('weekNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveWeek(); });
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('click', closeAllMealMenus);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllMealMenus(); });

renderWeek();
renderSaved();
renderCustomLists();
renderBanned();
