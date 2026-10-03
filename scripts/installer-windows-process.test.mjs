import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const installer = await readFile(path.join(root, "scripts/Install DSH Vibeify.ps1"), "utf8");
const functions = installer.slice(installer.indexOf("function Get-LocalListenerIds"), installer.indexOf("function Install-ImmutableDshPlugin"));
let powershell;
for (const candidate of ["pwsh", ...(process.platform === "win32" ? ["powershell.exe"] : [])]) {
  try {
    await exec(candidate, ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"], { timeout: 5_000 });
    powershell = candidate;
    break;
  } catch {}
}
const requiresPowerShell = { skip: !powershell && "PowerShell is unavailable; native process-guard execution remains unverified" };

async function runGuard(t, scenario) {
  const directory = await mkdtemp(path.join(tmpdir(), "vibeify-windows-guard-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "guard.ps1");
  await writeFile(filename, `$ErrorActionPreference = 'Stop'
$Port = 3080
$ProfileName = 'web'
${functions}
$script:events = @()
$script:stopped = $false
$script:inventoryCalls = 0
$script:identityCalls = 0
function Test-LocalDsh { return $false }
function Start-Sleep { }
function Write-Host { }
function Get-LocalListenerIds {
  $script:inventoryCalls++
  if ($script:stopped) { return @() }
  return @(42)
}
function Get-DshListenerIdentity([int]$ListenerId) {
  $script:identityCalls++
  $script:events += 'identity'
  return [pscustomobject]@{ ProcessId = $ListenerId; CreationDate = 'original'; CommandLine = 'dsh'; ExecutablePath = 'node.exe'; OwnerSid = 'current-user' }
}
function Read-Host { $script:events += 'confirm'; return 'YES' }
function Stop-Process([int]$Id) {
  $script:events += "stop:$Id"
  $script:stopped = $true
}
${scenario}
`, "utf8");
  return exec(powershell, ["-NoProfile", "-NonInteractive", "-File", filename], { timeout: 10_000 });
}

test("Windows guard explicit YES rechecks identity before stopping only the listener PID", requiresPowerShell, async (t) => {
  const { stdout } = await runGuard(t, `
if (-not (Confirm-IdleDshUpdate)) { throw 'Expected permission to proceed' }
if (($script:events -join ',') -cne 'identity,confirm,identity,identity,stop:42') { throw "Unexpected sequence: $script:events" }
Write-Output 'PASS'
`);
  assert.match(stdout, /PASS/);
});

test("Windows guard decline leaves the listener unchanged", requiresPowerShell, async (t) => {
  const { stdout } = await runGuard(t, `
function Read-Host { $script:events += 'confirm'; return 'no' }
if (Confirm-IdleDshUpdate) { throw 'Decline must not proceed' }
if ($script:stopped -or ($script:events -join ',') -cne 'identity,confirm') { throw 'Decline stopped or changed a process' }
Write-Output 'PASS'
`);
  assert.match(stdout, /PASS/);
});

test("Windows guard refuses unrecognized listeners before prompting", requiresPowerShell, async (t) => {
  const { stdout } = await runGuard(t, `
function Get-DshListenerIdentity([int]$ListenerId) { throw 'unrecognized' }
try { Confirm-IdleDshUpdate | Out-Null; throw 'Expected refusal' } catch { if ($_.Exception.Message -cne 'unrecognized') { throw } }
if ($script:stopped -or $script:events.Count -ne 0) { throw 'Unrecognized listener was prompted or stopped' }
Write-Output 'PASS'
`);
  assert.match(stdout, /PASS/);
});

test("Windows guard refuses a changed listener set after confirmation", requiresPowerShell, async (t) => {
  const { stdout } = await runGuard(t, `
function Get-LocalListenerIds { $script:inventoryCalls++; if ($script:inventoryCalls -eq 1) { return @(42) }; return @(43) }
try { Confirm-IdleDshUpdate | Out-Null; throw 'Expected refusal' } catch { if ($_.Exception.Message -notlike '*listener changed*') { throw } }
if ($script:stopped) { throw 'Changed listener was stopped' }
Write-Output 'PASS'
`);
  assert.match(stdout, /PASS/);
});

test("Windows guard refuses a reused PID after confirmation", requiresPowerShell, async (t) => {
  const { stdout } = await runGuard(t, `
function Get-DshListenerIdentity([int]$ListenerId) {
  $script:identityCalls++
  $creation = if ($script:identityCalls -eq 1) { 'original' } else { 'replacement' }
  return [pscustomobject]@{ ProcessId = $ListenerId; CreationDate = $creation; CommandLine = 'dsh'; ExecutablePath = 'node.exe'; OwnerSid = 'current-user' }
}
try { Confirm-IdleDshUpdate | Out-Null; throw 'Expected refusal' } catch { if ($_.Exception.Message -notlike '*process changed*') { throw } }
if ($script:stopped) { throw 'Reused PID was stopped' }
Write-Output 'PASS'
`);
  assert.match(stdout, /PASS/);
});

test("Windows process guard parses as PowerShell without installing or starting anything", requiresPowerShell, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "vibeify-windows-parser-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "parse.ps1");
  await writeFile(filename, `$tokens = $null; $errors = $null;
    [System.Management.Automation.Language.Parser]::ParseFile($args[0], [ref]$tokens, [ref]$errors) | Out-Null;
    if ($errors.Count -gt 0) { throw ($errors | Out-String) }; Write-Output 'PASS'`);
  const { stdout } = await exec(powershell, ["-NoProfile", "-NonInteractive", "-File", filename, path.join(root, "scripts/Install DSH Vibeify.ps1")], { timeout: 10_000 });
  assert.match(stdout, /PASS/);
});

test("Windows identity guard requires the actual DSH launcher, current owner, matching profile and port", {
  skip: !powershell || process.platform !== "win32" ? "Windows PowerShell host is required to verify native path and SID identity checks" : false,
}, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "vibeify-windows-identity-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "identity.ps1");
  await writeFile(filename, `$ErrorActionPreference = 'Stop'
$Port = 3080
$ProfileName = 'web'
${functions}
$env:USERPROFILE = Join-Path $PSScriptRoot 'user'
$runtimePath = Join-Path $env:USERPROFILE 'npm\\node_modules\\@deepseek-ai\\dsh'
New-Item -ItemType Directory -Path (Join-Path $runtimePath 'lib') -Force | Out-Null
Set-Content -LiteralPath (Join-Path $runtimePath 'package.json') -Value '{"name":"@deepseek-ai/dsh","bin":{"dsh":"lib/bin.js"}}'
$nodePath = Join-Path $env:USERPROFILE 'node.exe'
$entryPath = Join-Path $runtimePath 'lib\\bin.js'
$validCommand = '"' + $nodePath + '" "' + $entryPath + '" --profile web --no-open --host 127.0.0.1 --port 3080'
$script:process = [pscustomobject]@{ CommandLine = $validCommand; ExecutablePath = $nodePath; CreationDate = 'original' }
$script:owner = [pscustomobject]@{ ReturnValue = 0; Sid = 'current-user' }
function Get-CurrentUserSid { return 'current-user' }
function Get-CimInstance { return $script:process }
function Invoke-CimMethod { return $script:owner }
function Assert-Refused {
  try { Get-DshListenerIdentity 42 | Out-Null; throw 'EXPECTED_REFUSAL' }
  catch { if ($_.Exception.Message -ceq 'EXPECTED_REFUSAL') { throw } }
}
$identity = Get-DshListenerIdentity 42
if ($identity.ProcessId -ne 42) { throw 'Valid runtime was refused' }
$script:owner.Sid = 'another-user'; Assert-Refused; $script:owner.Sid = 'current-user'
$script:owner.ReturnValue = 1; Assert-Refused; $script:owner.ReturnValue = 0
$script:process.ExecutablePath = Join-Path $env:USERPROFILE 'other.exe'; Assert-Refused; $script:process.ExecutablePath = $nodePath
$script:process.CommandLine = $validCommand.Replace('--profile web', '--profile private'); Assert-Refused
$script:process.CommandLine = $validCommand.Replace('--port 3080', '--port 3099'); Assert-Refused
$script:process.CommandLine = $validCommand + ' --patch unknown.yml'; Assert-Refused
$script:process.CommandLine = $validCommand + ' --port 3080'; Assert-Refused
$script:process.CommandLine = $validCommand.Replace('lib\\bin.js', 'lib\\other.js'); Assert-Refused
$script:process.CommandLine = $validCommand
Set-Content -LiteralPath (Join-Path $runtimePath 'package.json') -Value '{"name":"unrelated","bin":{"dsh":"lib/bin.js"}}'; Assert-Refused
Write-Output 'PASS'
`, "utf8");
  const { stdout } = await exec(powershell, ["-NoProfile", "-NonInteractive", "-File", filename], { timeout: 10_000 });
  assert.match(stdout, /PASS/);
});
