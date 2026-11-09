param([ValidateSet('login','inspect','restart')][string]$Action = 'inspect')
$ErrorActionPreference = 'Stop'
function Read-Ui {
  adb shell uiautomator dump /sdcard/offline-ui.xml | Out-Null
  return [xml](adb shell cat /sdcard/offline-ui.xml)
}
function Find-Label([string]$label) {
  $ui = Read-Ui
  $node = $ui.SelectNodes('//node') | Where-Object { $_.'content-desc' -eq $label -and $_.enabled -eq 'true' } | Select-Object -First 1
  if (-not $node) { throw "Elemento não encontrado: $label" }
  return $node
}
function Tap-Node($node) {
  $numbers = [regex]::Matches($node.bounds, '\d+') | ForEach-Object { [int]$_.Value }
  $x = [int](($numbers[0] + $numbers[2]) / 2)
  $y = [int](($numbers[1] + $numbers[3]) / 2)
  adb shell input tap $x $y
  Start-Sleep -Milliseconds 500
}
function Set-Field([string]$label, [string]$value) {
  $node = Find-Label $label
  Tap-Node $node
  if ($node.text -and $node.text -ne $node.hint) {
    adb shell input keyevent 123
    $keys = (@('67') * $node.text.Length) -join ' '
    adb shell input keyevent $keys
  }
  adb shell input text $value
  Start-Sleep -Milliseconds 500
  adb shell input keyevent 4
  Start-Sleep -Milliseconds 500
}
if ($Action -eq 'login') {
  Set-Field 'E-mail' 'offline@example.com'
  Set-Field 'Senha' 'OfflineTest123'
  Tap-Node (Find-Label 'Acessar demonstração')
  Start-Sleep -Milliseconds 500
}
if ($Action -eq 'restart') {
  adb shell am force-stop com.garagememdia.mobile
  adb shell am start -a android.intent.action.VIEW -d 'exp+garagem-em-dia-mobile://?__expo_url=http%3A%2F%2F127.0.0.1%3A8081' com.garagememdia.mobile
  Start-Sleep -Seconds 3
}
$ui = Read-Ui
$ui.SelectNodes('//node') | Where-Object { $_.text -or $_.'content-desc' } | Select-Object text,content-desc,bounds | Format-Table -AutoSize
