<#
EXPORTAR PROYECTO COMPLETO - Stenbrary
Ejecutar desde la raiz del proyecto (donde esta package.json):
  .\exportar-proyecto.ps1
#>

$outputFile = "STENBRARY_COMPLETO.md"
$projectRoot = Get-Location
$fence = '```'

# Buscar TODOS los archivos relevantes del proyecto
$allFiles = @()

# Configuracion raiz
foreach ($f in @("package.json","angular.json","tsconfig.json","tsconfig.app.json")) {
    if (Test-Path $f) { $allFiles += $f }
}

# src/ raiz
foreach ($f in @("src\index.html","src\main.ts","src\styles.scss")) {
    if (Test-Path $f) { $allFiles += $f }
}

# src\app\ y todo dentro (ts, html, scss) - sin spec ni node_modules
$appPath = "src\app"
if (Test-Path $appPath) {
    Get-ChildItem -Path $appPath -Recurse -File -Include "*.ts","*.html","*.scss" |
        Where-Object { $_.Name -notmatch '\.spec\.ts$' } |
        Sort-Object FullName |
        ForEach-Object { $allFiles += $_.FullName.Replace("$projectRoot\", "") }
}

# src\environments\ si existe
$envPath = "src\environments"
if (Test-Path $envPath) {
    Get-ChildItem -Path $envPath -Recurse -File -Include "*.ts" |
        ForEach-Object { $allFiles += $_.FullName.Replace("$projectRoot\", "") }
}

function Get-Lang($file) {
    switch ([System.IO.Path]::GetExtension($file)) {
        ".scss" { return "scss" }
        ".html" { return "html" }
        ".json" { return "json" }
        default { return "typescript" }
    }
}

# Construir el archivo
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# STENBRARY - Codigo Fuente Completo")
[void]$sb.AppendLine("# Version: v3.6.1 | Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
[void]$sb.AppendLine("# Angular 18.2 | TypeScript 5.5 | Material | IndexedDB | Chart.js | jsPDF")
[void]$sb.AppendLine("")

$count = 0
foreach ($archivo in $allFiles) {
    $fullPath = Join-Path $projectRoot $archivo
    if (Test-Path $fullPath) {
        $lang = Get-Lang $archivo
        $content = Get-Content $fullPath -Raw
        [void]$sb.AppendLine("## FILE: $archivo")
        [void]$sb.AppendLine("$fence$lang")
        [void]$sb.AppendLine($content)
        [void]$sb.AppendLine($fence)
        [void]$sb.AppendLine("")
        $count++
        Write-Host "  + $archivo" -ForegroundColor Green
    }
}

[System.IO.File]::WriteAllText((Join-Path $projectRoot $outputFile), $sb.ToString(), [System.Text.Encoding]::UTF8)

$size = [math]::Round((Get-Item $outputFile).Length / 1KB, 1)
Write-Host ""
Write-Host "  Listo: $outputFile" -ForegroundColor Cyan
Write-Host "  $count archivos, $size KB" -ForegroundColor Cyan
Write-Host ""
