param(
  [string]$DirectusUrl = "http://localhost:8055",
  [string]$Email = "admin@femcultura.ac.gov.br",
  [string]$Password = "F3m_Adm1n_2025_S3gur0",
  [string]$StaticToken = "fem-admin-static-token-2025"
)

$ErrorActionPreference = "Stop"

Write-Host "Aguardando Directus ficar pronto..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
do {
  try {
    $r = Invoke-WebRequest -Uri "$DirectusUrl/server/ping" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { break }
  } catch {}
  $retry++
  if ($retry -ge $maxRetries) {
    Write-Host "ERRO: Directus não respondeu após $maxRetries tentativas" -ForegroundColor Red
    exit 1
  }
  Start-Sleep -Seconds 2
} while ($true)
Write-Host "Directus pronto!" -ForegroundColor Green

Write-Host "Autenticando como admin..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "$DirectusUrl/auth/login" -Method POST `
  -ContentType "application/json" `
  -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
$accessToken = $login.data.access_token
Write-Host "Autenticado!" -ForegroundColor Green

Write-Host "Buscando usuário admin..." -ForegroundColor Yellow
$me = Invoke-RestMethod -Uri "$DirectusUrl/users/me" -Method GET `
  -Headers @{ Authorization = "Bearer $accessToken" }
$userId = $me.data.id
Write-Host "Usuário: $($me.data.email) (ID: $userId)" -ForegroundColor Green

Write-Host "Configurando static token..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$DirectusUrl/users/$userId" -Method PATCH `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $accessToken" } `
  -Body (@{ token = $StaticToken } | ConvertTo-Json) | Out-Null
Write-Host "Token '$StaticToken' configurado com sucesso!" -ForegroundColor Green

Write-Host "Testando token estático..." -ForegroundColor Yellow
$test = Invoke-RestMethod -Uri "$DirectusUrl/items/servicos_sistemas" -Method GET `
  -Headers @{ Authorization = "Bearer $StaticToken" }
Write-Host "Teste OK - $($test.data.Count) itens retornados" -ForegroundColor Green

Write-Host "`nSetup concluído! O frontend já pode se conectar." -ForegroundColor Green
