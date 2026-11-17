# D246: only read live CLI plugin-list JSON after writes; no mutation retry.
# Pure predicate keeps exact SEC02 forbidden IDs and own Hello invariant.
function Test-D246StockPluginSnapshot {
  param([AllowNull()]$Snapshot)
  if ($null -eq $Snapshot -or $null -eq $Snapshot.PSObject.Properties['plugins'] -or $null -eq $Snapshot.plugins) { return $false }
  $plugins = @($Snapshot.plugins)
  foreach ($id in @('account-pool','bb--mcp','connect','bb--connect-next','memory')) {
    $found = @($plugins | Where-Object { $null -ne $_ -and $null -ne $_.PSObject.Properties['id'] -and $_.id -ceq $id })
    if ($found.Count -gt 1) { throw 'D126 ambiguous forbidden ID' }
    if ($found.Count -eq 1) {
      $entry = $found[0]
      if ($null -eq $entry.PSObject.Properties['enabled'] -or $null -eq $entry.PSObject.Properties['status'] -or
          $entry.enabled -cne $false -or $entry.status -cne 'disabled') { return $false }
    }
  }
  $hello = @($plugins | Where-Object { $null -ne $_ -and $null -ne $_.PSObject.Properties['id'] -and $_.id -ceq 'suliko-hello' })
  if ($hello.Count -ne 1 -or $null -eq $hello[0].PSObject.Properties['enabled'] -or $hello[0].enabled -cne $true) { return $false }
  return $true
}
# D246 only source-defined public categories; never print plugin JSON/secret/path/unknown IDs.
function Get-D246PublicStateCategory {
  param([AllowNull()]$Snapshot)
  if ($null -eq $Snapshot -or $null -eq $Snapshot.PSObject.Properties['plugins'] -or $null -eq $Snapshot.plugins) {
    return 'json-or-cli-unavailable'
  }
  $plugins = @($Snapshot.plugins)
  foreach ($id in @('account-pool','bb--mcp','connect','bb--connect-next','memory')) {
    $found = @($plugins | Where-Object { $null -ne $_ -and $null -ne $_.PSObject.Properties['id'] -and $_.id -ceq $id })
    if ($found.Count -gt 1) { return 'forbidden-duplicate' }
    if ($found.Count -eq 1) {
      if ($null -eq $found[0].PSObject.Properties['enabled'] -or $found[0].enabled -cne $false) { return 'forbidden-enabled-or-unknown' }
      if ($null -eq $found[0].PSObject.Properties['status'] -or $found[0].status -cne 'disabled') { return 'forbidden-status-not-disabled' }
    }
  }
  $hello = @($plugins | Where-Object { $null -ne $_ -and $null -ne $_.PSObject.Properties['id'] -and $_.id -ceq 'suliko-hello' })
  if ($hello.Count -ne 1) { return 'hello-missing-or-duplicate' }
  if ($null -eq $hello[0].PSObject.Properties['enabled'] -or $hello[0].enabled -cne $true) { return 'hello-not-enabled' }
  return 'safe'
}
function Wait-D246StockPluginState {
  param(
    [Parameter(Mandatory=$true)][scriptblock]$Read,
    [ValidateRange(2,30)][int]$MaxAttempts = 21,
    [ValidateRange(0,2000)][int]$DelayMilliseconds = 1500
  )
  $successive = 0
  $lastCategory = 'no-snapshot-yet'
  for ($attempt=0; $attempt -lt $MaxAttempts; $attempt++) {
    $snapshot = & $Read
    if (Test-D246StockPluginSnapshot -Snapshot $snapshot) {
      $successive++
      if ($successive -ge 2) { return $snapshot }
    } else {
      $successive = 0
      $lastCategory = Get-D246PublicStateCategory -Snapshot $snapshot
    }
    if ($attempt -lt $MaxAttempts-1 -and $DelayMilliseconds -gt 0) {
      Start-Sleep -Milliseconds $DelayMilliseconds
    }
  }
  throw ('D126 unsafe stock plugin state; D246 bounded reason=' + $lastCategory)
}
