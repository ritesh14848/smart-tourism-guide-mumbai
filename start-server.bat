@echo off
title Smart Tourism Guide: Mumbai
cd /d "%~dp0"
echo Starting Smart Tourism Guide Server...
start http://localhost:3000
node server.js
pause
