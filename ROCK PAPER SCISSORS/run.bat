@echo off

:: Step 1: Start the backend server
echo Starting backend server...
start cmd.exe /k "cd /d C:\Users\Hemant\Downloads\PYTHON\GAMES\ROCK PAPER SCISSORS\backend && node server.js"

:: Step 2: Start the frontend development server in a new CMD window
echo Starting frontend development server...
start cmd.exe /k "cd /d C:\Users\Hemant\Downloads\PYTHON\GAMES\ROCK PAPER SCISSORS && npm run dev"

echo All commands initiated. You may close this window.
exit