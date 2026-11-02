Add-Type -AssemblyName System.Drawing

$srcIcon = "C:\Users\laksh\.gemini\antigravity-ide\brain\76169818-15a7-4e00-b3dc-9122d1fdd605\.user_uploaded\media_1793531308115.jpg"
$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

$src = [System.Drawing.Image]::FromFile($srcIcon)

# 1. Option A: Sharpened full icon
# Downsample in two steps (1024 -> 64 -> 16) for maximum sharpness
$bmp64 = New-Object System.Drawing.Bitmap(64, 64)
$g64 = [System.Drawing.Graphics]::FromImage($bmp64)
$g64.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g64.DrawImage($src, 0, 0, 64, 64)

$bmp16 = New-Object System.Drawing.Bitmap(16, 16)
$g16 = [System.Drawing.Graphics]::FromImage($bmp16)
$g16.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g16.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g16.DrawImage($bmp64, 0, 0, 16, 16)

$bmp16.Save((Join-Path $outDir "small_app_icon_16x16.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g16.Dispose()
$bmp16.Dispose()
$g64.Dispose()
$bmp64.Dispose()

# 2. Option B: Tight close-up crop on the iconic Zombie Face & Bullseye Helmet (Much clearer at 16px)
# Target center: roughly X = 30% to 80%, Y = 10% to 60%
$cropW = [int]($src.Width * 0.6)
$cropH = [int]($src.Height * 0.6)
$cropX = [int]($src.Width * 0.22)
$cropY = [int]($src.Height * 0.12)

$bmpFace = New-Object System.Drawing.Bitmap(16, 16)
$gFace = [System.Drawing.Graphics]::FromImage($bmpFace)
$gFace.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFace.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$destRect = New-Object System.Drawing.Rectangle(0, 0, 16, 16)
$gFace.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmpFace.Save((Join-Path $outDir "small_app_icon_16x16_face_crop.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$gFace.Dispose()
$bmpFace.Dispose()
$src.Dispose()

Write-Host "✅ Created sharpened 16x16 icons"
