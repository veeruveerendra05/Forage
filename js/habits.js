// Habits - Start with empty data
let habits = [];

const container = document.getElementById('habits-container');
const modal = document.getElementById('create-modal');

// Init
renderHabits('all');

// Global scope
window.filterHabits = (cat) => {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderHabits(cat);
};

window.openModal = () => modal.classList.add('active');
window.closeModal = () => modal.classList.remove('active');

document.getElementById('create-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('habit-name').value;
  const category = document.getElementById('habit-category').value;

  const icons = { fitness: '💪', coding: '💻', reading: '📚', academics: '🎓', knowledge: '🧠' };
  const colors = { fitness: '#10b981', coding: '#8b5cf6', reading: '#ec4899', academics: '#f59e0b', knowledge: '#3b82f6' };

  const newHabit = {
    id: Date.now(),
    name,
    category,
    streak: 0,
    completed: 0,
    color: colors[category],
    icon: icons[category]
  };

  habits.push(newHabit);
  renderHabits('all');
  closeModal();
  e.target.reset();
});

function renderHabits(filter) {
  container.innerHTML = '';

  const filtered = filter === 'all' ? habits : habits.filter(h => h.category === filter);

  if (filtered.length === 0) {
    container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
                <div style="font-size: 3rem; margin-bottom: var(--space-md);">✅</div>
                <h3 style="margin-bottom: var(--space-sm);">No habits yet</h3>
                <p>Create your first habit to start building consistency!</p>
                <button class="btn btn-primary" style="margin-top: var(--space-lg);" onclick="openModal()">Create Habit</button>
            </div>
        `;
    return;
  }

  filtered.forEach(h => {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.innerHTML = `
      <div class="priority-indicator" style="background: ${h.color}"></div>
      <div class="habit-header">
        <div class="habit-icon" style="background: ${h.color}20; color: ${h.color}">${h.icon}</div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 1.25rem;">${h.streak}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Streak</div>
        </div>
      </div>
      <h3>${h.name}</h3>
      <div style="color: var(--text-dim); font-size: 0.875rem; text-transform: capitalize; margin-bottom: 1rem;">${h.category}</div>
      
      <div class="flex justify-between items-center" style="font-size: 0.875rem;">
        <span>Today's Goal</span>
        <span>${h.completed}%</span>
      </div>
      <div class="habit-progress-bar">
        <div class="habit-fill" style="width: ${h.completed}%; background: ${h.color};"></div>
      </div>
      
      <button class="btn w-full hover:brightness-110" style="margin-top: var(--space-lg); background: ${h.color}20; color: ${h.color};" onclick="checkIn(${h.id})">
        ${h.completed >= 100 ? 'Completed' : 'Check In'}
      </button>
    `;
    container.appendChild(card);
  });
}

window.checkIn = (id) => {
  const h = habits.find(x => x.id === id);
  if (h.completed < 100) {
    h.completed = Math.min(100, h.completed + 20);
    if (h.completed === 100) h.streak++;
    renderHabits(document.querySelector('.filter-btn.active').innerText.toLowerCase() === 'all' ? 'all' : document.querySelector('.filter-btn.active').innerText.toLowerCase());
  }
};
