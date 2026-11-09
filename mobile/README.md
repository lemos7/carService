# Garagem em Dia — aplicativo móvel

Aplicativo Expo Android/iOS com uma única garagem demonstrativa por instalação.
Todos os fluxos de negócio funcionam localmente, sem APIs, Docker, credenciais ou
requisições HTTP. `EXPO_PUBLIC_API_URL` não habilita acesso remoto.

## Executar sem backend

Com o emulador Android iniciado e o ambiente abaixo configurado:

```powershell
cd mobile
npm ci
npm run android:build
adb reverse tcp:8081 tcp:8081
npm start
```

O development client precisa ser recompilado após adicionar módulos nativos,
inclusive `expo-sqlite`. Durante o desenvolvimento basta executar Metro e o
emulador. Um build com bundle embarcado funciona sem Metro; exportar JavaScript
não comprova, por si só, a execução nativa offline.

## Dados locais e durabilidade

A direção das dependências é tela/hook → contratos em `src/services` → adaptador
local → repositórios em `src/data`. O Context mantém o estado da interface;
SQLite é a fonte persistente. `DatabaseProvider` inicializa o banco antes das
operações, com carregamento, erro e nova tentativa sem redefinir dados.

O banco `garagem-em-dia.db` usa chaves estrangeiras, WAL, migrações transacionais
sequenciais por `user_version` e seed único `vectra-demo`. Versões futuras são
rejeitadas. Custos são inteiros em centavos. Uma transação confirma a manutenção
e o maior hodômetro entre o atual e o informado; lançamentos históricos são
aceitos. Repetir o mesmo ID e payload retorna o registro; alterar o payload
produz conflito. O formulário conserva ID e instante de criação ao repetir
uma tentativa sem mudanças.

PDFs ficam em `Paths.document/maintenance-invoices`. O banco guarda caminhos
relativos; o nome original serve para exibição. A cópia passa por staging antes
do commit. Falhas não publicam alterações parciais. A fila serializa gravações
e reconciliação, que remove somente temporários/órfãos gerados pelo aplicativo,
preservando anexos referenciados.

Reiniciar o processo e limpar apenas o cache preserva os novos registros/PDFs.
Desinstalar ou limpar os **dados** do aplicativo pode apagar tudo. Não há backup,
exportação, nuvem, sincronização ou isolamento entre usuários nesta etapa.

## Importação do cache antigo

Na abertura, JSONs confirmados de `cache/maintenance-records` são validados e
importados por registro. Arquivos `.pending` são ignorados; originais nunca são
apagados. Registro, hodômetro e marcador são confirmados na mesma transação.
JSON inválido, veículo desconhecido, conflito de ID e caminho externo geram
avisos com nova tentativa. Uma falha de armazenamento bloqueia a inicialização
ou novas gravações até uma importação bem-sucedida.

Um PDF ausente não esconde o histórico: aparece como indisponível. Restaurar
o PDF na pasta legada e repetir a importação recupera a associação sem duplicar
a manutenção. Somente o caminho legado esperado para aquele ID é aceito.
Cache que já foi apagado não pode ser recuperado.

Downgrade não é transparente: versões anteriores não leem o novo banco.
Não apague banco/documentos para reverter; preserve-os e prefira uma migração
corretiva. As fontes legadas não recebem novas gravações.

## Acesso demonstrativo

Login e cadastro validam os campos e abrem a mesma garagem. Não autenticam
pessoas, criam contas nem isolam dados. Senhas ficam apenas no formulário e são
descartadas após a operação; não são passadas ao serviço, persistidas ou logadas.
Recuperação retorna “Simulação concluída. Nenhum e-mail foi enviado.”
Sair e abrir normalmente o app retorna ao acesso sem apagar o histórico.
A saudação identifica um visitante; o e-mail não seleciona outra garagem.

## Atraso e falhas reproduzíveis

O padrão é atraso fixo de 250 ms, sem falhas aleatórias. No console JavaScript
do development client, após a inicialização:

```js
globalThis.garageSimulation.configure({ delayMs: 1000 });
globalThis.garageSimulation.configure({ failNext: 'createMaintenance' });
```

O próximo envio de manutenção falha **antes** de gravar; uma nova tentativa pode
ter sucesso. Para testar erro de atualização depois de um commit, configure
`failNext: 'snapshot'` antes de salvar: o salvamento continua confirmado e a
interface oferece repetir a leitura, sem reenviar a gravação.

Operações: `listVehicles`, `getVehicle`, `getSummary`, `listMaintenance`,
`createMaintenance`, `snapshot`, `retryImport`, `login`, `register`, `recover`.
As telas carregam uma fotografia consistente da garagem pela operação `snapshot`.
Para restaurar o atraso: `globalThis.garageSimulation.configure({ delayMs: 250 })`.
O controle global só existe em desenvolvimento; testes usam `new Simulation(true)`.
A configuração de falhas é bloqueada em produção.

## Verificação

```powershell
npm run typecheck
npm run lint
node --test tests/*.test.mjs
npm run export
```

Os testes de schema/repositório usam SQLite real do Node; filesystem e falhas são
controlados em memória. Eles não equivalem a testes nativos de Expo/iOS/Android.
Resultados e limitações estão em [VALIDATION.md](VALIDATION.md).

## Ambiente

Base gerada em 22/10/2026 com o template oficial `default@sdk-58`:

| Ferramenta | Versão de referência |
| --- | --- |
| Node | 24.19.0, também em `.nvmrc` e no Dockerfile |
| Expo | 58.0.17 (faixa de patches compatíveis; resolução exata no lockfile) |
| React | 19.3.0 |
| React Native | 0.88.0 |
| TypeScript | 6.0.3 |

Use `npm ci` para reproduzir `package-lock.json`. Para adicionar módulos use
`npx expo install <pacote>`, que seleciona versões compatíveis. Não atualize React
ou React Native isoladamente. O template e a matriz são descritos na
[documentação Expo](https://docs.expo.dev/get-started/create-a-project/).

## Emulador Android no Windows

### Opção recomendada: Android Studio

1. Instale o [Android Studio estável](https://developer.android.com/studio).
2. No SDK Manager, instale Android SDK Platform, Build Tools compatíveis com o
   projeto gerado, Platform Tools, Command-line Tools e Android Emulator.
3. Instale/configure JDK 17 conforme o [guia Expo](https://docs.expo.dev/workflow/android-studio-emulator/)
   e ajuste `JAVA_HOME` para a pasta da instalação. Confira `java -version`.
4. Ative virtualização no firmware e a aceleração suportada pelo Android Emulator
   no Windows. Reinicie se o instalador solicitar. Use Device Manager → Create
   Virtual Device, selecione um Pixel e uma imagem Android estável compatível
   com a arquitetura do computador; baixe a imagem e inicie o dispositivo.
5. Configure as variáveis abaixo (válidas para o terminal atual; para persistir,
   use as Variáveis de Ambiente do Windows e abra um novo terminal):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
adb devices
```

O dispositivo precisa aparecer com estado `device`. `offline` exige reiniciar
a conexão/dispositivo; aparelho físico `unauthorized` exige autorizar no telefone.
Não é preciso instalar uma IDE para editar o app: VS Code pode continuar sendo usado.

### Alternativa: ferramentas oficiais sem a IDE

Instale o JDK e as Android SDK Command-line Tools pela página oficial do Android
Studio, na seção de downloads de ferramentas. Extraia em
`%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`, preservando `bin` dentro de `latest`.
Configure o ambiente acima. Nas ferramentas que incluem `sdkmanager`/`avdmanager`:

```powershell
sdkmanager --list
sdkmanager "platform-tools" "emulator"
sdkmanager --licenses
```

Escolha na listagem uma imagem `system-images;android-<API>;google_apis;<ABI>`
compatível com sua CPU, a plataforma `platforms;android-<API>` e Build Tools
exigidos pelo projeto nativo gerado. Instale os identificadores exatos com
`sdkmanager "<identificador>"`. Depois:

```powershell
avdmanager create avd --name GaragemEmDia --package "<identificador-da-imagem>"
emulator -avd GaragemEmDia
```

Substitua os campos entre `<...>` antes de executar. Esses comandos são a rota
legada das Command-line Tools; instalações com o novo Android CLI devem usar
`android emulator create` / `android emulator start` conforme seu `--help`.
Consulte [avdmanager](https://developer.android.com/tools/avdmanager) e
[execução do emulador](https://developer.android.com/studio/run/emulator-commandline).
A imagem do AVD e o SDK usado para compilar são instalações distintas.

### Alternativa: telefone Android por USB

Ative Opções do desenvolvedor → Depuração USB, conecte o cabo e autorize o
computador. Instale o driver USB do fabricante se necessário. Confira `adb devices`.
Os comandos abaixo aceitam o serial de um telefone ou de um emulador.

## Instalar o app e executar Metro diretamente

Na raiz do repositório:

```powershell
cd mobile
npm ci
npm run android:build -- --device
npm start
```

Selecione o dispositivo no build. A primeira compilação baixa dependências
Gradle/Android e gera `android/`; isso pode levar vários minutos. Esse build é
local e não requer conta EAS. `npm run android` combina compilação e inicialização
do bundler; use `android:build` quando controlar o Metro separadamente.

Em outro terminal, substitua `emulator-5554` pelo serial listado:

```powershell
adb devices
adb -s emulator-5554 reverse tcp:8081 tcp:8081
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "garagememdia://?__expo_url=http%3A%2F%2F127.0.0.1%3A8081"
```

O deep link segue o formato `__expo_url` do SDK 58 e abre o development client,
solicitando o projeto em localhost, acessível
graças ao encaminhamento ADB. A tela deve mostrar **Garagem em Dia** e
**Aplicativo em desenvolvimento**. Edite `src/app/index.tsx` para conferir Fast
Refresh; alterações JavaScript não exigem recompilar o aplicativo nativo.
Mudanças de módulos nativos/configuração podem exigir novo development build.

O script `start` prioriza IPv4 na resolução DNS do Node: neste Windows, o padrão
resolvia `localhost` apenas para `::1`, tornando `127.0.0.1:8081` inacessível.

## Metro em Docker (opcional)

Docker executa Node/Metro. JDK, SDK, ADB e emulador ficam no Windows.
Instale o development build no dispositivo pelo procedimento anterior, pare
Metro local e execute, na raiz:

```powershell
docker compose -f docker-compose.mobile.yml --profile mobile up --build mobile
```

Em outro terminal, execute os mesmos comandos `adb reverse` e deep link acima.
A porta 8081 é publicada apenas em loopback; o endereço anunciado pelo contêiner
é `127.0.0.1`, destinado ao encaminhamento ADB. Não use o IP interno do Docker.
O serviço não inicia APIs e não usa `.env`, chaves ou certificados do backend.

O código é montado em `/app`; dependências Linux e cache Expo têm volumes
separados. O startup executa `npm ci` para sincronizar o volume com o lockfile.
Depois de alterar dependências, reconstrua/reinicie o serviço e, se necessário,
recompile o development client. Não copie `node_modules` entre Windows e Linux.

```powershell
docker compose -f docker-compose.mobile.yml --profile mobile ps
docker compose -f docker-compose.mobile.yml --profile mobile logs --tail 100 mobile
docker compose -f docker-compose.mobile.yml --profile mobile down
```

Para apagar **apenas os volumes declarados no Compose mobile**, use o mesmo comando
`down` com `--volumes`. Não use esse parâmetro no Compose principal do projeto.
Se o Compose avisar sobre outros contêineres do projeto como `orphan containers`,
não use `--remove-orphans`: eles pertencem à aplicação web/API existente.

## iOS

O [simulador iOS local exige macOS/Xcode](https://docs.expo.dev/workflow/ios-simulator/).
Em um Mac com Xcode, runtime de Simulator e ferramentas instaladas:

```sh
cd mobile
npm ci
npm run ios
```

Use Metro diretamente no Mac. Windows não executa o simulador oficial localmente.
iPhone físico com build assinado ou simulador remoto são alternativas, com
requisitos próprios de assinatura/conta; não fazem parte do fluxo Android local.

O caminho principal usa **development build**, pois o Expo Go instalado pode não
suportar SDK 58 durante a transição. Confira a compatibilidade antes de tentar
Expo Go. Não reduza o SDK apenas para acomodar um Expo Go antigo.

## Verificações e diagnóstico

### Consumo local

A aba **Consumo** registra data, veículo, valor pago, hodômetro inicial/final e
litros abastecidos. O histórico mostra distância e consumo em km/l, com média
ponderada pela quantidade total de litros e filtro por veículo. Para uma medição
consistente, informe o percurso entre abastecimentos consecutivos de tanque cheio.

Os registros ficam no SQLite do aparelho e continuam disponíveis sem internet e
após reabrir o aplicativo. A migração preserva veículos e manutenções existentes.
O hodômetro é atualizado sem diminuir seu valor atual. Esta garagem é local e
compartilhada entre os acessos de demonstração; não há sincronização com o site.

Testes automatizados: `node --test tests/*.test.mjs`. Com o emulador Android e o
Metro conectados, `node tests/android-evaluate.mjs tests/native-fuel-check.js`
verifica gravação, reabertura, cálculo, retry e rollback em um banco nativo isolado.
`tests/android-fuel-ui.ps1` registra um abastecimento de teste na garagem de
demonstração pelo formulário.

```powershell
npm run typecheck
npm run lint
npx expo-doctor
npm run export
```

Exportação cria bundles JavaScript em `dist/`; não gera APK/IPA nem comprova que
a interface abriu em um dispositivo. Resultados e limitações ficam em
[`VALIDATION.md`](VALIDATION.md).

- Porta ocupada: pare o outro Metro; local e Docker compartilham 8081.
- Sem conexão: confira `adb devices`, repita `adb reverse` após reconectar e
  verifique `http://127.0.0.1:8081/status` no host. O retorno esperado é
  `packager-status:running`.
- QR aponta para endereço inacessível: use o deep link explícito acima.
- Sem atualização: confira logs do Metro, arquivo montado e Fast Refresh no menu
  do development client. A propagação de eventos do Docker Desktop precisa ser
  verificada no host; uma exportação bem-sucedida não valida esse comportamento.
- LAN/tunnel: são alternativas ao USB, não necessárias ao caminho padrão.
  LAN exige IP alcançável do Windows e ajuste consciente de publicação/firewall;
  tunnel exige conexão externa. `localhost` do telefone só funciona aqui por ADB.
- Erro de ferramenta Android relacionado ao acento no caminho: confirme o erro
  antes de testar um checkout em caminho simples. Não mova o repositório nem seus dados.

Os identificadores `com.garagememdia.mobile` são de desenvolvimento; revisar antes
de uma futura publicação. Este bootstrap não inclui publicação, autenticação ou
acesso aos dados do site.
