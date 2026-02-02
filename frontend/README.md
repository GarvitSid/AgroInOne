# 🌾 AgroInOne — Frontend Client

The React single-page frontend for the AgroInOne agricultural platform, powered by Vite.

## Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite 5.4
- **UI & Components**: React-Bootstrap, Bootstrap 5, FontAwesome
- **Notifications**: React Toastify
- **Routing**: React Router v6

## Features
- **Proactive Agricultural Advisory Form**: 3-section diagnostic telemetry interface (Geographic & Logistics, Soil Health N-P-K & pH, Climate & Weather), Enter-key accessibility, one-click demo loader (`⚡ Fill Sample Telemetry`), real-time biological boundary checks, and dual visual cards for Model 1 recommendation and Model 2 yield forecasting.
- **Government Schemes Browser**: Dynamic state-filtered catalog with national program fallbacks.
- **Farmer Helpdesk Knowledge Base**: Searchable agricultural advisory articles and official helpline/portal directory.
- **User Authentication**: Secure JWT-backed login, registration modal, and protected routes.

## Development Scripts
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview

# Build and run with Docker (Nginx multi-stage)
docker build -t agroinone-frontend .
docker run -p 3000:3000 agroinone-frontend
```
