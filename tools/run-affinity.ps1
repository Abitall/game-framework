param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("p", "e", "all")]
  [string]$Class,
  [Parameter(Mandatory = $true)]
  [string]$Command
)

# Intel i5-14600KF: 6 P-cores with HT (logical 0-11) + 8 E-cores (logical 12-19).
# Fast shards (random/passive) go to E-cores; long shards (perfect/mixed) to
# P-cores. Child processes inherit this affinity.
$mask = switch ($Class) {
  "p" { 0x000FFF }
  "e" { 0xFF000 }
  default { 0x0FFFFF }
}
try {
  [System.Diagnostics.Process]::GetCurrentProcess().ProcessorAffinity = [IntPtr]$mask
} catch {
  Write-Error "Could not set $Class affinity (0x$($mask.ToString('X'))): $_"
  exit 1
}

Write-Host "Affinity: $Class cores, mask 0x$($mask.ToString('X'))"
Invoke-Expression $Command
exit $LASTEXITCODE
