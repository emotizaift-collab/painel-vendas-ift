$ErrorActionPreference = 'Stop'

$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $pasta

$nodeDir = 'C:\Users\bruno\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64'
$node = Join-Path $nodeDir 'node.exe'
if (-not (Test-Path $node)) {
    throw "Node.js nao foi encontrado em $node"
}

if ([string]::IsNullOrWhiteSpace($env:GREENN_BIANCA_TOKEN)) {
    $seguro = Read-Host 'Cole o token novo da Greenn' -AsSecureString
    $ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try {
        $env:GREENN_BIANCA_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro)
    }
    finally {
        if ($ponteiro -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro)
        }
    }
}

if ([string]::IsNullOrWhiteSpace($env:GREENN_PALESTRANTE_TOKEN)) {
    $seguroSegundo = Read-Host 'Cole o token do perfil IFT da Greenn (Enter para ignorar)' -AsSecureString
    $ponteiroSegundo = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguroSegundo)
    try {
        $segundoToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiroSegundo)
        if (-not [string]::IsNullOrWhiteSpace($segundoToken)) {
            $env:GREENN_PALESTRANTE_TOKEN = $segundoToken
        }
    }
    finally {
        if ($ponteiroSegundo -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiroSegundo)
        }
    }
}

$env:GREENN_BIANCA_PRODUCT_IDS = '171399'
# O perfil IFT pode ler todos os produtos da conta usando "*".
# Defina GREENN_PALESTRANTE_TOKEN no ambiente para habilitá-lo.
$env:GREENN_PALESTRANTE_PRODUCT_IDS = '*'
$env:REFRESH_INTERVAL_MS = '300000'
$arquivoCompleto = Join-Path $pasta 'greenn_sales_complete.json'
if (Test-Path $arquivoCompleto) {
    $env:GREENN_LOCAL_FILE = $arquivoCompleto
} else {
    Remove-Item Env:GREENN_LOCAL_FILE -ErrorAction SilentlyContinue
}

Write-Host 'Painel local consultando a API da Greenn. O JSON local nao sera usado.'
Write-Host 'Abra http://localhost:3000'
& $node (Join-Path $pasta 'dist\server\src\index.js')
