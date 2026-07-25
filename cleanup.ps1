# Script PowerShell pour supprimer l'entreprise EKO-BAT et les produits n. GH et sss
# Utilise l'endpoint temporaire sans authentification

$baseUrl = "https://cloleo.com/api"

Write-Host "=== Nettoyage de la base de données ===" -ForegroundColor Cyan

# Appeler l'endpoint de nettoyage
Write-Host "`nExécution du nettoyage..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/cleanup-test-data" -Method POST -ContentType "application/json"
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
    foreach ($result in $data.results) {
        Write-Host "  - $result" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host "`n=== Nettoyage terminé ===" -ForegroundColor Cyan
