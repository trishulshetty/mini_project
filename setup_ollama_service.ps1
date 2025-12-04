# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges. Please run as administrator." -ForegroundColor Red
    exit 1
}

# Download NSSM if not exists
if (-not (Test-Path "nssm.exe")) {
    Write-Host "Downloading NSSM..."
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip = "nssm.zip"
    
    try {
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
        Expand-Archive -Path $nssmZip -DestinationPath .\nssm_temp -Force
        Move-Item -Path ".\nssm_temp\nssm-2.24\win64\nssm.exe" -Destination ".\nssm.exe" -Force
        Remove-Item -Path $nssmZip -Force
        Remove-Item -Path ".\nssm_temp" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "NSSM downloaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "Error downloading NSSM: $_" -ForegroundColor Red
        exit 1
    }
}

# Create the Ollama service
$serviceName = "OllamaService"
$ollamaPath = (Get-Command ollama).Source
$ollamaDir = Split-Path -Parent $ollamaPath

Write-Host "Creating Ollama service..."

# Remove existing service if it exists
if (Get-Service $serviceName -ErrorAction SilentlyContinue) {
    .\nssm.exe remove $serviceName confirm
    Start-Sleep -Seconds 2
}

# Create the service
.\nssm.exe install $serviceName $ollamaPath "serve"
.\nssm.exe set $serviceName AppDirectory $ollamaDir
.\nssm.exe set $serviceName Description "Ollama AI Service"
.\nssm.exe set $serviceName Start SERVICE_AUTO_START
.\nssm.exe set $serviceName AppNoConsole 1

# Start the service
Start-Service $serviceName

Write-Host "Ollama service has been installed and started successfully!" -ForegroundColor Green
Write-Host "Service Name: $serviceName"
Write-Host "Path: $ollamaPath serve"
Write-Host "Working Directory: $ollamaDir"
Write-Host "`nYou can manage the service using:"
Write-Host "- Start Service: Start-Service $serviceName"
Write-Host "- Stop Service: Stop-Service $serviceName"
Write-Host "- View Status: Get-Service $serviceName"
Write-Host "- Remove Service: .\nssm.exe remove $serviceName confirm"
