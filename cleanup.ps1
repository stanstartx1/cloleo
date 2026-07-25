# Script PowerShell pour supprimer l'entreprise EKO-BAT et les produits n. GH et sss
# Remplacez VOTRE_TOKEN_ADMIN par votre vrai token admin

$token = "VOTRE_TOKEN_ADMIN"
$baseUrl = "https://cloleo.com/api"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "=== Nettoyage de la base de données ===" -ForegroundColor Cyan

# Supprimer l'entreprise EKO-BAT
Write-Host "`nSuppression de l'entreprise EKO-BAT..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/enterprises/by-name/EKO-BAT" -Method DELETE -Headers $headers
    Write-Host "✅ Entreprise EKO-BAT supprimée" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Supprimer le produit n. GH
Write-Host "`nSuppression du produit 'n. GH'..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/products/by-name/n.%20GH" -Method DELETE -Headers $headers
    Write-Host "✅ Produit 'n. GH' supprimé" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Supprimer le produit sss
Write-Host "`nSuppression du produit 'sss'..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/products/by-name/sss" -Method DELETE -Headers $headers
    Write-Host "✅ Produit 'sss' supprimé" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Nettoyage terminé ===" -ForegroundColor Cyan
