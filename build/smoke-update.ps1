$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') {
  throw 'Run this installation smoke test only on a disposable GitHub Actions runner.'
}

$installers = @(Get-ChildItem dist/*-Setup-*.exe)
if ($installers.Count -ne 1) { throw 'Expected exactly one installer.' }
$installDir = Join-Path $env:RUNNER_TEMP 'nimbo-update-smoke'
$expectedAsar = (Get-FileHash 'dist/win-unpacked/resources/app.asar' -Algorithm SHA256).Hash

# Exercise both a fresh silent install and an in-place update. Omitting
# --force-run keeps the UI closed on CI; the application updater supplies it.
foreach ($pass in 1..2) {
  $installer = Start-Process -FilePath $installers[0].FullName -ArgumentList @('/S', '--updated', "/D=$installDir") -PassThru
  if (-not $installer.WaitForExit(120000)) {
    Stop-Process -Id $installer.Id -Force -ErrorAction SilentlyContinue
    throw "Silent install/update did not finish (pass $pass)."
  }
  $installer.Refresh()
  if ($installer.ExitCode -ne 0) { throw "Installer exit code: $($installer.ExitCode) (pass $pass)." }
  if (-not (Test-Path (Join-Path $installDir 'Nimbo.exe'))) { throw 'Installed Nimbo.exe missing.' }
  $actualAsar = (Get-FileHash (Join-Path $installDir 'resources/app.asar') -Algorithm SHA256).Hash
  if ($actualAsar -ne $expectedAsar) { throw 'Installed application differs from the build.' }
  if (-not (Test-Path (Join-Path $installDir 'resources/app-update.yml'))) { throw 'Update provider config missing.' }
  Write-Host "Silent install/update passed (pass $pass)."
}
