@echo off
chcp 65001 >nul
title Zyllen Gestão — Servidor

echo ============================================
echo    Zyllen Gestão — Iniciando Servidor
echo ============================================
echo.

:: Caminho do projeto (pasta onde este .bat está)
cd /d "%~dp0"

echo [1/4] Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js não encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo        Node.js %%i

echo [2/4] Verificando pnpm...
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: pnpm não encontrado. Instale com: npm install -g pnpm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('pnpm -v') do echo        pnpm %%i

echo [3/4] Instalando dependências (caso necessário)...
call pnpm install --frozen-lockfile 2>nul || call pnpm install
echo.

echo [4/4] Gerando Prisma Client...
cd apps\api
call npx prisma generate
cd ..\..
echo.

:: Detecta o IP local da máquina na rede
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    if not defined LOCAL_IP (
        for /f "tokens=*" %%b in ("%%a") do set "LOCAL_IP=%%b"
    )
)
if not defined LOCAL_IP set "LOCAL_IP=127.0.0.1"

echo ============================================
echo    Iniciando API (porta 3001) e Web (porta 3000)
echo ============================================
echo.
echo    --- Acesso Local ---
echo    API:  http://localhost:3001
echo    Web:  http://localhost:3000
echo.
echo    --- Acesso Externo (rede local) ---
echo    API:  http://%LOCAL_IP%:3001
echo    Web:  http://%LOCAL_IP%:3000
echo.
echo    Compartilhe o IP acima com outros
echo    dispositivos na mesma rede.
echo.
echo    Pressione Ctrl+C para encerrar.
echo ============================================
echo.

:: Inicia API e Web em paralelo
start "Zyllen API" /min cmd /c "cd /d "%~dp0" && cd apps\api && call pnpm dev"
start "Zyllen Web" /min cmd /c "cd /d "%~dp0" && cd apps\web && call pnpm dev"

echo Servidores iniciados em janelas minimizadas.
echo Feche esta janela ou pressione qualquer tecla para encerrar tudo.
echo.
pause

:: Ao pressionar qualquer tecla, encerra os processos
echo.
echo Encerrando servidores...
taskkill /fi "WINDOWTITLE eq Zyllen API*" /f >nul 2>nul
taskkill /fi "WINDOWTITLE eq Zyllen Web*" /f >nul 2>nul
:: Encerra processos node remanescentes do nest e next
taskkill /im node.exe /f >nul 2>nul
echo Servidores encerrados.
timeout /t 2 >nul
