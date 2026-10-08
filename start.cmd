@echo off
REM ============================================
REM  寻迹 · 校园失物招领 —— Windows 启动辅助
REM  优先使用谷歌浏览器打开 index.html
REM ============================================
setlocal
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%~dp0index.html"
) else (
  start "" "%~dp0index.html"
)
endlocal
