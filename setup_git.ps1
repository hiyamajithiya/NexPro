# PowerShell script to initialize and push to GitHub
Set-Location "D:\ADMIN\Documents\HMC AI\NexCA"

# Remove incomplete .git folder if exists
if (Test-Path ".git") {
    Remove-Item -Recurse -Force ".git"
    Write-Host "Removed old .git folder"
}

# Initialize new repository
& "D:\Git\cmd\git.exe" init
Write-Host "Git initialized"

# Add all files
& "D:\Git\cmd\git.exe" add .
Write-Host "Files added"

# Commit
& "D:\Git\cmd\git.exe" commit -m "Initial commit - NexPro Practice Management System"
Write-Host "Committed"

# Set branch name
& "D:\Git\cmd\git.exe" branch -M main
Write-Host "Branch set to main"

# Add remote
& "D:\Git\cmd\git.exe" remote add origin https://github.com/hiyamajithiya/NexPro.git
Write-Host "Remote added"

# Push
Write-Host "Pushing to GitHub... (a browser window may open for authentication)"
& "D:\Git\cmd\git.exe" push -u origin main

Write-Host "Done! Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
