# Suliko E1 preflight: official Windows x64 BB asset only; no execution/install.
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$DownloadVerified,
  [switch]$Uninstall,
  [string]$VerifyFile
)
$ErrorActionPreference = 'Stop'
$modes = [int]$DryRun.IsPresent + [int]$DownloadVerified.IsPresent + [int]$Uninstall.IsPresent + [int](-not [string]::IsNullOrEmpty($VerifyFile))
if ($modes -gt 1) { throw 'Choose only one mode' }
if (-not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
  throw 'Only Windows x64 is supported in this preview'
}
$asset = 'bb-0.49.0-x64.exe'
$sha = '201b38136c30f37d17ee5fea88c7a91dde64e00ca4e583dfd5b3650e65c6aa2f'
$url = "https://github.com/get-bb/bb/releases/download/desktop-v0.49.0/$asset"
$cache = Join-Path $env:LOCALAPPDATA 'SulikoIDE\Cache'
$dest = Join-Path $cache $asset
function Assert-ManagedCachePath {
  # Never follow a reparse-point/junction parent to remove unrelated data.
  foreach ($path in @((Join-Path $env:LOCALAPPDATA 'SulikoIDE'), $cache)) {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
    if ($null -ne $item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
      throw 'Refusing redirected Suliko cache path'
    }
  }
}
function Assert-Hash([string]$Path) {
  $item = Get-Item -LiteralPath $Path -ErrorAction Stop
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Expected a regular file, not a directory or symlink'
  }
  $got = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($got -cne $sha) { throw 'SHA-256 mismatch; file rejected' }
  Write-Output 'Official release SHA-256 verified'
}
if ($Uninstall) {
  Assert-ManagedCachePath
  if (Test-Path -LiteralPath $dest -PathType Leaf) { Remove-Item -LiteralPath $dest -Force }
  if (Test-Path -LiteralPath $cache -PathType Container) {
    if (@(Get-ChildItem -LiteralPath $cache -Force).Count -eq 0) { Remove-Item -LiteralPath $cache }
  }
  Write-Output 'Suliko download cache cleanup finished; BB user data untouched.'
} elseif ($DownloadVerified) {
  Assert-ManagedCachePath
  New-Item -ItemType Directory -Path $cache -Force | Out-Null
  $tmp = Join-Path $cache ([guid]::NewGuid().ToString('n') + '.download')
  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -MaximumRedirection 5
    Assert-Hash $tmp
    Move-Item -LiteralPath $tmp -Destination $dest -Force
    Write-Output "Verified official BB asset saved at: $dest"
    Write-Output 'It was NOT executed or installed.'
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} elseif (-not [string]::IsNullOrEmpty($VerifyFile)) {
  Assert-Hash $VerifyFile
} else {
  Write-Output "PREVIEW ONLY | official BB 0.49.0 | asset: $asset"
  Write-Output 'A real install, plugin configuration, and service changes are NOT implemented.'
}
