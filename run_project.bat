@echo off
echo ===================================================
echo Starting TracknHeal Project Servers
echo ===================================================


echo Starting Node.js Server (npm start)...
start "Node.js Server" cmd /k "npm start"

echo.
echo Servers are starting in new windows!
echo - Node Server: port 3000
echo.
pause
