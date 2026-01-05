import { defineConfig } from 'vite';

export default defineConfig({
  // Basic config
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        auth: 'pages/auth.html',
        onboarding: 'pages/onboarding.html',
        dashboard: 'pages/dashboard.html',
        calendar: 'pages/calendar.html',
        habits: 'pages/habits.html',
        goals: 'pages/goals.html',
        social: 'pages/social.html',
        leaderboard: 'pages/leaderboard.html',
        activity: 'pages/activity.html',
        domains: 'pages/domains.html',
        profile: 'pages/profile.html'
      }
    }
  }
});
