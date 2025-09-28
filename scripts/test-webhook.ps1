# Script PowerShell para testar o webhook de notificações
# Execute com: .\scripts\test-webhook.ps1

$vendedores = @(
    'João Silva',
    'Maria Santos', 
    'Pedro Oliveira',
    'Ana Costa',
    'Carlos Mendes',
    'Lucia Ferreira',
    'Roberto Lima',
    'Fernanda Souza'
)

$clientes = @(
    'Empresa ABC',
    'Loja XYZ', 
    'Corporação 123',
    'Negócios Plus',
    'Indústria Nova',
    'Comercial Ltda',
    'Serviços SA',
    'Tecnologia Inc'
)

$produtos = @(
    'Plano Premium',
    'Pacote Completo',
    'Serviço Especial',
    'Solução Avançada',
    'Consultoria Plus',
    'Sistema Integrado',
    'Suporte Técnico',
    'Licença Enterprise'
)

function Get-RandomItem {
    param($Array)
    return $Array | Get-Random
}

function Get-RandomValue {
    return Get-Random -Minimum 10000 -Maximum 90000
}

function Send-Venda {
    $venda = @{
        vendedor = Get-RandomItem $vendedores
        valor = Get-RandomValue
        cliente = Get-RandomItem $clientes
        produto = Get-RandomItem $produtos
    }

    try {
        Write-Host "🚀 Enviando venda:" -ForegroundColor Cyan
        Write-Host "👤 Vendedor: $($venda.vendedor)" -ForegroundColor White
        Write-Host "📊 Valor: R$ $($venda.valor.ToString('N0'))" -ForegroundColor Green
        Write-Host "🏢 Cliente: $($venda.cliente)" -ForegroundColor White
        Write-Host "📦 Produto: $($venda.produto)" -ForegroundColor White
        
        $body = $venda | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/chamada" -Method Post -ContentType "application/json" -Body $body
        
        if ($response.success) {
            Write-Host "✅ Venda enviada com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "❌ Erro: $($response.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "💥 Erro ao enviar: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Send-VendasSequenciais {
    Write-Host "🎯 Iniciando teste de vendas sequenciais..." -ForegroundColor Yellow
    Write-Host ""
    
    for ($i = 1; $i -le 3; $i++) {
        Write-Host "--- Venda $i/3 ---" -ForegroundColor Magenta
        Send-Venda
        Write-Host ""
        
        if ($i -lt 3) {
            Write-Host "⏳ Aguardando 3 segundos..." -ForegroundColor Gray
            Start-Sleep -Seconds 3
            Write-Host ""
        }
    }
    
    Write-Host "🎉 Teste concluído!" -ForegroundColor Green
}

# Verificar parâmetros
param(
    [switch]$Sequencial,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
🔧 Teste de Webhook - Notificações Globais

Uso:
  .\scripts\test-webhook.ps1                # Enviar uma venda
  .\scripts\test-webhook.ps1 -Sequencial   # Enviar 3 vendas sequenciais
  .\scripts\test-webhook.ps1 -Help         # Mostrar esta ajuda

Exemplos:
  .\scripts\test-webhook.ps1
  .\scripts\test-webhook.ps1 -Sequencial
"@
} elseif ($Sequencial) {
    Send-VendasSequenciais
} else {
    Send-Venda
}
