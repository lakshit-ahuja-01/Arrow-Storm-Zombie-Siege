Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\laksh\.gemini\antigravity-ide\brain\76169818-15a7-4e00-b3dc-9122d1fdd605\.user_uploaded\media_1793531356805.jpg"
$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

$src = [System.Drawing.Image]::FromFile($srcPath)
$origW = $src.Width
$origH = $src.Height
Write-Host "Source Image Dimensions: $origW x $origH"

$destW = 1600
$destH = 300

# 1. Option 1: Top-focused Crop (Captures the Logo, Archer bow aim, Zombie King face, and blood moon)
# Source crop rectangle: take full width $origW, and height = $origW * (300 / 1600) = $origW * 0.1875
$cropH = [int]($origW * ($destH / $destW))
# Focus slightly below extreme top to center the logo and zombie face nicely
$cropY = [int]($origH * 0.05)
if ($cropY + $cropH -gt $origH) {
    $cropY = $origH - $cropH
}

$bmp1 = New-Object System.Drawing.Bitmap($destW, $destH)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g1.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle(0, $cropY, $origW, $cropH)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $destW, $destH)
$g1.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$outPath1 = Join-Path $outDir "cover_1600x300.png"
$bmp1.Save($outPath1, [System.Drawing.Imaging.ImageFormat]::Png)

$g1.Dispose()
$bmp1.Dispose()
$src.Dispose()

Write-Host "✅ Generated: cover_1600x300.png"
