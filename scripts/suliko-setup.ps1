# Suliko E1: official Windows x64 BB 0.49.0 verified preflight + explicit user-only experimental install.
# No service elevation, no BYO provider keys, no production claim; full E1/RC remains unapproved.
[CmdletBinding()]
param(
  [switch]$Help,
  [switch]$DryRun,
  [switch]$DownloadVerified,
  [switch]$Install,
  [switch]$AllowUnsignedVerified,
  [switch]$Uninstall,
  [string]$PluginSha,
  [string]$CandidateFile,
  [string]$VerifyFile
)
$ErrorActionPreference = 'Stop'
if ($Help) {
  if ($DryRun -or $DownloadVerified -or $Install -or $Uninstall -or $AllowUnsignedVerified -or
    -not [string]::IsNullOrEmpty($PluginSha) -or -not [string]::IsNullOrEmpty($CandidateFile) -or
    -not [string]::IsNullOrEmpty($VerifyFile)) { throw 'D178 help must be standalone' }
  Write-Output 'Suliko E1 Windows setup (experimental CI-only, no released beta).'
  Write-Output 'Official BB CLI on Windows: ONLY inside Ubuntu WSL2 (Linux paths); native PowerShell BB project-create is not supported.'
  Write-Output 'Official BB Desktop GUI: native Windows x64; official 0.49.0 installer is NotSigned, SHA-256 is not publisher signature.'
  Write-Output 'Modes: -DryRun, -DownloadVerified, -Install -AllowUnsignedVerified -PluginSha <SHA256> -CandidateFile <absolute path>, -Uninstall.'
  Write-Output 'CLI upstream: https://github.com/get-bb/bb/blob/desktop-v0.49.0/packages/bb-app/README.md'
  Write-Output 'No release, remote deployment, SEC04 signed review or beta approval is implied.'
  return
}
if (-not [string]::IsNullOrEmpty($PluginSha) -or -not [string]::IsNullOrEmpty($CandidateFile)) {
  if (-not $Install -or $PluginSha -cnotmatch '^[a-f0-9]{64}$' -or -not [IO.Path]::IsPathRooted($CandidateFile)) {
    throw 'D165 explicit candidate requires -Install, lowercase SHA256 and absolute local file'
  }
  $item = Get-Item -LiteralPath $CandidateFile -Force -ErrorAction Stop
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'D165 candidate symlink/nonregular refused' }
  $got = (Get-FileHash -LiteralPath $CandidateFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($got -cne $PluginSha) { throw 'D165 candidate digest mismatch: fail closed' }
  if ((& node --version) -cne 'v22.19.0') { throw 'D165 requires reviewed Node 22.19.0' }
}
$modes = [int]$DryRun.IsPresent + [int]$DownloadVerified.IsPresent + [int]$Install.IsPresent + [int]$Uninstall.IsPresent + [int](-not [string]::IsNullOrEmpty($VerifyFile))
if ($modes -gt 1) { throw 'Choose only one mode' }
if ($AllowUnsignedVerified -and -not $Install) { throw 'Unsigned opt-in is valid only with -Install' }
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
$installRoot = Join-Path $env:LOCALAPPDATA 'SulikoIDE'
$installTarget = Join-Path $installRoot 'InstalledBB'
$installedMarker = Join-Path $installRoot '.suliko-installed-bb-0.49.0-x64.sha256'
$installedRecord = "SULIKO-IDE-USER-NSIS-v1 $asset $sha"
function Assert-ManagedInstallPath {
  foreach ($path in @($env:LOCALAPPDATA, $installRoot, $installTarget)) {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
    if ($null -ne $item -and (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $item.PSIsContainer)) {
      throw 'Refusing linked/non-directory Suliko installation path'
    }
  }
  # NSIS /D is passed as one nonquoted argument, last, into a newly empty
  # user-only target. Reject ambiguous CLI paths instead of risking another path.
  if ($installTarget -match '[\s"]') { throw 'NSIS target path has unsupported whitespace/quote' }
}
function Assert-OwnInstalledMarker {
  $item = Get-Item -LiteralPath $installedMarker -Force -ErrorAction Stop
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Length -gt 256) {
    throw 'Refusing invalid installed-app ownership marker'
  }
  $record = [IO.File]::ReadAllText($installedMarker).TrimEnd([char[]]@("`r","`n"))
  if ($record -cne $installedRecord) { throw 'Invalid installed-app ownership marker' }
}

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
  $d165root = Join-Path $env:LOCALAPPDATA 'SulikoIDE\UserSetup'
  if (Test-Path -LiteralPath $d165root -PathType Container) {
    if ((& node --version) -cne 'v22.19.0') { throw 'Cannot safely uninstall tracked D165 provision without pinned Node' }
    & node (Join-Path $PSScriptRoot 'd165-user-provision.mjs') --uninstall
    if ($LASTEXITCODE -ne 0) { throw 'D165 owned provision cleanup failed' }
  }
  Assert-ManagedInstallPath
  Assert-ManagedCachePath
  if (Test-Path -LiteralPath $installedMarker -PathType Leaf) {
    Assert-OwnInstalledMarker
    $uninstaller = Join-Path $installTarget 'Uninstall bb.exe'
    $installedExe = Join-Path $installTarget 'bb.exe'
    foreach ($file in @($uninstaller, $installedExe)) {
      $item = Get-Item -LiteralPath $file -Force -ErrorAction Stop
      if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Refusing invalid installed-app executable path' }
    }
    $process = Start-Process -FilePath $uninstaller -ArgumentList @('/S') -Wait -PassThru
    if ($process.ExitCode -ne 0 -or (Test-Path -LiteralPath $installedExe)) { throw 'User-only NSIS uninstall did not finish cleanly' }
    [IO.File]::Delete($installedMarker)
  } elseif (Test-Path -LiteralPath $installTarget) { Write-Output 'Untracked installed app preserved; no adoption or deletion.' }
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
} elseif ($Install) {
  if (-not $AllowUnsignedVerified) {
    throw 'Official BB 0.49.0 Windows binary is Authenticode NotSigned. Explicit -AllowUnsignedVerified required; no publisher-signature assurance.'
  }
  Assert-ManagedInstallPath
  Assert-ManagedCachePath
  if (-not (Test-Path -LiteralPath $dest) -and -not (Test-Path -LiteralPath $marker)) {
    & $PSCommandPath -DownloadVerified | Out-Null
  }
  $markerItem = Get-Item -LiteralPath $marker -Force -ErrorAction Stop
  if ($markerItem.PSIsContainer -or ($markerItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid cached asset ownership marker' }
  if ([IO.File]::ReadAllText($marker).TrimEnd([char[]]@("`r","`n")) -cne $markerRecord) { throw 'Unowned cache asset refused' }
  Assert-Hash $dest | Out-Null
  Write-Output "D165_STAGE=official-cached-verified"
  $status = [string](Get-AuthenticodeSignature -LiteralPath $dest).Status
  if ($status -cne 'NotSigned') { throw 'Unexpected Windows official Authenticode status, refusing to execute' }
  if (Test-Path -LiteralPath $installTarget -ErrorAction SilentlyContinue -PathType Any) { throw 'Installation target already exists; no overwrite' }
  if (Test-Path -LiteralPath $installedMarker -ErrorAction SilentlyContinue -PathType Any) { throw 'Installation owner marker already exists; no overwrite' }
  New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
  Assert-ManagedInstallPath
  $process = Start-Process -FilePath $dest -ArgumentList @('/S',("/D=" + $installTarget)) -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw 'Official BB user-only NSIS install failed' }
  foreach ($name in @('bb.exe','Uninstall bb.exe')) {
    $item = Get-Item -LiteralPath (Join-Path $installTarget $name) -Force -ErrorAction Stop
    if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected installed-app executable type' }
  }
  # Exclusive owner marker, only after verified official install. On creation
  # failure preserve an untracked app rather than deleting foreign files.
  $stream = [IO.FileStream]::new($installedMarker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try { $writer = [IO.StreamWriter]::new($stream); try { $writer.WriteLine($installedRecord); $writer.Flush() } finally { $writer.Dispose() } } finally { $stream.Dispose() }
  if (-not [string]::IsNullOrEmpty($PluginSha)) {
    Write-Output "D165_STAGE=official-installed"
    Write-Output "D165_STAGE=provision-start"
    & node (Join-Path $PSScriptRoot 'd165-user-provision.mjs') --install --plugin-sha $PluginSha --candidate-file $CandidateFile
    if ($LASTEXITCODE -ne 0) { throw 'D165 end-user published CLI + verified candidate provisioning failed' }
    Write-Output 'D165 verified official GUI + published CLI SEC02 and Hello from explicit candidate digest; no released RC/SEC04/beta claim.'
  } else {
    Write-Output 'D141 verified NotSigned official BB installed in current-user space; launcher only. No provider keys, marketplace RC, public beta or SEC02 claim.'
  }
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
