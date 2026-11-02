Add-Type -AssemblyName System.Drawing

$srcIcon = "C:\Users\laksh\.gemini\antigravity-ide\brain\76169818-15a7-4e00-b3dc-9122d1fdd605\.user_uploaded\media_1793531308115.jpg"
$srcCover = "d:\Experiment\ragdoll-archers\arrow-storm-zombie-siege-cover-1920x1080.png"
$outDir = "d:\Experiment\ragdoll-archers\meta-assets"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

function Resize-ImageFile {
    param(
        [string]$sourcePath,
        [int]$width,
        [int]$height,
        [string]$outputFilename
    )
    $source = [System.Drawing.Image]::FromFile($sourcePath)
    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($source, 0, 0, $width, $height)
    
    $outputPath = Join-Path $outDir $outputFilename
    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destBmp.Dispose()
    $source.Dispose()
    Write-Host "✅ Created: $outputFilename ($width x $height)"
}

# 1. App Icons
Resize-ImageFile -sourcePath $srcIcon -width 1024 -height 1024 -outputFilename "app_icon_1024x1024.png"
Resize-ImageFile -sourcePath $srcIcon -width 16 -height 16 -outputFilename "small_app_icon_16x16.png"

# 2. Cover / Banner
Resize-ImageFile -sourcePath $srcCover -width 1200 -height 628 -outputFilename "cover_1200x628.png"
Resize-ImageFile -sourcePath $srcCover -width 1920 -height 1080 -outputFilename "banner_1920x1080.png"
