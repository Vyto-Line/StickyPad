# Downloads a private copy of Node.js (LTS) into the folder given by -Dest. No administrator rights needed.
# The download is checked against the checksum nodejs.org publishes before it is used.
param([string]$Dest)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
  $v = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version      # newest LTS, for example v22.11.0
  if (-not $v) { throw 'Could not find the current Node.js LTS version.' }
  $name = "node-$v-win-$arch"; $base = "https://nodejs.org/dist/$v"
  $tmp = Join-Path $env:TEMP 'stickypad-node'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  New-Item -ItemType Directory -Force $tmp | Out-Null
  $zip = Join-Path $tmp "$name.zip"
  Write-Host "Downloading Node.js $v ..."
  Invoke-WebRequest "$base/$name.zip" -OutFile $zip -UseBasicParsing
  $sums = [string](Invoke-WebRequest "$base/SHASUMS256.txt" -UseBasicParsing).Content
  $line = $sums -split "`n" | Where-Object { $_ -match ("  " + [regex]::Escape("$name.zip") + "\s*$") } | Select-Object -First 1
  $want = ($line -split '\s+')[0]
  $got = (Get-FileHash $zip -Algorithm SHA256).Hash
  if (-not $want -or $want.ToLower() -ne $got.ToLower()) { throw 'The downloaded file did not match its checksum, so it was not used.' }
  Write-Host 'Unpacking ...'
  Expand-Archive $zip -DestinationPath $tmp -Force
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  Move-Item (Join-Path $tmp $name) $Dest
  Remove-Item $tmp -Recurse -Force
  Write-Host 'Node.js is ready.'
} catch {
  Write-Host "Could not download Node.js: $_"
  exit 1
}
