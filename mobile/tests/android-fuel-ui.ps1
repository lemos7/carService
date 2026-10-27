$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/android-ui.ps1" -Action inspect
adb shell am start -a android.intent.action.VIEW -d 'garagememdia://inicio' com.garagememdia.mobile
Start-Sleep -Seconds 2
Tap-Node (Find-Label 'Consumo')
Start-Sleep -Milliseconds 700
$ui = Read-Ui
$labels = $ui.SelectNodes('//node') | ForEach-Object { $_.'content-desc'; $_.text }
if ($labels -notcontains 'Registrar abastecimento') { throw 'Formulário de consumo não foi aberto.' }
Tap-Node (Find-Label 'Selecionar veículo')
$ui = Read-Ui
$vehicle = $ui.SelectNodes('//node') | Where-Object { $_.'content-desc' -like '*Vectra*ABC1234*' } | Select-Object -First 1
if (-not $vehicle) { throw 'Seletor de veículo ausente.' }
Tap-Node $vehicle
Set-Field 'Data do abastecimento *' '01012026'
Set-Field 'Valor abastecido (R$) *' '250,50'
adb shell input swipe 500 1800 500 800 400
Start-Sleep -Milliseconds 500
Set-Field 'Quilometragem inicial (km) *' '100000'
Set-Field 'Quilometragem final (km) *' '100400'
Set-Field 'Litros abastecidos *' '40'
adb shell input swipe 500 1800 500 800 400
Start-Sleep -Milliseconds 500
Tap-Node (Find-Label 'Registrar abastecimento')
Start-Sleep -Seconds 1
adb shell input swipe 500 1800 500 600 400
Start-Sleep -Milliseconds 500
$ui = Read-Ui
$texts = $ui.SelectNodes('//node') | ForEach-Object { $_.text }
if (-not ($texts -match '10 km/l')) { throw 'Resultado esperado de 10 km/l não encontrado.' }
$ui.SelectNodes('//node') | Where-Object { $_.text -or $_.'content-desc' } | Select-Object text,content-desc,bounds | Format-Table -AutoSize
