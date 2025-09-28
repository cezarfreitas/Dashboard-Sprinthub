# Script PowerShell simples para testar o webhook
# Execute com: .\scripts\test-webhook-simple.ps1

$vendedores = @('João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa')
$clientes = @('Empresa ABC', 'Loja XYZ', 'Corporação 123', 'Negócios Plus')
$produtos = @('Plano Premium', 'Pacote Completo', 'Serviço Especial', 'Solução Avançada')

$venda = @{
    vendedor = $vendedores | Get-Random
    valor = Get-Random -Minimum 10000 -Maximum 90000
    cliente = $clientes | Get-Random
    produto = $produtos | Get-Random
}

Write-Host "Enviando venda:" -ForegroundColor Cyan
Write-Host "Vendedor: $($venda.vendedor)" -ForegroundColor White
Write-Host "Valor: R$ $($venda.valor.ToString('N0'))" -ForegroundColor Green
Write-Host "Cliente: $($venda.cliente)" -ForegroundColor White
Write-Host "Produto: $($venda.produto)" -ForegroundColor White

$body = $venda | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/chamada" -Method Post -ContentType "application/json" -Body $body
    
    if ($response.success) {
        Write-Host "Venda enviada com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Erro: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "Erro ao enviar: $($_.Exception.Message)" -ForegroundColor Red
}
