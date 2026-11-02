Add-Type -AssemblyName System.Drawing

$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

# 1. Archer Tower Defense Square Banner
$srcArcher = "d:\Experiment\ragdoll-archers\crazygames-assets\Square_1-1_800x800.jpg"
$img1 = [System.Drawing.Image]::FromFile($srcArcher)
$bmp1 = New-Object System.Drawing.Bitmap(1080, 1080)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g1.DrawImage($img1, 0, 0, 1080, 1080)
$bmp1.Save((Join-Path $outDir "square_banner_1080x1080.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp1.Dispose()
$img1.Dispose()
Write-Host "✅ Generated: square_banner_1080x1080.png"

# 2. Zombie Close-up Square Banner
$srcZombie = "d:\Experiment\ragdoll-archers\meta-assets\app_icon_source.jpg"
$img2 = [System.Drawing.Image]::FromFile($srcZombie)
$bmp2 = New-Object System.Drawing.Bitmap(1080, 1080)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.DrawImage($img2, 0, 0, 1080, 1080)
$bmp2.Save((Join-Path $outDir "square_banner_1080x1080_zombie.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2.Dispose()
$img2.Dispose()
Write-Host "✅ Generated: square_banner_1080x1080_zombie.png"
