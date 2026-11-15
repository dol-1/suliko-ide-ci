# D202 free Windows-2025 synthetic mutation/refusal fixture ONLY.
# No real BB installer, executable launch, user directory or real credentials.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:GITHUB_REPOSITORY -cne 'dol-1/suliko-ide-ci' -or $env:RUNNER_OS -cne 'Windows') { throw 'D202 test is public Windows CI only' }
$original = $env:LOCALAPPDATA
$testRoot = Join-Path $env:RUNNER_TEMP 'd202-owned-fake-local-appdata'
if (Test-Path -LiteralPath $testRoot) { throw 'D202 fixture root exists' }
$env:LOCALAPPDATA = $testRoot
$installRoot = Join-Path $testRoot 'SulikoIDE'
$installTarget = Join-Path $installRoot 'InstalledBB'
$owner = Join-Path $installRoot '.suliko-installed-bb-0.49.0-x64.sha256'
$installer = Join-Path $installTarget 'Uninstall bb.exe'
$exe = Join-Path $installTarget 'bb.exe'
$userData = Join-Path $installRoot 'UserData'
$setup = Join-Path $PSScriptRoot 'suliko-setup.ps1'
$sha = '201b38136c30f37d17ee5fea88c7a91dde64e00ca4e583dfd5b3650e65c6aa2f'
try {
  New-Item -ItemType Directory -Force -Path $installTarget,$userData | Out-Null
  [IO.File]::WriteAllText($installer,'synthetic-not-a-real-executable-original')
  [IO.File]::WriteAllText($exe,'synthetic-not-a-real-bb-exe')
  $sentinel = Join-Path $userData 'private-file-preserve.txt'
  [IO.File]::WriteAllText($sentinel,'keep-unchanged')
  $originalHash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText($owner, "SULIKO-IDE-USER-NSIS-v2 bb-0.49.0-x64.exe $sha uninstaller-sha256=$originalHash" + [Environment]::NewLine)
  # Tamper after owner marker was created; malicious executable MUST never run.
  [IO.File]::WriteAllText($installer,'synthetic-not-a-real-executable-TAMPERED')
  $output = & pwsh -NoProfile -NonInteractive -File $setup -Uninstall 2>&1 | Out-String
  $exit = $LASTEXITCODE
  if ($exit -eq 0 -or -not $output.Contains('D202 refused changed uninstaller executable')) { throw 'D202 did not fail before starting a modified uninstaller' }
  if (-not (Test-Path -LiteralPath $installer) -or -not (Test-Path -LiteralPath $owner) -or -not (Test-Path -LiteralPath $exe)) { throw 'D202 mutated or removed foreign files' }
  if (([IO.File]::ReadAllText($sentinel)) -cne 'keep-unchanged') { throw 'D202 touched user data' }
  # Legacy/v1 owner markers cannot authorize an unverified uninstaller.
  [IO.File]::WriteAllText($owner,"SULIKO-IDE-USER-NSIS-v1 bb-0.49.0-x64.exe $sha" + [Environment]::NewLine)
  $oldOutput = & pwsh -NoProfile -NonInteractive -File $setup -Uninstall 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0 -or -not $oldOutput.Contains('Invalid installed-app ownership marker')) { throw 'D202 legacy marker accidentally allowed unverified uninstaller' }
  if (-not (Test-Path -LiteralPath $installer) -or -not (Test-Path -LiteralPath $owner) -or ([IO.File]::ReadAllText($sentinel)) -cne 'keep-unchanged') { throw 'D202 legacy marker did not preserve user data' }
  Write-Output 'D202 synthetic tampered-uninstaller and legacy-v1 marker rejected before execution; user data unchanged.'
} finally {
  $env:LOCALAPPDATA = $original
  # Synthetic files persist only for this disposable GitHub-hosted runner lifetime.
}
