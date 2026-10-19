$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$drive = $repo.Substring(0, 1).ToLowerInvariant()
$path = $repo.Substring(2).Replace("\", "/")
$wslRepo = "/mnt/$drive$path"

wsl -d Ubuntu -- bash -lc "sudo docker info >/dev/null 2>&1 || (sudo nohup dockerd >/tmp/dockerd.log 2>&1 & sleep 5)"
if ($LASTEXITCODE -ne 0) { throw "Unable to start Docker Engine in WSL." }

wsl -d Ubuntu -- bash -lc "cd '$wslRepo' && sudo -E /usr/bin/npx supabase start"
if ($LASTEXITCODE -ne 0) { throw "Unable to start Supabase local." }
