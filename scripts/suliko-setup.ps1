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
$marker = Join-Path $cache ('.suliko-managed-' + $asset + '.sha256')
$markerRecord = "SULIKO-IDE-VERIFIED-v1 $asset $sha"
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
  # Matching owner record AND verified bytes are mandatory to delete a cache asset.
  $markerItem = Get-Item -LiteralPath $marker -Force -ErrorAction SilentlyContinue
  if ($null -ne $markerItem) {
    if ($markerItem.PSIsContainer -or ($markerItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
      throw 'Refusing nonregular ownership marker'
    }
    $record = [IO.File]::ReadAllText($marker).TrimEnd([char[]]@("`r","`n"))
    if ($record -cne $markerRecord) { throw 'Unrecognized ownership marker; preserving cache' }
    # For matching records, refuse changed/missing/corrupted/redirected payloads.
    Assert-Hash $dest | Out-Null
    [IO.File]::Delete($dest)
    [IO.File]::Delete($marker)
  }
  if (Test-Path -LiteralPath $cache -PathType Container) {
    if (@(Get-ChildItem -LiteralPath $cache -Force).Count -eq 0) { Remove-Item -LiteralPath $cache }
  }
  Write-Output 'Suliko tracked cache cleanup finished; untracked files and BB user data untouched.'
} elseif ($DownloadVerified) {
  Assert-ManagedCachePath
  # Never overwrite an existing same-name user file or stale ownership record.
  if ($null -ne (Get-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue) -or
      $null -ne (Get-Item -LiteralPath $marker -Force -ErrorAction SilentlyContinue)) {
    throw 'Cache target already exists; refusing overwrite'
  }
  New-Item -ItemType Directory -Path $cache -Force | Out-Null
  $tmp = Join-Path $cache ([guid]::NewGuid().ToString('n') + '.download')
  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -MaximumRedirection 5
    Assert-Hash $tmp
    # .NET Move without overwrite is a same-volume atomic no-clobber create.
    [IO.File]::Move($tmp, $dest)
    # CreateNew refuses any concurrent/forged marker. If this fails, the
    # untracked verified file is deliberately left behind, never auto-deleted.
    $stream = [IO.FileStream]::new($marker, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
      $writer = [IO.StreamWriter]::new($stream)
      try { $writer.WriteLine($markerRecord); $writer.Flush() }
      finally { $writer.Dispose() }
    } finally { $stream.Dispose() }
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
