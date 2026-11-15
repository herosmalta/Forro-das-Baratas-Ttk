@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==============================================
echo        ARRAIA DAS BARATAS - TIKTOK LIVE
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale o Node.js 20 ou superior: https://nodejs.org/
  pause
  exit /b 1
)

node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 (
  echo ERRO: este projeto precisa do Node.js 20 ou superior.
  echo Atualize em https://nodejs.org/ e tente novamente.
  pause
  exit /b 1
)

echo Node.js compativel encontrado.
echo.
set /p TIKTOK_USER=Digite seu usuario do TikTok (com ou sem @, vazio para testar):
echo.

if "%TIKTOK_USER%"=="" (
  echo Iniciando no modo de teste. Nao precisa instalar bibliotecas do TikTok.
  node server.js
  goto :fim
)

if not exist "node_modules\tiktok-live-connector" (
  echo Instalando dependencias da integracao TikTok...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo ERRO ao instalar dependencias. Confira a internet e tente novamente.
    pause
    exit /b 1
  )
)

node server.js %TIKTOK_USER%

:fim
echo.
echo O servidor foi encerrado.
pause
