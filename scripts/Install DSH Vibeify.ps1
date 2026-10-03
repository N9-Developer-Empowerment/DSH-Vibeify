[CmdletBinding()]
param(
  [switch]$Check,
  [string]$SourceDirectory = $env:DSH_VIBEIFY_SOURCE_DIRECTORY,
  [ValidateSet("deepseek", "chatgpt", "both", "later")]
  [string]$Provider
)

$ErrorActionPreference = "Stop"
$RepositoryArchive = "https://github.com/N9-Developer-Empowerment/DSH-Vibeify/archive/refs/heads/main.zip"
$FaqUrl = "https://github.com/N9-Developer-Empowerment/DSH-Vibeify/blob/main/docs/FAQ.md"
$ProfileName = if ($env:DSH_PROFILE) { $env:DSH_PROFILE } else { "web" }
$Port = if ($env:DSH_PORT) { [int]$env:DSH_PORT } else { 3080 }

function Show-HelpLinks {
  Write-Host ""
  Write-Host "Help: $FaqUrl"
  Write-Host "Free chat help: DeepSeek https://chat.deepseek.com/ | ChatGPT https://chatgpt.com/ | Gemini https://gemini.google.com/"
  Write-Host "Never paste an API key, password, cookie, token, private prompt, DSH profile, or full log into a support chat."
}

function Stop-WithHelp([string]$Message) {
  $safeMessage = $Message
  if ($env:USERPROFILE) { $safeMessage = $safeMessage.Replace($env:USERPROFILE, "<home>") }
  Write-Host ""
  Write-Host "Installation stopped: $safeMessage" -ForegroundColor Red
  Show-HelpLinks
  exit 1
}

function Assert-Native([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

function Test-LocalDsh {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $connect = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(500)) { return $false }
    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

# Enumerate actual listening PIDs rather than stopping every process named node.
function Get-LocalListenerIds {
  @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Where-Object { $_.LocalPort -eq $Port } |
    Select-Object -ExpandProperty OwningProcess -Unique | Sort-Object)
}

function Get-CurrentUserSid {
  [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
}

function Get-DshListenerIdentity([int]$ListenerId) {
  $process = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $ListenerId" -ErrorAction Stop
  if (-not $process -or -not $process.CommandLine -or -not $process.ExecutablePath -or -not $process.CreationDate) {
    throw "The listener on port $Port could not be identified. Close it yourself before updating; nothing was installed."
  }
  $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid -ErrorAction Stop
  if ($owner.ReturnValue -ne 0 -or $owner.Sid -ne (Get-CurrentUserSid)) {
    throw "The listener on port $Port belongs to another or unknown Windows user. This helper will not stop it."
  }
  if ([System.IO.Path]::GetFileName($process.ExecutablePath) -ine "node.exe") {
    throw "The listener on port $Port is not a recognized DSH Node process. This helper will not stop it."
  }
  $command = [regex]::Match($process.CommandLine, '^\s*(?:"(?<node>[^"\r\n]+)"|(?<node>[^\s"]+))\s+(?:"(?<entry>[^"\r\n]+)"|(?<entry>[^\s"]+))(?<args>.*)$')
  if (-not $command.Success) { throw "The DSH command could not be safely identified. Close DSH yourself before updating." }
  $nodePath = [System.IO.Path]::GetFullPath($command.Groups['node'].Value)
  $entryPath = [System.IO.Path]::GetFullPath($command.Groups['entry'].Value)
  $userRoot = [System.IO.Path]::GetFullPath($env:USERPROFILE).TrimEnd('\') + '\'
  if ($nodePath -ine $process.ExecutablePath -or
      -not $entryPath.StartsWith($userRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
      $entryPath -notmatch '(?i)[\\/]node_modules[\\/]@deepseek-ai[\\/]dsh[\\/]lib[\\/]bin\.js$') {
    throw "The listener is not a recognized user-local DSH launcher. Close it yourself before updating."
  }
  $packagePath = Join-Path (Split-Path (Split-Path $entryPath -Parent) -Parent) "package.json"
  $runtime = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
  if ($runtime.name -cne "@deepseek-ai/dsh" -or $runtime.bin.dsh -cne "lib/bin.js") {
    throw "The listener's launcher is not the DSH runtime package. This helper will not stop it."
  }
  # Accept only the launch forms emitted by this installer; unknown overlays or
  # arguments require the owner to close the process manually.
  $arguments = $command.Groups['args'].Value.Trim()
  if ($arguments -match '["\r\n]') { throw "The DSH launch arguments are unrecognized. Close it yourself before updating." }
  $tokens = @($arguments -split '\s+' | Where-Object { $_ })
  $runningProfile = "web"
  $runningPort = 3080
  $seen = @{}
  $start = 0
  if ($tokens.Count -gt 0 -and -not $tokens[0].StartsWith('--')) {
    $runningProfile = $tokens[0]
    $start = 1
    $seen['--profile'] = $true
  }
  for ($index = $start; $index -lt $tokens.Count; $index++) {
    $flag = $tokens[$index]
    if ($seen.ContainsKey($flag)) { throw "The DSH launch arguments are ambiguous. Close it yourself before updating." }
    $seen[$flag] = $true
    switch -CaseSensitive ($flag) {
      '--no-open' { }
      '--profile' {
        if (++$index -ge $tokens.Count) { throw "The DSH profile argument is missing." }
        $runningProfile = $tokens[$index]
      }
      '--port' {
        if (++$index -ge $tokens.Count -or $tokens[$index] -notmatch '^\d{1,5}$') { throw "The DSH port argument is unrecognized." }
        $runningPort = [int]$tokens[$index]
      }
      '--host' {
        if (++$index -ge $tokens.Count -or $tokens[$index] -notin @('127.0.0.1', 'localhost')) { throw "The DSH host argument is unrecognized." }
      }
      default { throw "The DSH launch arguments are unrecognized. Close it yourself before updating." }
    }
  }
  if ($runningProfile -cne $ProfileName -or $runningPort -ne $Port) {
    throw "The listener uses a different DSH profile or port. This helper will not stop it."
  }
  [pscustomobject]@{
    ProcessId = $ListenerId
    CreationDate = $process.CreationDate
    CommandLine = $process.CommandLine
    ExecutablePath = $process.ExecutablePath
    OwnerSid = $owner.Sid
  }
}

function Confirm-IdleDshUpdate {
  $listenerIds = @(Get-LocalListenerIds)
  if ($listenerIds.Count -eq 0) {
    if (Test-LocalDsh) { throw "A local listener could not be identified. Close it yourself before updating." }
    return $true
  }
  $identities = @($listenerIds | ForEach-Object { Get-DshListenerIdentity $_ })
  Write-Host ""
  Write-Host "DSH is open on port $Port (profile $ProfileName). Finish active tasks first."
  Write-Host "This helper can close the recognized DSH process before updating. It cannot tell whether your tasks are idle."
  $answer = Read-Host "When DSH is idle, type YES to stop it and continue the update"
  if ($answer -cne "YES") { return $false }
  $confirmedIds = @(Get-LocalListenerIds)
  if (($confirmedIds -join ',') -cne ($listenerIds -join ',')) {
    throw "The local listener changed while confirmation was pending. No process was stopped; run this helper again."
  }
  # Revalidate every listener before stopping any, then revalidate each PID again
  # immediately before its stop to refuse a reused PID or changed command.
  foreach ($identity in $identities) {
    $fresh = Get-DshListenerIdentity $identity.ProcessId
    if ($fresh.CreationDate -ne $identity.CreationDate -or $fresh.CommandLine -cne $identity.CommandLine -or
        $fresh.ExecutablePath -ine $identity.ExecutablePath -or $fresh.OwnerSid -ne $identity.OwnerSid) {
      throw "The DSH process changed while confirmation was pending. No process was stopped; run this helper again."
    }
  }
  foreach ($identity in $identities) {
    $fresh = Get-DshListenerIdentity $identity.ProcessId
    if ($fresh.CreationDate -ne $identity.CreationDate -or $fresh.CommandLine -cne $identity.CommandLine -or
        $fresh.ExecutablePath -ine $identity.ExecutablePath -or $fresh.OwnerSid -ne $identity.OwnerSid) {
      throw "The DSH process changed before shutdown. No software or profile changes were made."
    }
    Stop-Process -Id $identity.ProcessId -ErrorAction Stop
  }
  for ($attempt = 0; $attempt -lt 25; $attempt++) {
    if (@(Get-LocalListenerIds).Count -eq 0 -and -not (Test-LocalDsh)) { return $true }
    Start-Sleep -Milliseconds 200
  }
  throw "The DSH port is still occupied. No software or profile changes were made."
}

function Install-ImmutableDshPlugin(
  [string]$ProjectDirectory,
  [string]$PackageName,
  [string]$PackageDirectory,
  [string]$DshHome,
  [string]$PackDirectory,
  [string]$ProfileName
) {
  $packOutput = @(& npm pack $PackageDirectory --silent --pack-destination $PackDirectory)
  Assert-Native "Packaging $PackageName"
  $PackedName = $packOutput[-1].Trim()
  $PackedArchive = Join-Path $PackDirectory $PackedName
  $ArchiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PackedArchive).Hash.ToLowerInvariant()
  $PackageVersion = (& node -p "require(process.argv[1]).version" (Join-Path $PackageDirectory "package.json") | Out-String).Trim()
  Assert-Native "Reading the $PackageName version"
  $PackageCache = Join-Path $DshHome "package-cache\$PackageName"
  New-Item -ItemType Directory -Force -Path $PackageCache | Out-Null
  $SnapshotArchive = Join-Path $PackageCache "$PackageName-$PackageVersion-$($ArchiveHash.Substring(0,16)).tgz"
  if (-not (Test-Path -LiteralPath $SnapshotArchive)) {
    Copy-Item -LiteralPath $PackedArchive -Destination $SnapshotArchive
  }
  & node (Join-Path $ProjectDirectory "scripts\validate-package-archive.mjs") $SnapshotArchive
  Assert-Native "Validating the immutable $PackageName package"
  & dsh plugin --profile $ProfileName add --workspace-root "file:$SnapshotArchive"
  Assert-Native "Adding $PackageName to DSH"
}

try {
  Write-Host ""
  Write-Host "Install or update DSH Vibeify"
  Write-Host "This helper downloads open-source code from GitHub, installs DSH and Vibeify, checks them, and opens the local page."
  Write-Host "It never asks for an API key or account password."

  if ($PSVersionTable.Platform -and $PSVersionTable.Platform -ne "Win32NT") {
    throw "This installer is for Windows. Use the macOS or Linux download for another system."
  }

  foreach ($commandName in @("node", "npm")) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
      throw "$commandName is missing. Install Node.js from https://nodejs.org/en/download, close PowerShell, and try again."
    }
  }

  $nodeVersionText = (& node -p "process.versions.node" | Out-String).Trim()
  Assert-Native "Reading the Node.js version"
  $nodeParts = $nodeVersionText.Split(".")
  $nodeMajor = [int]$nodeParts[0]
  $nodeMinor = [int]$nodeParts[1]
  if (-not (($nodeMajor -eq 22 -and $nodeMinor -ge 19) -or $nodeMajor -ge 24)) {
    throw "DSH needs Node.js 22.19 or later in the 22.x line, or Node.js 24 or later; this computer has v$nodeVersionText."
  }

  $TemporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("dsh-vibeify-download-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $TemporaryDirectory | Out-Null
  try {
    if ($SourceDirectory) {
      $ProjectDirectory = (Resolve-Path -LiteralPath $SourceDirectory).Path
      Write-Host "Checking the supplied Vibeify source..."
    } else {
      $Archive = Join-Path $TemporaryDirectory "dsh-vibeify.zip"
      Write-Host "Downloading the latest Vibeify source from the public GitHub project..."
      Invoke-WebRequest -UseBasicParsing -Uri $RepositoryArchive -OutFile $Archive
      Expand-Archive -LiteralPath $Archive -DestinationPath $TemporaryDirectory
      $ProjectDirectory = Join-Path $TemporaryDirectory "DSH-Vibeify-main"
    }
    if (-not (Test-Path -LiteralPath $ProjectDirectory -PathType Container)) {
      throw "The Vibeify source had an unexpected layout."
    }

    $SelfCheck = Join-Path $ProjectDirectory "scripts\installer-self-check.mjs"
    if (Test-Path -LiteralPath $SelfCheck) {
      & node $SelfCheck $ProjectDirectory
      Assert-Native "Checking the downloaded source"
    } else {
      foreach ($relativePath in @(
        "plugins\dsh-vibeify\package.json",
        "plugins\dsh-vibeify\index.js",
        "plugins\dsh-vibeify\client.js",
        "plugins\dsh-vibeify-experience\package.json",
        "plugins\dsh-vibeify-experience\client.js",
        "plugins\dsh-visuals\package.json",
        "plugins\dsh-visuals\index.js",
        "plugins\dsh-social-desk\package.json",
        "plugins\dsh-social-desk\index.js",
        "scripts\install-dsh.sh",
        "scripts\install-vibeify.sh",
        "scripts\validate-package-archive.mjs"
      )) {
        if (-not (Test-Path -LiteralPath (Join-Path $ProjectDirectory $relativePath))) {
          throw "The download is incomplete: $relativePath is missing."
        }
      }
      & node --check (Join-Path $ProjectDirectory "plugins\dsh-vibeify\index.js")
      Assert-Native "Checking the downloaded host plugin"
      & node --check (Join-Path $ProjectDirectory "plugins\dsh-vibeify\client.js")
      Assert-Native "Checking the downloaded browser plugin"
    }
    if ($Check) {
      Write-Host ""
      Write-Host "The Windows downloader check passed. Nothing was installed, no profile changed, and no model was called."
      exit 0
    }

    # Confirm idle shutdown before login, global installs, or profile mutations.
    if (-not (Confirm-IdleDshUpdate)) {
      Write-Host "No software or profile changes were made. Run this helper again when DSH is idle."
      exit 0
    }

    # DSH plugin installation relies on pnpm overrides and build-script
    # policy. Pin a compatible user-local pnpm before invoking any DSH plugin
    # command, without changing a machine-wide npm prefix or approving scripts.
    $QualifiedPnpmVersion = "10.34.6"
    $GlobalNpmPrefix = (& npm prefix --global | Out-String).Trim()
    Assert-Native "Reading the current-user npm prefix"
    $UserProfilePath = [System.IO.Path]::GetFullPath($env:USERPROFILE).TrimEnd('\') + '\'
    $NpmPrefixPath = [System.IO.Path]::GetFullPath($GlobalNpmPrefix).TrimEnd('\') + '\'
    if (-not $NpmPrefixPath.StartsWith($UserProfilePath, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "The current npm prefix is not inside this Windows user profile. Set npm's prefix to a user-local directory, then rerun; this installer will not modify a machine-wide package location."
    }
    $PnpmCommand = Join-Path $GlobalNpmPrefix "pnpm.cmd"
    $InstalledPnpmVersion = $null
    if (Test-Path -LiteralPath $PnpmCommand) {
      $InstalledPnpmVersion = (& $PnpmCommand --version | Out-String).Trim()
      Assert-Native "Checking pnpm"
    }
    if ($InstalledPnpmVersion -ne $QualifiedPnpmVersion) {
      Write-Host "Installing the qualified pnpm version in this Windows user profile..."
      & npm install --global "pnpm@$QualifiedPnpmVersion"
      Assert-Native "Installing qualified pnpm"
      $InstalledPnpmVersion = (& $PnpmCommand --version | Out-String).Trim()
      Assert-Native "Verifying qualified pnpm"
      if ($InstalledPnpmVersion -ne $QualifiedPnpmVersion) {
        throw "pnpm version verification failed: expected $QualifiedPnpmVersion, found $InstalledPnpmVersion."
      }
    }
    $env:PATH = "$GlobalNpmPrefix;$env:PATH"

    $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" }
    $ProfileDirectory = Join-Path $DshHome "profiles\$ProfileName"
    $ProfilePackage = Join-Path $ProfileDirectory "package.json"
    if (-not $Provider) {
      $defaultChoice = "1"
      if (Test-Path -LiteralPath $ProfilePackage) {
        $existingProfile = Get-Content -Raw -LiteralPath $ProfilePackage | ConvertFrom-Json
        if ($existingProfile.dependencies.PSObject.Properties.Name -contains "dsh-vibeify") {
          $defaultChoice = "2"
        }
      }
      Write-Host ""
      Write-Host "Choose how you want the AI side to work:"
      Write-Host "  1. DeepSeek only - connect DeepSeek inside DSH"
      Write-Host "  2. ChatGPT only - sign in with ChatGPT now"
      Write-Host "  3. Both - Codex leads; DeepSeek handles suitable work"
      Write-Host "  4. Install first and connect an account later"
      $choice = Read-Host "Choice [$defaultChoice]"
      if (-not $choice) { $choice = $defaultChoice }
      $Provider = switch ($choice) {
        "2" { "chatgpt" }
        "3" { "both" }
        "4" { "later" }
        default { "deepseek" }
      }
    }

    $ProviderMode = if ($Provider -in @("chatgpt", "both")) { "chatgpt" } else { "deepseek" }
    if ($ProviderMode -eq "chatgpt") {
      if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
        Write-Host "Installing the official Codex command so ChatGPT can be connected..."
        & npm install --global "@openai/codex@latest"
        Assert-Native "Installing Codex"
      }
      $loginStatus = (& codex login status 2>&1 | Out-String)
      if ($loginStatus -notlike "*Logged in using ChatGPT*") {
        Write-Host "Your browser will open for ChatGPT sign-in. Return here when it finishes."
        & codex login
        Assert-Native "ChatGPT sign-in"
      }
    }

    $TargetVersion = (& node -p "require(process.argv[1]).peerDependencies['@deepseek-ai/dsh-agent']" (Join-Path $ProjectDirectory "plugins\dsh-vibeify\package.json") | Out-String).Trim()
    Assert-Native "Reading the qualified DSH version"
    if (-not $TargetVersion) { throw "The official npm registry did not return a DSH version." }
    $CurrentVersion = $null
    if (Get-Command dsh -ErrorAction SilentlyContinue) {
      $CurrentVersion = (& dsh --version | Out-String).Trim()
    }
    if ($CurrentVersion -ne $TargetVersion) {
      Write-Host "Installing @deepseek-ai/dsh@$TargetVersion..."
      & npm install --global "@deepseek-ai/dsh@$TargetVersion"
      Assert-Native "Installing DeepSeek Harness"
    }
    $InstalledVersion = (& dsh --version | Out-String).Trim()
    Assert-Native "Verifying DeepSeek Harness"
    if ($InstalledVersion -ne $TargetVersion) {
      throw "DSH version verification failed: expected $TargetVersion, found $InstalledVersion."
    }

    $RuntimeAnchor = Join-Path ((& npm root --global).Trim()) "@deepseek-ai\dsh\package.json"
    & node (Join-Path $ProjectDirectory "scripts\align-profile-versions.mjs") $ProfilePackage $RuntimeAnchor
    Assert-Native "Aligning legacy DSH profile versions"
    $PluginName = if ($ProviderMode -eq "chatgpt") { "dsh-vibeify" } else { "dsh-vibeify-experience" }
    $OppositePlugin = if ($ProviderMode -eq "chatgpt") { "dsh-vibeify-experience" } else { "dsh-vibeify" }
    $PluginDirectory = Join-Path $ProjectDirectory "plugins\$PluginName"
    $VisualPluginName = "dsh-visuals"
    $VisualPluginDirectory = Join-Path $ProjectDirectory "plugins\$VisualPluginName"
    $SocialPluginName = "dsh-social-desk"
    $SocialPluginDirectory = Join-Path $ProjectDirectory "plugins\$SocialPluginName"

    if (Test-Path -LiteralPath $ProfilePackage) {
      $existingProfile = Get-Content -Raw -LiteralPath $ProfilePackage | ConvertFrom-Json
      if ($existingProfile.dependencies.PSObject.Properties.Name -contains $OppositePlugin) {
        Write-Host "Switching Vibeify provider mode to $ProviderMode..."
        & dsh plugin --profile $ProfileName remove --workspace-root $OppositePlugin
        Assert-Native "Removing the other Vibeify provider mode"
      }
    }

    $PackDirectory = Join-Path $TemporaryDirectory "pack"
    New-Item -ItemType Directory -Path $PackDirectory | Out-Null
    Install-ImmutableDshPlugin $ProjectDirectory $PluginName $PluginDirectory $DshHome $PackDirectory $ProfileName
    Install-ImmutableDshPlugin $ProjectDirectory $VisualPluginName $VisualPluginDirectory $DshHome $PackDirectory $ProfileName
    Install-ImmutableDshPlugin $ProjectDirectory $SocialPluginName $SocialPluginDirectory $DshHome $PackDirectory $ProfileName
    & node (Join-Path $ProjectDirectory "scripts\align-profile-versions.mjs") $ProfilePackage $RuntimeAnchor
    Assert-Native "Aligning the profile runtime"
    & dsh plugin --profile $ProfileName install
    Assert-Native "Installing the aligned runtime"
    & node (Join-Path $ProjectDirectory "scripts\check-profile-runtime.mjs") $ProfilePackage $RuntimeAnchor
    Assert-Native "Checking runtime scope identity"
    $ConfigDump = (& dsh --profile $ProfileName --dump-config | Out-String)
    Assert-Native "Checking the composed DSH profile"

    $installedProfile = Get-Content -Raw -LiteralPath $ProfilePackage | ConvertFrom-Json
    $hasDependency = $installedProfile.dependencies.PSObject.Properties.Name -contains $PluginName
    $hasBundle = @($installedProfile.dsh.profile.bundles) -contains $PluginName
    if (-not ($hasDependency -and $hasBundle)) { throw "$PluginName is not active in the DSH profile." }
    $hasVisualDependency = $installedProfile.dependencies.PSObject.Properties.Name -contains $VisualPluginName
    $hasVisualBundle = @($installedProfile.dsh.profile.bundles) -contains $VisualPluginName
    if (-not ($hasVisualDependency -and $hasVisualBundle)) { throw "$VisualPluginName is not active in the DSH profile." }
    $hasSocialDependency = $installedProfile.dependencies.PSObject.Properties.Name -contains $SocialPluginName
    $hasSocialBundle = @($installedProfile.dsh.profile.bundles) -contains $SocialPluginName
    if (-not ($hasSocialDependency -and $hasSocialBundle)) { throw "$SocialPluginName is not active in the DSH profile." }
    if ($ProviderMode -eq "chatgpt" -and $ConfigDump -notlike "*provider: codex-chatgpt*") {
      throw "Vibeify was installed but Codex is not the composed default provider."
    }
    if ($ProviderMode -eq "deepseek" -and $ConfigDump -like "*provider: codex-chatgpt*") {
      throw "DeepSeek mode was requested but the Codex provider still owns the profile."
    }

    & node (Join-Path $ProjectDirectory "scripts\start-dsh.mjs") --profile $ProfileName --host 127.0.0.1 --port $Port
    Assert-Native "Starting DSH"
    $ServerLog = Join-Path $DshHome "logs\dsh-web.log"
    $ReadinessScript = Join-Path $ProjectDirectory "scripts\dsh-web-readiness.mjs"
    $Ready = $false
    foreach ($attempt in 1..40) {
      & node $ReadinessScript check $Port $ServerLog
      if ($LASTEXITCODE -eq 0) { $Ready = $true; break }
      Start-Sleep -Seconds 1
    }
    if (-not $Ready) {
      throw "DSH was installed but did not become ready. Use the privacy-safe support report in the FAQ; do not share the whole log."
    }
    $AuthenticatedUrl = (& node $ReadinessScript url $Port $ServerLog | Out-String).Trim()
    Assert-Native "Reading the local DSH page address"
    if (-not $AuthenticatedUrl) { throw "The local DSH page address could not be read." }
    Start-Process $AuthenticatedUrl
    Write-Host ""
    Write-Host "DSH Vibeify is ready at http://127.0.0.1:$Port/."

    if ($Provider -in @("deepseek", "both")) {
      Write-Host "In DSH, open Settings > Models to connect DeepSeek."
    } elseif ($Provider -eq "later") {
      Write-Host "You can browse Vibe now. Connect DeepSeek or ChatGPT before asking the agent to work."
    }
    Write-Host "Wikimedia Commons and Openverse image search are ready. Add optional Pexels and Pixabay keys under Settings > Images."
    Write-Host "Vibe Social Desk is ready. Connect official social APIs under Settings > Vibe Social Desk; community routes remain Ready to post."
    Write-Host "Updates are safe to run again; an open DSH task is never stopped silently."
    Show-HelpLinks
  } finally {
    if (Test-Path -LiteralPath $TemporaryDirectory) {
      Remove-Item -LiteralPath $TemporaryDirectory -Recurse -Force
    }
  }
} catch {
  Stop-WithHelp $_.Exception.Message
}
