# Script PowerShell pour lister et supprimer les données de test
$baseUrl = "https://cloleo.com/api"

Write-Host "=== Liste des données de test ===" -ForegroundColor Cyan

# Lister les entreprises et produits
Write-Host "`nRécupération de la liste des entreprises et produits..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/list-test-data" -Method GET -ContentType "application/json" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "`n--- ENTREPRISES ---" -ForegroundColor Green
    foreach ($ent in $data.enterprises) {
        Write-Host "ID: $($ent.id)" -ForegroundColor White
        Write-Host "Nom: $($ent.company_name)" -ForegroundColor White
        Write-Host "Email: $($ent.email)" -ForegroundColor White
        Write-Host "---" -ForegroundColor Gray
    }
    
    Write-Host "`n--- PRODUITS ---" -ForegroundColor Green
    foreach ($prod in $data.products) {
        Write-Host "ID: $($prod.id)" -ForegroundColor White
        Write-Host "Nom: $($prod.name)" -ForegroundColor White
        Write-Host "Seller ID: $($prod.seller_id)" -ForegroundColor White
        Write-Host "---" -ForegroundColor Gray
    }
    
    Write-Host "`nVoulez-vous exécuter le nettoyage? (O/N)" -ForegroundColor Yellow
    $choice = Read-Host
    
    if ($choice -eq "O" -or $choice -eq "o") {
        Write-Host "`nExécution du nettoyage..." -ForegroundColor Yellow
        $cleanupResponse = Invoke-WebRequest -Uri "$baseUrl/admin/cleanup-test-data" -Method POST -ContentType "application/json" -UseBasicParsing
        $cleanupData = $cleanupResponse.Content | ConvertFrom-Json
        Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
        foreach ($result in $cleanupData.results) {
            Write-Host "  - $result" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host "`n=== Terminé ===" -ForegroundColor Cyan
