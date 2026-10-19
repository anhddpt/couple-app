$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$drive = $repo.Substring(0, 1).ToLowerInvariant()
$path = $repo.Substring(2).Replace("\", "/")
$wslRepo = "/mnt/$drive$path"

wsl -d Ubuntu -- bash -lc "cd '$wslRepo' && sudo -E /usr/bin/npx supabase stop"
if ($LASTEXITCODE -ne 0) { throw "Unable to stop Supabase local." }
