@echo off
setlocal
title Install or update DSH Vibeify
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install DSH Vibeify.ps1"
if errorlevel 1 (
  echo.
  echo The installer stopped. Read the message above or open:
  echo https://github.com/N9-Developer-Empowerment/DSH-Vibeify/blob/main/docs/FAQ.md
  pause
)
endlocal
