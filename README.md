# 🌿 Family Fitness Tracker

A personal fitness tracker for the family — dead hangs, walking, and whatever comes next.

## Live app
**https://abreng01.github.io/fitness_tracker/**

## Stack
- React + Vite
- JSONBin.io for cloud storage (data syncs across all devices)
- GitHub Actions for auto-deploy to GitHub Pages

## Setup (one-time)
1. Add two secrets in GitHub → Settings → Secrets → Actions:
   - `VITE_JSONBIN_BIN_ID` — your JSONBin bin ID
   - `VITE_JSONBIN_API_KEY` — your JSONBin master key
2. Enable GitHub Pages → Source: GitHub Actions
3. Push to `main` — it deploys automatically

## Local dev
```bash
npm install
# Create .env file:
# VITE_JSONBIN_BIN_ID=your_bin_id
# VITE_JSONBIN_API_KEY=your_master_key
npm run dev
```
