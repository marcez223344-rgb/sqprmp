@echo off
REM Weekly local backup of the Supabase database, for Windows Task Scheduler.
REM Task Scheduler cannot run npm directly, so this wrapper moves to the repository first
REM and appends every run to a log you can check without opening a terminal.
setlocal
cd /d "%~dp0.."
if not defined SQLACADEMY_BACKUP_DIR set "SQLACADEMY_BACKUP_DIR=%USERPROFILE%\DataMindsBackups"
if not exist "%SQLACADEMY_BACKUP_DIR%" mkdir "%SQLACADEMY_BACKUP_DIR%"
echo. >> "%SQLACADEMY_BACKUP_DIR%\backup.log"
echo ===== %DATE% %TIME% ===== >> "%SQLACADEMY_BACKUP_DIR%\backup.log"
call npm run db:backup >> "%SQLACADEMY_BACKUP_DIR%\backup.log" 2>&1
echo exit code %ERRORLEVEL% >> "%SQLACADEMY_BACKUP_DIR%\backup.log"
endlocal
