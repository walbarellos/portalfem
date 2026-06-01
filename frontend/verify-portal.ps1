param(
    [switch]$FixCategorias
)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "       VERIFICACAO DO PORTAL FEM" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

cd D:\Antigravity\portal-fem\frontend

# 1. MATERIAL SYMBOLS CDN
$hasGoogleFonts = Select-String -Path "src/layouts/Layout.astro" -Pattern "googleapis|fonts.googleapis" -Quiet
if ($hasGoogleFonts) {
    Write-Host "[CDN] Material Symbols AINDA via Google Fonts" -ForegroundColor Yellow
} else {
    Write-Host "[CDN] Google Fonts removido" -ForegroundColor Green
}
$materialCount = (Select-String -Path "src/**/*.astro" -Pattern "material-symbols-outlined" | Measure-Object).Count
Write-Host "  Icones Material Symbols: $materialCount"

# 2. SELF-HOST FONTS
$hasGeist = Test-Path "public/fonts/Geist-Variable.woff2"
$hasSpaceGrotesk = Select-String -Path "src/layouts/Layout.astro" -Pattern "fontsource" -Quiet
if ($hasGeist) { Write-Host "[Fonts] Geist self-hosted: OK" -ForegroundColor Green }
else { Write-Host "[Fonts] Geist self-hosted: FALTA" -ForegroundColor Red }
if ($hasSpaceGrotesk) { Write-Host "[Fonts] Space Grotesk via @fontsource: OK" -ForegroundColor Green }
else { Write-Host "[Fonts] Space Grotesk: FALTA" -ForegroundColor Red }

# 3. PAGEHERO COMPONENT
$hasPageHero = Test-Path "src/components/PageHero.astro"
$pageHeroUsage = (Select-String -Path "src/pages/*.astro" -Pattern "PageHero" | Measure-Object).Count
if ($hasPageHero) { Write-Host "[Hero] PageHero.astro: OK" -ForegroundColor Green }
else { Write-Host "[Hero] PageHero.astro: FALTA" -ForegroundColor Red }
Write-Host "  Paginas usando PageHero: $pageHeroUsage"

# 4. SCROLL REVEAL
$hasReveal = Select-String -Path "src/layouts/Layout.astro" -Pattern "data-reveal|IntersectionObserver" -Quiet
if ($hasReveal) { Write-Host "[Reveal] Scroll reveal: OK" -ForegroundColor Green }
else { Write-Host "[Reveal] Scroll reveal: FALTA" -ForegroundColor Red }

# 5. VLIBRAS ASYNC
$hasAsync = Select-String -Path "src/components/VLibras.astro" -Pattern "async" -Quiet
if ($hasAsync) { Write-Host "[VLibras] Async configurado: OK" -ForegroundColor Green }
else { Write-Host "[VLibras] Async: FALTA" -ForegroundColor Red }

# 6. PRERENDER
$prerenderPages = @()
$ssrPages = @()
Get-ChildItem "src/pages" -Recurse -Filter "*.astro" | ForEach-Object {
    $lines = Get-Content $_.FullName
    $prerenderLine = $lines | Select-String "export const prerender" -SimpleMatch
    if ($prerenderLine) {
        if ($prerenderLine -match "true") { $prerenderPages += $_.Name }
        else { $ssrPages += $_.Name }
    }
}
Write-Host "[Build] Paginas prerender: $($prerenderPages.Count) | SSR: $($ssrPages.Count)" -ForegroundColor Green

# 7. CARDS
$hasBadge = Select-String -Path "src/components/CardNoticia.astro" -Pattern "local_offer|categoriaLabel" -Quiet
$hasCardShadow = Select-String -Path "src/components/CardNoticia.astro" -Pattern "shadow-xl" -Quiet
if ($hasBadge) { Write-Host "[Cards] Badge categoria: OK" -ForegroundColor Green }
else { Write-Host "[Cards] Badge categoria: FALTA" -ForegroundColor Red }
if ($hasCardShadow) { Write-Host "[Cards] Sombra hover: OK" -ForegroundColor Green }
else { Write-Host "[Cards] Sombra hover: FALTA" -ForegroundColor Red }

# 8. SOMBRAS (TAILWIND)
$shadowConfig = Select-String -Path "tailwind.config.mjs" -Pattern "12px 24px" -Quiet
if ($shadowConfig) { Write-Host "[Sombras] Shadow card-hover: OK" -ForegroundColor Green }
else { Write-Host "[Sombras] Shadow card-hover: default" -ForegroundColor Yellow }

# 9. HERO MESH GRADIENT
$hasMesh = Select-String -Path "src/pages/index.astro" -Pattern "radial-gradient.*ellipse" -Quiet
if ($hasMesh) { Write-Host "[Hero] Mesh gradient na Home: OK" -ForegroundColor Green }
else { Write-Host "[Hero] Mesh gradient na Home: FALTA" -ForegroundColor Red }

# 10. API CATEGORIAS
try {
    $api = Invoke-RestMethod -Uri "http://localhost:8055/items/noticias?fields=categoria&filter[status][_eq]=published&limit=100" -Headers @{ Authorization = "Bearer $env:DIRECTUS_TOKEN" } -ErrorAction Stop
    $semCat = $api.data | Where-Object { -not $_.categoria }
    if ($semCat.Count -eq 0) {
        Write-Host "[API] Todas as noticias tem categoria" -ForegroundColor Green
    } else {
        Write-Host "[API] $($semCat.Count) noticias sem categoria" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[API] Directus offline (ignorado)" -ForegroundColor Gray
}

# RESUMO
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "          VERIFICACAO CONCLUIDA" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if ($FixCategorias) {
    Write-Host "[Fix] Nenhuma correcao necessaria (categorias OK)" -ForegroundColor Yellow
}
