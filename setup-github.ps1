# GitHub Repository Setup Script
Write-Host "`n=== Family Wealth Blueprint - GitHub Setup ===" -ForegroundColor Cyan
Write-Host "`nRepository will be created as: kids-wealthblueprint" -ForegroundColor Yellow

$repoUrl = "https://github.com/mleggo1/kids-wealthblueprint"
Write-Host "`nAttempting to push to GitHub..." -ForegroundColor Green

git push -u origin main 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccess! Repository created and code pushed!" -ForegroundColor Green
    Write-Host "`nYour repository is available at:" -ForegroundColor Cyan
    Write-Host "   $repoUrl" -ForegroundColor Yellow
} else {
    Write-Host "`nRepository does not exist yet. Please:" -ForegroundColor Yellow
    Write-Host "`n1. Go to: https://github.com/new" -ForegroundColor Cyan
    Write-Host "2. Repository name: kids-wealthblueprint" -ForegroundColor White
    Write-Host "3. Choose Public or Private" -ForegroundColor White
    Write-Host "4. DO NOT check any initialization options" -ForegroundColor White
    Write-Host "5. Click Create repository" -ForegroundColor White
    Write-Host "`nThen run: git push -u origin main" -ForegroundColor Yellow
}
