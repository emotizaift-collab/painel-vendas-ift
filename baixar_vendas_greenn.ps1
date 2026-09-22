$ErrorActionPreference = 'Stop'

$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$arquivoSaida = Join-Path $pasta 'greenn_sales_complete.json'
$tokenSeguro = Read-Host 'Token da Greenn' -AsSecureString
$ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenSeguro)

try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro)
    $headers = @{ Authorization = ('Bearer ' + $token); Accept = 'application/json' }
    $todas = New-Object System.Collections.Generic.List[object]
    $pagina = 1
    $ultima = 1

    do {
        $url = "https://apiadm.greenn.com.br/api/v1/sales?per_page=100&page=$pagina"
        $resposta = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 60
        $meta = $resposta.meta
        $ultima = [int]$meta.last_page
        foreach ($venda in @($resposta.data)) {
            if ([string]$venda.product_id -eq '171399') {
                $todas.Add($venda)
            }
        }
        Write-Host "Pagina $pagina de $ultima | Produto 171399 acumulado: $($todas.Count)"
        $pagina++
    } while ($pagina -le $ultima)

    $dados = $todas.ToArray()
    $saida = [ordered]@{
        data = $dados
        meta = [ordered]@{
            product_id = '171399'
            total_account = [int]$meta.total
            pages_account = $ultima
            total_product = [int]$todas.Count
        }
    }
    $saida | ConvertTo-Json -Depth 10 | Set-Content -Path $arquivoSaida -Encoding UTF8
    Write-Host "Arquivo salvo em: $arquivoSaida"
    Write-Host "Registros do produto 171399: $($todas.Count)"
}
finally {
    if ($ponteiro -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro)
    }
    Remove-Variable token -ErrorAction SilentlyContinue
    Remove-Variable tokenSeguro -ErrorAction SilentlyContinue
}
