[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
$version = $manifest.version
$outputRoot = Join-Path $projectRoot "outputs"
$stageRoot = Join-Path $outputRoot ".package-stage"
$zipPath = Join-Path $outputRoot "rnp-video-background-$version.zip"
$pluginPath = Join-Path $outputRoot "rnp-video-background-$version.plugin"
$checksumPath = Join-Path $outputRoot "SHA256SUMS.txt"
$runtimeFiles = @(
    "manifest.json",
    "main.js",
    "style.css",
    "preview.svg",
    "tools/launcher.vbs",
    "tools/worker.ps1",
    "tools/FFMPEG-NOTICE.txt"
)

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -Recurse -Force -LiteralPath $stageRoot
}
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

foreach ($file in $runtimeFiles) {
    $source = Join-Path $projectRoot $file
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing runtime file: $file"
    }
    $destination = Join-Path $stageRoot $file
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -Force -LiteralPath $zipPath
}
if (Test-Path -LiteralPath $pluginPath) {
    Remove-Item -Force -LiteralPath $pluginPath
}

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
Move-Item -LiteralPath $zipPath -Destination $pluginPath

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($pluginPath)
try {
    $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })
    $unexpected = @($entries | Where-Object { $_ -notin $runtimeFiles })
    $missing = @($runtimeFiles | Where-Object { $_ -notin $entries })
    if ($unexpected.Count -gt 0 -or $missing.Count -gt 0) {
        throw "Package content mismatch. Missing: $($missing -join ', '); unexpected: $($unexpected -join ', ')"
    }
}
finally {
    $archive.Dispose()
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $pluginPath).Hash.ToLowerInvariant()
"$hash  $([System.IO.Path]::GetFileName($pluginPath))" | Set-Content -Encoding ascii -LiteralPath $checksumPath

Remove-Item -Recurse -Force -LiteralPath $stageRoot

Write-Output "Created: $pluginPath"
Write-Output "SHA256: $hash"
