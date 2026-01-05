
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthDisplay = document.getElementById('current-month-display');
const heatmap = document.getElementById('heatmap');

let currentDate = new Date();

function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    currentMonthDisplay.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

    // Clear grid
    calendarGrid.innerHTML = `
    <div class="cal-header">Sun</div>
    <div class="cal-header">Mon</div>
    <div class="cal-header">Tue</div>
    <div class="cal-header">Wed</div>
    <div class="cal-header">Thu</div>
    <div class="cal-header">Fri</div>
    <div class="cal-header">Sat</div>
  `;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Padding days
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-cell';
        div.style.background = 'transparent'; // Optional visual distinction
        calendarGrid.appendChild(div);
    }

    // Days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'cal-cell';
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            div.classList.add('today');
        }

        // Simulations events
        let events = '';
        if (Math.random() > 0.6) events += `<div class="cal-event fitness">Run 5km</div>`;
        if (Math.random() > 0.7) events += `<div class="cal-event coding">LeetCode Easy</div>`;
        if (Math.random() > 0.8) events += `<div class="cal-event reading">Atomic Habits</div>`;

        div.innerHTML = `
      <div class="day-number">${i}</div>
      ${events}
    `;
        calendarGrid.appendChild(div);
    }
}

function renderHeatmap() {
    // Simulate 365 days
    for (let i = 0; i < 365; i++) {
        const div = document.createElement('div');
        div.className = 'heatmap-box';

        // Random activity level
        const rand = Math.random();
        if (rand > 0.9) div.classList.add('level-4');
        else if (rand > 0.7) div.classList.add('level-3');
        else if (rand > 0.5) div.classList.add('level-2');
        else if (rand > 0.3) div.classList.add('level-1');

        heatmap.appendChild(div);
    }
}

document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});

// Init
renderCalendar(currentDate);
renderHeatmap();
