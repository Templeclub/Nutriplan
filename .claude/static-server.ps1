# Serveur statique sans dépendance, pour prévisualiser NutriPlan (pas de Node/Python
# sur cette machine). Sert le dossier du projet sur http://localhost:8766/.
param([int]$Port = 8766)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$port = $Port
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/"
$types = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8';
  '.js'='application/javascript; charset=utf-8'; '.mjs'='application/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.webmanifest'='application/manifest+json; charset=utf-8';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif';
  '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.ttf'='font/ttf'; '.otf'='font/otf'; '.woff'='font/woff'; '.woff2'='font/woff2'
}
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
    $file = Join-Path $root $path
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
      # sw.js doit rester servi avec un scope racine valide (Service-Worker-Allowed).
      if ($path -eq 'sw.js') { $ctx.Response.Headers.Add('Service-Worker-Allowed','/') }
      $ctx.Response.Headers.Add('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
      $ctx.Response.Headers.Add('Pragma','no-cache')
      $ctx.Response.Headers.Add('Expires','0')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch { }
}
