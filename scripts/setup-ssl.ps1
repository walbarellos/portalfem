param(
    [Parameter(Mandatory)]
    [string]$Domain,
    [string]$Email = "comunicacao@fem.ac.gov.br"
)

Write-Host "=== SSL Setup for $Domain ===" -ForegroundColor Cyan

# Check if certbot is available
if (-not (Get-Command "certbot" -ErrorAction SilentlyContinue)) {
    Write-Host "[WARN] certbot not found. Install it first:" -ForegroundColor Yellow
    Write-Host "  winget install certbot" -ForegroundColor Gray
    Write-Host "  or use Docker: docker run -it --rm -v ${PWD}/ssl:/etc/letsencrypt certbot/certbot certonly --manual -d $Domain" -ForegroundColor Gray
    exit 1
}

# Generate certificates
certbot certonly --webroot -w D:\Antigravity\portal-fem\frontend\dist\client `
    -d $Domain `
    -d www.$Domain `
    --email $Email `
    --agree-tos `
    --non-interactive

# Copy to ssl folder
$sslSource = "$env:SYSTEMDRIVE\Certbot\live\$Domain"
$sslDest = "D:\Antigravity\portal-fem\ssl"

if (Test-Path $sslSource) {
    Copy-Item "$sslSource\fullchain.pem" "$sslDest\fullchain.pem" -Force
    Copy-Item "$sslSource\privkey.pem" "$sslDest\privkey.pem" -Force
    Write-Host "[OK] Certificates copied to $sslDest" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Certbot output not found at $sslSource" -ForegroundColor Red
}
