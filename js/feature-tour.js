/**
 * Feature Tour Guide System
 * Interactive floating guide that walks users through all GoalForge features
 */

class FeatureTour {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.tours = this.initializeTours();
    }

    initializeTours() {
        return {
            dashboard: [
                {
                    target: '.logo',
                    title: 'Welcome to GoalForge! 🎯',
                    content: 'Your personal goal achievement platform. Let\'s take a quick tour of all the amazing features!',
                    position: 'bottom'
                },
                {
                    target: 'nav a[href="dashboard.html"]',
                    title: 'Dashboard 📊',
                    content: 'Your central hub showing overview of habits, goals, streaks, and progress at a glance.',
                    position: 'right'
                },
                {
                    target: 'nav a[href="calendar.html"]',
                    title: 'Calendar 📅',
                    content: 'Visual calendar with streak heatmap showing your consistency over time. Track daily activities and see your progress patterns.',
                    position: 'right'
                },
                {
                    target: 'nav a[href="habits.html"]',
                    title: 'Habits ✅',
                    content: 'Create and track daily habits. Build streaks, set reminders, and watch your consistency grow!',
                    position: 'right'
                },
                {
                    target: 'nav a[href="goals.html"]',
                    title: 'Goals 🎯',
                    content: 'Set long-term goals with milestones. Break down big objectives into manageable steps.',
                    position: 'right'
                },
                {
                    target: 'nav a[href="social.html"]',
                    title: 'Social 👥',
                    content: 'Connect with friends! View their streak calendars, compare progress, and stay motivated together.',
                    position: 'right'
                },
                {
                    target: 'nav a[href="challenges.html"]',
                    title: 'Challenges ⚔️',
                    content: 'Create or join challenges! Compete with friends, chat in real-time, and climb the leaderboard.',
                    position: 'right'
                },
                {
                    target: 'nav a[href="leaderboard.html"]',
                    title: 'Leaderboard 🏆',
                    content: 'See how you rank globally or among friends. Compete for the top spot based on XP and streaks!',
                    position: 'right'
                },
                {
                    target: 'nav a[href="profile.html"]',
                    title: 'Settings ⚙️',
                    content: 'Customize your profile, choose unique avatars, manage privacy, notifications, and security settings.',
                    position: 'right'
                }
            ],
            profile: [
                {
                    target: '.profile-avatar',
                    title: 'Your Avatar 🎨',
                    content: 'Click to choose from 4 unique avatar styles: Gradient, Geometric, Pixel, and Abstract. Each with 12+ color combinations!',
                    position: 'bottom'
                },
                {
                    target: '.settings-tabs',
                    title: 'Settings Tabs',
                    content: 'Navigate through Account, Privacy, Notifications, and Display settings - just like Meta apps!',
                    position: 'bottom'
                },
                {
                    target: '#panel-account',
                    title: 'Account Settings 👤',
                    content: 'Update your personal info, change password, enable 2FA, and manage your account security.',
                    position: 'top'
                },
                {
                    target: '#panel-privacy',
                    title: 'Privacy Controls 🔒',
                    content: 'Control who sees your profile, activity status, streaks, and manage friend requests.',
                    position: 'top'
                },
                {
                    target: '#panel-notifications',
                    title: 'Notifications 🔔',
                    content: 'Set up habit reminders, streak alerts, friend activity notifications, and email preferences.',
                    position: 'top'
                },
                {
                    target: '#panel-display',
                    title: 'Display Preferences 🎨',
                    content: 'Choose your theme, accent color, date format, and customize the app\'s appearance.',
                    position: 'top'
                }
            ],
            social: [
                {
                    target: '.invite-code-box',
                    title: 'Your Invite Code 🔗',
                    content: 'Share this code with friends! They can use it to connect with you and start competing.',
                    position: 'bottom'
                },
                {
                    target: '.social-tabs',
                    title: 'Social Features',
                    content: 'Switch between Friends list, Streak Calendar, and Comparison views.',
                    position: 'bottom'
                },
                {
                    target: '#panel-streaks',
                    title: 'Friend Streak Calendar 🔥',
                    content: 'See your friends\' daily activity! Color-coded by streak intensity - celebrate their milestones!',
                    position: 'top'
                },
                {
                    target: '#panel-compare',
                    title: 'Compare & Compete 📊',
                    content: 'Visual graphs showing how you stack up against friends. Each friend has a unique color!',
                    position: 'top'
                }
            ],
            challenges: [
                {
                    target: '.page-header button',
                    title: 'Create Challenge ➕',
                    content: 'Start a new challenge! Set goals, invite friends, and compete together.',
                    position: 'bottom'
                },
                {
                    target: '.challenge-grid',
                    title: 'Active Challenges ⚔️',
                    content: 'Browse all active challenges. Click any card to join, view leaderboard, and chat with participants!',
                    position: 'top'
                },
                {
                    target: '.challenge-card',
                    title: 'Challenge Details',
                    content: 'Each challenge shows the goal, participant count, and days remaining. Click to see full details!',
                    position: 'top',
                    optional: true
                }
            ],
            challengeDetail: [
                {
                    target: '.challenge-leaderboard',
                    title: 'Challenge Leaderboard 🏆',
                    content: 'See who\'s leading! Top 3 get medals. Update your score to climb the ranks!',
                    position: 'top'
                },
                {
                    target: '.chat-container',
                    title: 'Challenge Chat 💬',
                    content: 'Discuss strategy, motivate each other, and share progress in real-time!',
                    position: 'left'
                },
                {
                    target: '.chat-input',
                    title: 'Send Messages',
                    content: 'Type your message and press Enter or click Send. Stay connected with your team!',
                    position: 'top'
                }
            ]
        };
    }

    start(tourName = 'dashboard') {
        if (!this.tours[tourName]) {
            console.error(`Tour "${tourName}" not found`);
            return;
        }

        this.currentTour = this.tours[tourName];
        this.currentStep = 0;
        this.isActive = true;

        // Save tour state
        localStorage.setItem('tour_active', 'true');
        localStorage.setItem('tour_name', tourName);

        this.createOverlay();
        this.showStep();
    }

    createOverlay() {
        // Create dark overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            backdrop-filter: blur(2px);
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(this.overlay);

        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95));
            color: white;
            padding: 24px;
            border-radius: 16px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: tooltipFadeIn 0.3s ease;
        `;
        document.body.appendChild(this.tooltip);

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tooltipFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            .tour-highlight {
                position: relative;
                z-index: 9999 !important;
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 0 8px rgba(99, 102, 241, 0.3) !important;
                border-radius: 8px !important;
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }

    showStep() {
        const step = this.currentTour[this.currentStep];
        if (!step) {
            this.end();
            return;
        }

        // Find target element
        const target = document.querySelector(step.target);
        if (!target && !step.optional) {
            console.warn(`Target "${step.target}" not found, skipping step`);
            this.next();
            return;
        }

        // Highlight target
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
        if (target) {
            target.classList.add('tour-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Update tooltip content
        this.tooltip.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">${step.title}</h3>
                <p style="line-height: 1.6; opacity: 0.95;">${step.content}</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <div style="font-size: 0.875rem; opacity: 0.8;">
                    Step ${this.currentStep + 1} of ${this.currentTour.length}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="featureTour.skip()" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        Skip Tour
                    </button>
                    ${this.currentStep > 0 ? `
                        <button onclick="featureTour.previous()" style="
                            background: rgba(255, 255, 255, 0.2);
                            border: none;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            ← Back
                        </button>
                    ` : ''}
                    <button onclick="featureTour.next()" style="
                        background: white;
                        border: none;
                        color: #6366f1;
                        padding: 8px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        ${this.currentStep === this.currentTour.length - 1 ? 'Finish ✓' : 'Next →'}
                    </button>
                </div>
            </div>
        `;

        // Position tooltip
        this.positionTooltip(target, step.position);
    }

    positionTooltip(target, position = 'bottom') {
        if (!target) {
            // Center tooltip if no target
            this.tooltip.style.top = '50%';
            this.tooltip.style.left = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const padding = 20;

        switch (position) {
            case 'top':
                this.tooltip.style.top = `${rect.top - tooltipRect.height - padding}px`;
                this.tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
                break;
            case 'bottom':
                this.tooltip.style.top = `${rect.bottom + padding}px`;
                this.tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
                break;
            case 'left':
                this.tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipRect.height / 2)}px`;
                this.tooltip.style.left = `${rect.left - tooltipRect.width - padding}px`;
                break;
            case 'right':
                this.tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipRect.height / 2)}px`;
                this.tooltip.style.left = `${rect.right + padding}px`;
                break;
        }

        // Ensure tooltip stays in viewport
        const tooltipBounds = this.tooltip.getBoundingClientRect();
        if (tooltipBounds.right > window.innerWidth) {
            this.tooltip.style.left = `${window.innerWidth - tooltipRect.width - 20}px`;
        }
        if (tooltipBounds.left < 0) {
            this.tooltip.style.left = '20px';
        }
        if (tooltipBounds.bottom > window.innerHeight) {
            this.tooltip.style.top = `${window.innerHeight - tooltipRect.height - 20}px`;
        }
        if (tooltipBounds.top < 0) {
            this.tooltip.style.top = '20px';
        }
    }

    next() {
        this.currentStep++;
        if (this.currentStep >= this.currentTour.length) {
            this.end();
        } else {
            this.showStep();
        }
    }

    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep();
        }
    }

    skip() {
        this.end();
    }

    end() {
        this.isActive = false;
        localStorage.removeItem('tour_active');
        localStorage.removeItem('tour_name');

        // Remove highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });

        // Remove overlay and tooltip
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => this.overlay?.remove(), 300);
        }
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
            setTimeout(() => this.tooltip?.remove(), 300);
        }

        // Mark tour as completed
        const completedTours = JSON.parse(localStorage.getItem('completed_tours') || '[]');
        const tourName = localStorage.getItem('tour_name');
        if (tourName && !completedTours.includes(tourName)) {
            completedTours.push(tourName);
            localStorage.setItem('completed_tours', JSON.stringify(completedTours));
        }
    }

    // Auto-start tour if user is new
    static autoStart() {
        // Feature tour disabled - users can explore on their own
        return;
    }
}

// Create global instance
window.featureTour = new FeatureTour();

// Auto-start disabled
// document.addEventListener('DOMContentLoaded', () => {
//     FeatureTour.autoStart();
// });

// Help button disabled - no feature tour
// function addTourButton() {
//     // Tour button removed
// }

// Add tour button when DOM is ready
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', addTourButton);
// } else {
//     addTourButton();
// }

export { FeatureTour };
