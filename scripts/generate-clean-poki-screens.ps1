Add-Type -AssemblyName System.Drawing

$outDir = "d:\Experiment\ragdoll-archers\poki-assets"

# Screenshot 1: Clean edge-to-edge gameplay with player, tower, flame arrow and jump controls
$src1 = "d:\Experiment\ragdoll-archers\Screenshot 2026-10-12 084556.png"
$img1 = [System.Drawing.Image]::FromFile($src1)
$img1.Save((Join-Path $outDir "poki_screenshot_1.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$img1.Dispose()

# Screenshot 2: Active night combat (X: 37, Y: 0, W: 715, H: 402)
$src2 = "d:\Experiment\ragdoll-archers\Screenshot 2026-10-05 204809.png"
$img2 = [System.Drawing.Image]::FromFile($src2)
$bmp2 = New-Object System.Drawing.Bitmap(715, 402)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$srcRect2 = New-Object System.Drawing.Rectangle(37, 0, 715, 402)
$g2.DrawImage($img2, 0, 0, $srcRect2, [System.Drawing.GraphicsUnit]::Pixel)
$bmp2.Save((Join-Path $outDir "poki_screenshot_2.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2.Dispose()
$img2.Dispose()

# Screenshot 3: Main Menu with Game Modes & Keybinds (X: 37, Y: 0, W: 715, H: 402)
$src3 = "d:\Experiment\ragdoll-archers\Screenshot 2026-10-05 204828.png"
$img3 = [System.Drawing.Image]::FromFile($src3)
$bmp3 = New-Object System.Drawing.Bitmap(715, 402)
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$srcRect3 = New-Object System.Drawing.Rectangle(37, 0, 715, 402)
$g3.DrawImage($img3, 0, 0, $srcRect3, [System.Drawing.GraphicsUnit]::Pixel)
$bmp3.Save((Join-Path $outDir "poki_screenshot_3.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$bmp3.Dispose()
$img3.Dispose()

Write-Host "✅ Created 3 clean Poki screenshots"
