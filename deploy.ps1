$pnpmStore = "E:\htmlProjects\deepseek-harness-master\node_modules\.pnpm\@assistant-manager+assistan_13f67a8d81d04c1ee419e22bc38c2118\node_modules\@assistant-manager\assistant-manager"
Copy-Item -Path "E:\htmlProjects\Assistant-Manager\lib\*" -Destination "$pnpmStore\lib\" -Recurse -Force
Copy-Item -Path "E:\htmlProjects\Assistant-Manager\client\*" -Destination "$pnpmStore\client\" -Recurse -Force
Write-Host "Files copied successfully to $pnpmStore"
