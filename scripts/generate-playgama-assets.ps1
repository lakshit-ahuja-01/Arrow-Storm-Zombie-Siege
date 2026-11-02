Add-Type -AssemblyName System.Drawing

$outDir = "d:\Experiment\ragdoll-archers\playgama-assets"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

function Resize-Image($srcPath, $dstPath, $targetW, $targetH) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap $targetW, $targetH
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $targetW, $targetH)
    $dest.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Created: $dstPath ($targetW x $targetH)"
}

# 1. Square 1:1 -> 800x800
Resize-Image "d:\Experiment\ragdoll-archers\meta-assets\app_icon_1024x1024.png" "$outDir\cover_square_800x800.png" 800 800

# 2. Copy portrait 1080x1920
Copy-Item "d:\Experiment\ragdoll-archers\meta-assets\portrait_banner_1080x1920.png" "$outDir\cover_portrait_1080x1920.png" -Force
Write-Host "Copied portrait: $outDir\cover_portrait_1080x1920.png"

# 3. Copy landscape 1920x1080
Copy-Item "d:\Experiment\ragdoll-archers\meta-assets\large_banner_1920x1080.png" "$outDir\cover_landscape_1920x1080.png" -Force
Write-Host "Copied landscape: $outDir\cover_landscape_1920x1080.png"
