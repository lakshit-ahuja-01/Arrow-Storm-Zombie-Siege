Add-Type -AssemblyName System.Drawing

$srcLandscape = "d:\Experiment\ragdoll-archers\arrow-storm-zombie-siege-cover-1920x1080.png"
$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

$src = [System.Drawing.Image]::FromFile($srcLandscape)
$destW = 1600
$destH = 300

# Crop strip from the top where the Logo, Archer's bow, Zombie Titan face & Blood Moon are
$cropH = [int]($src.Width * (300.0 / 1600.0)) # 360px
$cropY = 20 # slight padding from very top edge

$bmp = New-Object System.Drawing.Bitmap($destW, $destH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle(0, $cropY, $src.Width, $cropH)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $destW, $destH)
$g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save((Join-Path $outDir "cover_1600x300_action.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Host "✅ Generated: cover_1600x300_action.png"
