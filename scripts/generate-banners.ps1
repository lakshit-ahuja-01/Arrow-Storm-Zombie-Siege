Add-Type -AssemblyName System.Drawing

$srcLandscape = "d:\Experiment\ragdoll-archers\arrow-storm-zombie-siege-cover-1920x1080.png"
$srcPortrait = "d:\Experiment\ragdoll-archers\crazygames-assets\Portrait_2-3_800x1200.jpg"
$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

# 1. Generate 1200 x 627 Banner (Required Image)
# Ratio = 1200 / 627 = 1.913875. Crop source 1920x1080 to height 1920 / 1.913875 = 1003px (crop 38px top/bottom)
$srcImg = [System.Drawing.Image]::FromFile($srcLandscape)
$cropH = [int]($srcImg.Width * (627.0 / 1200.0))
$cropY = [int](($srcImg.Height - $cropH) / 2)
$bmp1 = New-Object System.Drawing.Bitmap(1200, 627)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$srcRect = New-Object System.Drawing.Rectangle(0, $cropY, $srcImg.Width, $cropH)
$destRect = New-Object System.Drawing.Rectangle(0, 0, 1200, 627)
$g1.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp1.Save((Join-Path $outDir "banner_1200x627.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp1.Dispose()
Write-Host "✅ Created banner_1200x627.png (1200 x 627)"

# 2. Generate 1920 x 1080 Large Landscape Banner
$bmp2 = New-Object System.Drawing.Bitmap(1920, 1080)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.DrawImage($srcImg, 0, 0, 1920, 1080)
$bmp2.Save((Join-Path $outDir "large_banner_1920x1080.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2.Dispose()
$srcImg.Dispose()
Write-Host "✅ Created large_banner_1920x1080.png (1920 x 1080)"

# 3. Generate 1080 x 1920 Portrait Banner
$srcPortImg = [System.Drawing.Image]::FromFile($srcPortrait)
# 800x1200 is 1:1.5. 1080x1920 is 9:16 (1:1.777). Crop slightly from sides to fit 9:16
$cropW = [int]($srcPortImg.Height * (1080.0 / 1920.0))
$cropX = [int](($srcPortImg.Width - $cropW) / 2)
if ($cropX -lt 0) { $cropX = 0 }
$bmp3 = New-Object System.Drawing.Bitmap(1080, 1920)
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$srcRect3 = New-Object System.Drawing.Rectangle($cropX, 0, $cropW, $srcPortImg.Height)
$destRect3 = New-Object System.Drawing.Rectangle(0, 0, 1080, 1920)
$g3.DrawImage($srcPortImg, $destRect3, $srcRect3, [System.Drawing.GraphicsUnit]::Pixel)
$bmp3.Save((Join-Path $outDir "portrait_banner_1080x1920.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$bmp3.Dispose()
$srcPortImg.Dispose()
Write-Host "✅ Created portrait_banner_1080x1920.png (1080 x 1920)"
