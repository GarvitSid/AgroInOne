# setup_env.ps1
# Usage: Open a fresh PowerShell (not Administrator unless needed) and run:
#   cd "C:\My Codes\AgroInOne\scripts"
#   .\setup_env.ps1
# This script performs checks and installs for the AgroInOne dev environment.
# It will:
#  - check for node & npm
#  - check for python
#  - create & populate a venv for ml-server
#  - run npm install for frontend and backend
#  - optionally install react-scripts if missing
#  - optionally start the three servers in new PowerShell windows

$ErrorActionPreference = 'Stop'

# Helper: write a header
function header($text){ Write-Host "`n==== $text ====" -ForegroundColor Cyan }

# Paths
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$mlDir = Join-Path $root 'ml-server'
$frontendDir = Join-Path $root 'frontend'
$backendDir = Join-Path $root 'backend'
$venvDir = Join-Path $mlDir '.venv'

header "1) Checking Node/NPM"
try{
    $node = & node -v 2>$null
    $npm = & npm -v 2>$null
    Write-Host "node: $node" -ForegroundColor Green
    Write-Host "npm: $npm" -ForegroundColor Green
    Write-Host "where npm:" -NoNewline
    & where.exe npm | ForEach-Object { Write-Host "`n  $_" }
} catch {
    Write-Host "ERROR: node or npm not found in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js LTS from https://nodejs.org and re-open your terminal." -ForegroundColor Yellow
    exit 1
}

header "2) Checking Python"
try{
    $py = & python -V
    Write-Host "python: $py" -ForegroundColor Green
    Write-Host "where python:" -NoNewline
    & where.exe python | ForEach-Object { Write-Host "`n  $_" }
} catch {
    Write-Host "ERROR: python not found in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ and ensure 'python' is on PATH." -ForegroundColor Yellow
    exit 1
}

# Create venv and install requirements
header "3) Creating virtual environment for ml-server (if missing)"
if (-Not (Test-Path $mlDir)){
    Write-Host "ERROR: ml-server folder not found at $mlDir" -ForegroundColor Red
    exit 1
}

if (-Not (Test-Path $venvDir)){
    Write-Host "Creating venv at $venvDir"
    & python -m venv $venvDir
} else {
    Write-Host "Venv already exists at $venvDir" -ForegroundColor Yellow
}

$pyExe = Join-Path $venvDir 'Scripts\python.exe'
if (-Not (Test-Path $pyExe)){
    Write-Host "ERROR: Python executable in venv not found: $pyExe" -ForegroundColor Red
    exit 1
}

header "4) Installing Python dependencies into venv"
& $pyExe -m pip install --upgrade pip
try{
    & $pyExe -m pip install -r (Join-Path $mlDir 'requirements.txt')
    Write-Host "Python requirements installed." -ForegroundColor Green
} catch {
    Write-Host "Failed to install Python requirements. Showing last 20 lines of error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

header "5) Installing frontend dependencies"
if (-Not (Test-Path $frontendDir)){
    Write-Host "WARNING: frontend directory not found: $frontendDir" -ForegroundColor Yellow
} else {
    Push-Location $frontendDir
    try{
        Write-Host "Running npm install in $frontendDir"
        & npm install
        Write-Host "Frontend npm install completed." -ForegroundColor Green
    } catch {
        Write-Host "npm install failed in frontend:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Pop-Location
        exit 1
    }
    # ensure react-scripts exists (common CRA issue)
    $hasReactScripts = & npm ls react-scripts --depth=0 2>$null
    if ($LASTEXITCODE -ne 0){
        Write-Host "react-scripts not detected; installing react-scripts --save-dev" -ForegroundColor Yellow
        & npm install --save-dev react-scripts
    }
    Pop-Location
}

header "6) Installing backend dependencies"
if (-Not (Test-Path $backendDir)){
    Write-Host "WARNING: backend directory not found: $backendDir" -ForegroundColor Yellow
} else {
    Push-Location $backendDir
    try{
        Write-Host "Running npm install in $backendDir"
        & npm install
        Write-Host "Backend npm install completed." -ForegroundColor Green
    } catch {
        Write-Host "npm install failed in backend:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Offer to start services
header "7) Ready to start services"
Write-Host "The environment is prepared. You can start services now. This script can optionally open new PowerShell windows to run each server (ml, backend, frontend)." -ForegroundColor Cyan
$start = Read-Host "Start ML, backend, and frontend now? (y/N)"
if ($start -match '^[Yy]'){
    # Start ML server in new window using the venv python
    $mlCmd = "cd `"$mlDir`"; `"$pyExe`" `"$(Join-Path $mlDir 'app.py')`""
    Start-Process powershell -ArgumentList "-NoExit","-Command","$mlCmd" -WindowStyle Normal
    Write-Host "Started ML server window." -ForegroundColor Green

    # Start backend (npm start) in new window
    if (Test-Path $backendDir){
        $bkCmd = "cd `"$backendDir`"; npm start"
        Start-Process powershell -ArgumentList "-NoExit","-Command","$bkCmd" -WindowStyle Normal
        Write-Host "Started backend server window." -ForegroundColor Green
    }

    # Start frontend (npm start) in new window
    if (Test-Path $frontendDir){
        $feCmd = "cd `"$frontendDir`"; npm start"
        Start-Process powershell -ArgumentList "-NoExit","-Command","$feCmd" -WindowStyle Normal
        Write-Host "Started frontend server window." -ForegroundColor Green
    }

    Write-Host "All start commands launched in separate windows. Check their consoles for logs." -ForegroundColor Cyan
} else {
    Write-Host "Skipping automatic start. You can start servers manually when ready:" -ForegroundColor Cyan
    Write-Host "  - ML server: $pyExe app.py (from $mlDir)"
    Write-Host "  - Backend: cd $backendDir ; npm start"
    Write-Host "  - Frontend: cd $frontendDir ; npm start"
}

header "8) Quick API test snippets (PowerShell)"
Write-Host "Example: POST order using Invoke-RestMethod (replace YOUR_JWT_TOKEN):" -ForegroundColor Green
Write-Host @"
`$token = 'YOUR_JWT_TOKEN'
`$body = @{
  items = @(@{ productId = 1; qty = 2 })
  address = "123 Main St"
  phone = "9999999999"
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri 'http://localhost:5000/api/orders' -Method Post `
    -Headers @{ Authorization = "Bearer `$token" } `
    -Body `$body -ContentType 'application/json'
"@

Write-Host "Script finished." -ForegroundColor Cyan

exit 0
