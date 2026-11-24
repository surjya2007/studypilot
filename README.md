# StudyPilot — Student Productivity Hub

A responsive, browser-based student dashboard built with **HTML, CSS and vanilla JavaScript**.

## Features
- Dashboard with task, focus and spending summaries
- Task manager with subject, due date, priority, completion and editing
- Study planner generated from task deadlines
- Pomodoro focus timer (25-minute focus, 5-minute and 15-minute breaks)
- Quick notes with editing and deletion
- Expense tracker with INR formatting and monthly totals
- Dark/light theme
- Local browser storage — no account, backend, database or API required

## Run locally
1. Download or clone this repository.
2. Open `index.html` in a modern browser.

No build step or package installation is needed.

## Deploy with GitHub Pages
1. Push the project to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then save.

## Project structure
```text
studypilot/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Privacy
StudyPilot stores tasks, notes, expenses, theme preference and focus totals in the browser's `localStorage`. Data is not sent to a server. Clearing browser site data will erase the saved information.

## License
MIT
