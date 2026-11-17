# D246 disposable public CI-only negative fixtures: no real BB, registry, disk, credentials, or network.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:GITHUB_REPOSITORY -cne 'dol-1/suliko-ide-ci' -or $env:RUNNER_OS -cne 'Windows') {
  throw 'D246 synthetic fixture must run only on public Windows CI'
}
. (Join-Path $PSScriptRoot 'd246-stock-state-readiness.ps1')
function Snapshot([string]$Json) { ConvertFrom-Json -InputObject $Json -ErrorAction Stop }
$safe = Snapshot '{"plugins":[{"id":"connect","enabled":false,"status":"disabled"},{"id":"memory","enabled":false,"status":"disabled"},{"id":"suliko-hello","enabled":true,"status":"loaded"}]}'
$pending = Snapshot '{"plugins":[{"id":"connect","enabled":false,"status":"disabling"},{"id":"memory","enabled":false,"status":"disabled"},{"id":"suliko-hello","enabled":true,"status":"loaded"}]}'
$enabled = Snapshot '{"plugins":[{"id":"connect","enabled":true,"status":"loaded"},{"id":"suliko-hello","enabled":true,"status":"loaded"}]}'
$duplicate = Snapshot '{"plugins":[{"id":"connect","enabled":false,"status":"disabled"},{"id":"connect","enabled":false,"status":"disabled"},{"id":"suliko-hello","enabled":true,"status":"loaded"}]}'
$noHello = Snapshot '{"plugins":[{"id":"connect","enabled":false,"status":"disabled"}]}'
if (-not (Test-D246StockPluginSnapshot $safe)) { throw 'D246 rejected known-good strict stock state' }
foreach ($bad in @($pending, $enabled, $noHello, $null)) {
  if (Test-D246StockPluginSnapshot $bad) { throw 'D246 accepted unsafe or incomplete stock state' }
}
$duplicateRejected = $false
try { $null = Test-D246StockPluginSnapshot $duplicate } catch {
  $duplicateRejected = $_.Exception.Message -match 'D126 ambiguous forbidden ID'
}
if (-not $duplicateRejected) { throw 'D246 duplicate forbidden plugin must fail immediately' }
$script:d246Calls = 0
$poll = {
  $script:d246Calls++
  if ($script:d246Calls -eq 1) { return $pending }
  return $safe
}
$verified = Wait-D246StockPluginState -Read $poll -MaxAttempts 4 -DelayMilliseconds 0
if ($script:d246Calls -ne 3 -or -not (Test-D246StockPluginSnapshot $verified)) {
  throw 'D246 did not require two consecutive exact safe snapshots after transitional state'
}
$script:d246Calls = 0
$neverSafe = { $script:d246Calls++; return $pending }
$timedOut = $false
try { $null = Wait-D246StockPluginState -Read $neverSafe -MaxAttempts 3 -DelayMilliseconds 0 } catch {
  $timedOut = $_.Exception.Message -match 'D126 unsafe stock plugin state'
}
if (-not $timedOut -or $script:d246Calls -ne 3) { throw 'D246 failed to refuse persistent unsafe state at bounded deadline' }

if ((Get-D246PublicStateCategory -Snapshot $pending) -cne 'forbidden-status-not-disabled' -or
    (Get-D246PublicStateCategory -Snapshot $enabled) -cne 'forbidden-enabled-or-unknown' -or
    (Get-D246PublicStateCategory -Snapshot $noHello) -cne 'hello-missing-or-duplicate' -or
    (Get-D246PublicStateCategory -Snapshot $null) -cne 'json-or-cli-unavailable') {
  throw 'D246 categories must be fixed allowlisted and correct'
}
Write-Output 'D246 fixture: strict disabled and Hello predicates, immediate duplicate refusal, two stable observations and bounded fail-closed PASS'
