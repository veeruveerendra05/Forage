
const questions = [
    {
        id: 1,
        title: "Morning Routine",
        question: "What time do you usually wake up?",
        type: "select",
        options: ["Before 6 AM", "6 AM - 7 AM", "7 AM - 9 AM", "After 9 AM"]
    },
    {
        id: 2,
        title: "Night Routine",
        question: "What time do you usually go to bed?",
        type: "select",
        options: ["Before 10 PM", "10 PM - 12 AM", "12 AM - 2 AM", "After 2 AM"]
    },
    {
        id: 3,
        title: "Schedule",
        question: "What are your primary work/study hours?",
        type: "select",
        options: ["9 AM - 5 PM (Standard)", "Flexible / Freelance", "Night Shift", "Student Schedule"]
    },
    {
        id: 4,
        title: "Primary Focus",
        question: "What is your main goal right now?",
        type: "options",
        options: ["Fitness & Health", "Academic Excellence", "Coding/Career Skills", "General Knowledge"]
    },
    {
        id: 5,
        title: "Motivation Check",
        question: "How would you rate your current motivation?",
        type: "range",
        min: 1,
        max: 10,
        labels: { 1: "Low", 10: "Unstoppable" }
    },
    {
        id: 6,
        title: "Time Commitment",
        question: "How many hours a day can you dedicate to self-improvement?",
        type: "select",
        options: ["Less than 1 hour", "1-2 hours", "2-4 hours", "4+ hours"]
    },
    {
        id: 7,
        title: "Learning Style",
        question: "How do you learn best?",
        type: "options",
        options: ["Visual (Videos/Diagrams)", "Reading/Writing", "Hands-on Practice", "Listening (Podcasts)"]
    },
    {
        id: 8,
        title: "Current Level",
        question: "How would you describe your experience with habit tracking?",
        type: "options",
        options: ["Complete Beginner", "Tried but failed", "Consistent", "Expert optimizer"]
    },
    {
        id: 9,
        title: "Environment",
        question: "Where do you usually work or study?",
        type: "options",
        options: ["Home Desk", "Office/Library", "Bedroom/Couch", "Cafe/Public Spaces"]
    },
    {
        id: 10,
        title: "Obstacles",
        question: "What usually stops you from achieving goals?",
        type: "options",
        options: ["Procrastination", "Lack of Time", "Distractions", "Burnout"]
    },
    {
        id: 11,
        title: "Experience",
        question: "How would you rate your coding/fitness level?",
        type: "options",
        options: ["Beginner", "Intermediate", "Advanced", "Pro"]
    },
    {
        id: 12,
        title: "Social",
        question: "Do you prefer working alone or with others?",
        type: "options",
        options: ["Solo Wolf", "Accountability Partner", "Group Challenges", "Mixed"]
    },
    {
        id: 13,
        title: "Weekend Mode",
        question: "How do your weekends look?",
        type: "options",
        options: ["Relax & Recharge", "Catch-up Work", "Full grind mode", "Social & Activities"]
    },
    {
        id: 14,
        title: "30-Day Goal",
        question: "What's most important for the next month?",
        type: "options",
        options: ["Build consistency", "Learn a new skill", "Break a bad habit", "Complete a project"]
    },
    {
        id: 15,
        title: "Long Term",
        question: "Where do you see yourself in 1 year?",
        type: "options",
        options: ["Master of my domain", "Healthier & Happier", "Promoted / Good Grades", "Financially Independent"]
    }
];

let currentStep = 0;
const answers = {};
const progressBar = document.getElementById('progress-bar');
const cardContent = document.getElementById('card-content');
const loader = document.getElementById('plan-generator');
const loadingText = document.getElementById('loading-text');

// Init
renderQuestion();

function updateProgress() {
    const percent = ((currentStep) / questions.length) * 100;
    progressBar.style.width = `${percent}%`;
}

function renderQuestion() {
    updateProgress();

    const q = questions[currentStep];

    let inputs = '';

    if (q.type === 'select' || q.type === 'options') {
        inputs = `<div class="question-options">
      ${q.options.map(opt => `<button class="option-btn" onclick="selectOption('${opt}')">${opt}</button>`).join('')}
    </div>`;
    } else if (q.type === 'range') {
        inputs = `
      <div style="padding: 2rem 0;">
        <input type="range" min="${q.min}" max="${q.max}" value="${Math.ceil(q.max / 2)}" id="range-input" oninput="document.getElementById('range-val').innerText = this.value">
        <div class="flex justify-between" style="margin-top: 1rem; color: var(--text-dim);">
          <span>${q.labels[q.min]}</span>
          <span id="range-val" style="color: var(--primary); font-weight: bold; font-size: 1.5rem;">${Math.ceil(q.max / 2)}</span>
          <span>${q.labels[q.max]}</span>
        </div>
        <button class="btn btn-primary w-full" style="margin-top: 2rem;" onclick="selectOption(document.getElementById('range-input').value)">Continue</button>
      </div>
    `;
    }

    cardContent.innerHTML = `
    <div class="question-header">
      <div class="step-indicator">Step ${currentStep + 1} of ${questions.length}</div>
      <h2>${q.title}</h2> <!-- Removed step dependency -->
      <p style="color: var(--text-muted); font-size: 1.25rem;">${q.question}</p>
    </div>
    ${inputs}
    <div class="nav-buttons">
      ${currentStep > 0 ? `<button class="btn btn-outline" onclick="prevStep()">Back</button>` : '<div></div>'}
      <!-- Next button handled by selection for better UX -->
    </div>
  `;
}

// Global functions for inline events
window.selectOption = (val) => {
    answers[questions[currentStep].id] = val;
    nextStep();
};

window.prevStep = () => {
    if (currentStep > 0) {
        currentStep--;
        renderQuestion();
    }
};

function nextStep() {
    if (currentStep < questions.length - 1) {
        currentStep++;
        // Add slide transition effect here if desired
        renderQuestion();
    } else {
        generatePlan();
    }
}

function generatePlan() {
    cardContent.style.opacity = '0';
    progressBar.style.width = '100%';
    loader.style.opacity = '1';
    loader.style.pointerEvents = 'all';

    const tasks = [
        "Analyzing sleep patterns...",
        "Optimizing productivity windows...",
        "Curating habit stack...",
        "Building competition profile...",
        "Finalizing your GoalForge Blueprint..."
    ];

    let i = 0;
    const interval = setInterval(() => {
        loadingText.innerText = tasks[i];
        i++;
        if (i >= tasks.length) {
            clearInterval(interval);
            setTimeout(() => {
                // Save plan to localStorage
                localStorage.setItem('goalforge_plan', JSON.stringify(answers));
                window.location.href = '/pages/dashboard.html';
            }, 1000);
        }
    }, 800);
}
