# Génère les icônes PWA (icon-192, icon-512, + variantes maskable) sans dépendance
# externe (Node/ImageMagick indisponibles sur cette machine) via System.Drawing (GDI+).
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root 'icons'
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

function New-Icon {
    param(
        [int]$Size,
        [string]$OutPath,
        [bool]$Maskable
    )

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $bgColor = [System.Drawing.Color]::FromArgb(255, 5, 150, 105) # emerald-600
    $g.Clear($bgColor)

    # Zone de sécurité maskable : ~80% du canevas, centré.
    if ($Maskable) { $margin = [int]($Size * 0.1) } else { $margin = [int]($Size * 0.14) }
    $safe = $Size - 2 * $margin

    $fontSize = [int]($safe * 0.42)
    $font = New-Object System.Drawing.Font 'Segoe UI', $fontSize, ([System.Drawing.FontStyle]::Bold)
    $brush = [System.Drawing.Brushes]::White
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
    $g.DrawString('NP', $font, $brush, $rect, $format)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

New-Icon -Size 192 -OutPath (Join-Path $iconsDir 'icon-192.png') -Maskable $false
New-Icon -Size 512 -OutPath (Join-Path $iconsDir 'icon-512.png') -Maskable $false
New-Icon -Size 192 -OutPath (Join-Path $iconsDir 'icon-maskable-192.png') -Maskable $true
New-Icon -Size 512 -OutPath (Join-Path $iconsDir 'icon-maskable-512.png') -Maskable $true

Write-Host "Icones generees dans $iconsDir"
