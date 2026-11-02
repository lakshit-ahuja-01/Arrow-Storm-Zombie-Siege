Add-Type -AssemblyName System.Drawing

$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

# 1. Pixel-crisp 16x16 Archery & Skull Favicon
# Black/dark red background with a bold golden arrow piercing a target / skull
$bmp16 = New-Object System.Drawing.Bitmap(16, 16)
$g16 = [System.Drawing.Graphics]::FromImage($bmp16)
$g16.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g16.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

# Dark crimson vignette background
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 2, 5))
$g16.FillRectangle($bgBrush, 0, 0, 16, 16)
$bgBrush.Dispose()

# Glowing green zombie skull / target outline (thick & bold so it's super visible)
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 50, 220, 60))
$eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 25, 10))
$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 215, 0))
$fireBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 80, 20))

# Skull silhouette
$g16.FillEllipse($greenBrush, 2, 2, 12, 11)
$g16.FillRectangle($greenBrush, 4, 10, 8, 4)

# Eye sockets (dark contrast)
$g16.FillRectangle($eyeBrush, 4, 5, 3, 3)
$g16.FillRectangle($eyeBrush, 9, 5, 3, 3)

# Glowing eyes inside
$glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 150))
$bmp16.SetPixel(5, 6, [System.Drawing.Color]::FromArgb(255, 255, 240, 50))
$bmp16.SetPixel(10, 6, [System.Drawing.Color]::FromArgb(255, 255, 240, 50))

# Teeth
$bmp16.SetPixel(5, 13, [System.Drawing.Color]::White)
$bmp16.SetPixel(7, 13, [System.Drawing.Color]::White)
$bmp16.SetPixel(9, 13, [System.Drawing.Color]::White)

# Fiery Arrow piercing through diagonally from top-left to bottom-right
$penGold = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 220, 50), 1)
$g16.DrawLine($penGold, 0, 0, 15, 15)
# Arrow head tip
$bmp16.SetPixel(14, 15, [System.Drawing.Color]::FromArgb(255, 255, 100, 0))
$bmp16.SetPixel(15, 14, [System.Drawing.Color]::FromArgb(255, 255, 100, 0))
$bmp16.SetPixel(15, 15, [System.Drawing.Color]::White)

$bmp16.Save((Join-Path $outDir "small_app_icon_16x16_pixel_crisp.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$greenBrush.Dispose()
$eyeBrush.Dispose()
$goldBrush.Dispose()
$fireBrush.Dispose()
$penGold.Dispose()
$g16.Dispose()
$bmp16.Dispose()

# Also create 32x32, 64x64 versions if Meta allows uploading higher resolution
$srcIcon = "C:\Users\laksh\.gemini\antigravity-ide\brain\76169818-15a7-4e00-b3dc-9122d1fdd605\.user_uploaded\media_1793531308115.jpg"
$src = [System.Drawing.Image]::FromFile($srcIcon)

foreach ($sz in @(32, 64, 128)) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $bmp.Save((Join-Path $outDir "small_app_icon_${sz}x${sz}.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$src.Dispose()
Write-Host "✅ Generated clean icons"
