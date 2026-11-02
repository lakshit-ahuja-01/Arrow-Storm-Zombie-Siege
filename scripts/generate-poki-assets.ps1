Add-Type -AssemblyName System.Drawing

$outDir = "d:\Experiment\ragdoll-archers\poki-assets"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function Clean-And-Save-Screenshot($srcPath, $outName, $cropBottomPx = 0) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $cleanH = $src.Height - $cropBottomPx
    $bmp = New-Object System.Drawing.Bitmap($src.Width, $cleanH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, (New-Object System.Drawing.Rectangle(0, 0, $src.Width, $cleanH)), [System.Drawing.GraphicsUnit]::Pixel)
    
    $bmp.Save((Join-Path $outDir $outName), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Host "✅ Created: $outName"
}

# 1. Clean gameplay with Jump button and Flame Arrow (No watermark)
Clean-And-Save-Screenshot "d:\Experiment\ragdoll-archers\Screenshot 2026-10-12 084556.png" "poki_screenshot_1_gameplay.png" 0

# 2. Gameplay showing horde attack and tower defense (Clipped bottom 50px to remove CrazyGames bar)
Clean-And-Save-Screenshot "d:\Experiment\ragdoll-archers\Screenshot 2026-10-05 204809.png" "poki_screenshot_2_horde.png" 52

# 3. Main Menu showing Campaign & Endless game modes (Clipped bottom 50px to remove CrazyGames bar)
Clean-And-Save-Screenshot "d:\Experiment\ragdoll-archers\Screenshot 2026-10-05 204828.png" "poki_screenshot_3_menu.png" 52
