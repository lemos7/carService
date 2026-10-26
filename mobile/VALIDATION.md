# Validação do bootstrap

Registro de 22/10/2026. Estes resultados distinguem o servidor/bundle da execução
nativa: abrir um endpoint HTTP não comprova que a tela abriu em um celular.

## Verificado

- Template oficial Expo SDK 58; dependências compatíveis registradas em `package-lock.json`.
- `npm ci`: instalação limpa concluída no Windows.
- `npm run typecheck` e `npm run lint`: aprovados.
- `npx expo-doctor`: 20/20 checks aprovados.
- `npm run export`: bundles Hermes Android e iOS exportados para `dist/`.
- Metro direto: `/status` respondeu `packager-status:running`; manifesto Android
  respondeu HTTP 200 e anunciou `127.0.0.1:8081`; bundle Android respondeu HTTP
  200 (5.676.178 bytes na verificação).
- Corrigida resolução de `localhost` somente para `::1` neste Windows: o script
  `start` usa `--dns-result-order=ipv4first` para atender o caminho ADB documentado.
- Build final da imagem `node:24.19.0-bookworm-slim` com `npm ci`: aprovado.
- `docker compose -f docker-compose.mobile.yml --profile mobile up --build -d --wait --wait-timeout 300 mobile`:
  concluído; contêiner saudável, publicando somente `127.0.0.1:8081`.
- Metro Docker pelo host: `/status` respondeu `packager-status:running`, manifesto
  Android HTTP 200 com host `127.0.0.1:8081`, bundle Android HTTP 200
  (5.676.037 bytes na verificação). O serviço foi deixado em execução.
- Compose mobile lista somente `mobile`; Compose padrão e produção listam somente
  os serviços existentes. Os arquivos Compose existentes não foram alterados.
- Dependências, caches Expo e projetos nativos gerados estão ignorados pelo Git.

## Pendências de execução nativa

ADB e Java não foram encontrados no PATH; Android SDK e Android Studio/JDK não
foram encontrados nos caminhos padrão deste computador. Nenhum emulador foi
instalado automaticamente. É necessário configurar uma das opções do README.

Ainda não comprovados:

- Compilação/instalação nativa Android e abertura da tela no emulador.
- Conexão do development client via ADB/deep link.
- Fast Refresh visível no dispositivo com Metro direto e Docker.
- Reinstalação no volume Docker após uma alteração de dependências.
- Execução nativa iOS, que exige Mac/dispositivo e ambiente apropriado.

O formato do deep link foi conferido no CLI instalado do SDK 58 (`__expo_url`);
sua abertura no dispositivo continua pendente. As tarefas OpenSpec que dependem
dessas evidências permanecem abertas.

Progresso OpenSpec: 9/14 tarefas concluídas. Permanecem abertas 2.3, 3.2, 3.3,
3.4 e 4.3, pois seus critérios incluem execução no dispositivo ou o fluxo
completo. Configuração, documentação e testes HTTP dessas etapas estão entregues,
mas não substituem os critérios nativos. `openspec validate --strict` passou.

## Dependências

`npm audit --omit=dev` retornou 19 ocorrências de severidade alta, incluindo
dependências transitivas de Expo/Metro/React Native. Algumas correções sugeridas
pelo npm fazem downgrade incompatível do SDK. Não foi aplicado `audit fix --force`.
O resultado não deve ser interpretado como árvore de dependências sem alertas;
a correção compatível precisa ser tratada antes de distribuição de produção.

ESLint 9.39.5 também emite aviso de fim de suporte; é a versão resolvida junto da
configuração Expo desta entrega. Lint e Expo Doctor passaram. O npm informou
script de instalação pendente de `unrs-resolver`; não foi liberado globalmente.

## Armazenamento local — 26/10/2026

Implementação da mudança `add-offline-mobile-storage`. Este registro complementa
o histórico anterior; os resultados abaixo se referem à nova camada SQLite.

### Verificações concluídas

- `expo-sqlite@58.0.14` instalado pelo instalador Expo; lockfile e config plugin atualizados.
- `npm run typecheck` e `npm run lint`: aprovados.
- `node --test tests/*.test.mjs`: 17 testes aprovados.
- `npm run export -- --max-workers 2`: bundles Hermes Android e iOS exportados.
- Build debug Android com SQLite compilado e instalado no Pixel_10a (API 37).
- Inicialização real chegou à tela de acesso demonstrativo sem erro JavaScript.
- 12 verificações executadas no Hermes/Expo nativo com banco e diretórios exclusivos
  de teste, usando `tests/android-evaluate.mjs` e `tests/native-offline-check.js`:
  falha simulada antes de gravar; repetição idempotente; hodômetro sem recuo;
  rollback sem registro parcial; importação interrompida com rollback; retomada
  sem duplicação; preservação da origem; PDF existente e legível após apagar
  somente seu cache de teste; recuperação local; rollback de migração; rejeição
  de versão futura.
- O teste nativo identificou e permitiu corrigir a necessidade de aguardar
  `File.copy/move` no SDK 58 e de ler o cabeçalho por `FileHandle.readBytes`,
  evitando a criação de Blob incompatível com React Native.
- Nenhum registro real foi apagado. O teste de cache removeu somente o diretório
  criado pela própria validação. As fixtures usam bancos `offline-validation-*.db`
  e documentos `offline-validation-invoices-*`.

### Limites e verificações pendentes

- A consulta após reiniciar o processo não concluiu: o depurador ainda não estava
  reconectado. A solicitação para repetir essa consulta e o teste de login foi
  recusada. Não se afirma cobertura de persistência após reinício real.
- Ainda precisam de verificação completa na interface: carregamento/erro/retry
  da inicialização, login/cadastro/saída, estados vazio/ausente, avisos de importação,
  preservação do formulário em falha e erro de refresh depois de commit.
- Ainda não foi validado um build Android com bundle embarcado e rede desligada.
  O build debug depende do Metro; exportar JavaScript não substitui esse teste.
- iOS **não foi executado**: ambiente Windows, sem macOS/Xcode/simulador iOS.
  A exportação iOS não comprova persistência nem anexos na plataforma.
- Os testes de Node usam SQLite real do Node e um filesystem controlado. Eles
  complementam, mas não substituem, os cenários nativos pendentes.

### Reproduzir o teste nativo isolado

Com o development client conectado ao Metro na porta 8081:

```powershell
node tests/android-evaluate.mjs tests/native-offline-check.js
```

O resultado informa os nomes do banco e do diretório de documentos criados.
Para uma verificação após reinício, use esses nomes no script
`tests/native-reopen-check.js` antes de executá-lo. O script também exercita o
exemplo documentado de falha de próxima operação e restaura o atraso para 250 ms.
O teste de interface `tests/android-ui.ps1` usa credenciais fictícias e ADB;
o resultado deve ser inspecionado antes de afirmar cobertura do fluxo.
