@echo off
title CWT
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
) else (
  echo Node.js was not found. Trying Python...
  start "" "http://localhost:5178"
  python -m http.server 5178 --bind 127.0.0.1
)
pause
