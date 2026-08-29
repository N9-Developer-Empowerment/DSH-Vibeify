[CmdletBinding()]
param(
  [switch]$Check,
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
  Write-Error "Installation stopped: $safeMessage"
  Show-HelpLinks
  exit 1
}

function Assert-Native([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

function Test-LocalDsh {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/" -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
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
    $Archive = Join-Path $TemporaryDirectory "dsh-vibeify.zip"
    Write-Host ""
    Write-Host "Downloading the latest Vibeify source from the public GitHub project..."
    Invoke-WebRequest -UseBasicParsing -Uri $RepositoryArchive -OutFile $Archive
    Expand-Archive -LiteralPath $Archive -DestinationPath $TemporaryDirectory
    $ProjectDirectory = Join-Path $TemporaryDirectory "DSH-Vibeify-main"
    if (-not (Test-Path -LiteralPath $ProjectDirectory -PathType Container)) {
      throw "The downloaded Vibeify archive had an unexpected layout."
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

    if (-not $Provider) {
      Write-Host ""
      Write-Host "Choose how you want the AI side to work:"
      Write-Host "  1. DeepSeek only - connect DeepSeek inside DSH"
      Write-Host "  2. ChatGPT only - sign in with ChatGPT now"
      Write-Host "  3. Both - Codex leads; DeepSeek handles suitable work"
      Write-Host "  4. Install first and connect an account later"
      $choice = Read-Host "Choice [1]"
      if (-not $choice) { $choice = "1" }
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

    $TargetVersion = (& npm view "@deepseek-ai/dsh@latest" version | Out-String).Trim()
    Assert-Native "Finding the latest official DSH version"
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

    $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" }
    $ProfileDirectory = Join-Path $DshHome "profiles\$ProfileName"
    $ProfilePackage = Join-Path $ProfileDirectory "package.json"
    $PluginName = if ($ProviderMode -eq "chatgpt") { "dsh-vibeify" } else { "dsh-vibeify-experience" }
    $OppositePlugin = if ($ProviderMode -eq "chatgpt") { "dsh-vibeify-experience" } else { "dsh-vibeify" }
    $PluginDirectory = Join-Path $ProjectDirectory "plugins\$PluginName"

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
    $packOutput = @(& npm pack $PluginDirectory --silent --pack-destination $PackDirectory)
    Assert-Native "Packaging Vibeify"
    $PackedName = $packOutput[-1].Trim()
    $PackedArchive = Join-Path $PackDirectory $PackedName
    $ArchiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PackedArchive).Hash.ToLowerInvariant()
    $PluginVersion = (& node -p "require(process.argv[1]).version" (Join-Path $PluginDirectory "package.json") | Out-String).Trim()
    Assert-Native "Reading the Vibeify version"
    $PackageCache = Join-Path $DshHome "package-cache\$PluginName"
    New-Item -ItemType Directory -Force -Path $PackageCache | Out-Null
    $SnapshotArchive = Join-Path $PackageCache "$PluginName-$PluginVersion-$($ArchiveHash.Substring(0,16)).tgz"
    if (-not (Test-Path -LiteralPath $SnapshotArchive)) {
      Copy-Item -LiteralPath $PackedArchive -Destination $SnapshotArchive
    }

    & node (Join-Path $ProjectDirectory "scripts\validate-package-archive.mjs") $SnapshotArchive
    Assert-Native "Validating the immutable Vibeify package"
    & dsh plugin --profile $ProfileName add --workspace-root "file:$SnapshotArchive"
    Assert-Native "Adding Vibeify to DSH"
    $ConfigDump = (& dsh --profile $ProfileName --dump-config | Out-String)
    Assert-Native "Checking the composed DSH profile"

    $installedProfile = Get-Content -Raw -LiteralPath $ProfilePackage | ConvertFrom-Json
    $hasDependency = $installedProfile.dependencies.PSObject.Properties.Name -contains $PluginName
    $hasBundle = @($installedProfile.dsh.profile.bundles) -contains $PluginName
    if (-not ($hasDependency -and $hasBundle)) { throw "$PluginName is not active in the DSH profile." }
    if ($ProviderMode -eq "chatgpt" -and $ConfigDump -notlike "*provider: codex-chatgpt*") {
      throw "Vibeify was installed but Codex is not the composed default provider."
    }
    if ($ProviderMode -eq "deepseek" -and $ConfigDump -like "*provider: codex-chatgpt*") {
      throw "DeepSeek mode was requested but the Codex provider still owns the profile."
    }

    if (Test-LocalDsh) {
      Write-Host ""
      Write-Host "Vibeify is staged. DSH is already open, so this installer will not interrupt it. Finish active work, close DSH, then run this installer again to activate the update."
    } else {
      & node (Join-Path $ProjectDirectory "scripts\start-dsh.mjs") --profile $ProfileName --host 127.0.0.1 --port $Port
      Assert-Native "Starting DSH"
      foreach ($attempt in 1..40) {
        if (Test-LocalDsh) { break }
        Start-Sleep -Seconds 1
      }
      if (-not (Test-LocalDsh)) {
        throw "DSH was installed but did not become ready. Use the privacy-safe support report in the FAQ; do not share the whole log."
      }
      Start-Process "http://127.0.0.1:$Port/"
      Write-Host ""
      Write-Host "DSH Vibeify is ready at http://127.0.0.1:$Port/."
    }

    if ($Provider -in @("deepseek", "both")) {
      Write-Host "In DSH, open Settings > Models to connect DeepSeek."
    } elseif ($Provider -eq "later") {
      Write-Host "You can browse Vibe now. Connect DeepSeek or ChatGPT before asking the agent to work."
    }
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
