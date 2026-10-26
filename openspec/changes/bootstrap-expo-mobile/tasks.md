# Tasks

## 1. Projeto móvel independente

- [x] 1.1 Revalidar a última versão estável do Expo nas fontes oficiais (SDK 58 na pesquisa de 22/10/2026), selecionar Node LTS compatível e gerar `mobile/` com template explícito; verificar versões sem beta/canary e registrar a matriz Expo/React/React Native/Node no README móvel.
- [x] 1.2 Configurar TypeScript, Expo Router mínimo, `expo-dev-client`, scheme e scripts `start`, `android`, `ios`, `typecheck` e `lint`; verificar instalação limpa por `npm ci`, Expo Doctor, typecheck e lint sem depender de `frontend/node_modules`.
- [x] 1.3 Substituir exemplos pela tela "Garagem em Dia" / "Aplicativo em desenvolvimento", com área segura e sem chamadas à API; verificar exportação de bundles Android e iOS e ausência de exemplos ou funcionalidades de negócio.
- [x] 1.4 Atualizar `.gitignore` e documentação de instalação/execução direta; verificar que lockfile e configuração são versionados e que `.expo/`, dependências, diretórios nativos gerados e artefatos não aparecem como arquivos para commit.

## 2. Execução nativa e opções de emulador

- [x] 2.1 Escrever no README móvel o setup Windows com Android Studio, JDK/SDK compatíveis, virtualização, AVD, `ANDROID_HOME`, PATH e `adb devices`; fornecer alternativa com ferramentas oficiais de linha de comando e conferir comandos contra a documentação atual.
- [x] 2.2 Documentar Android físico por USB e iOS via Xcode/macOS, distinguindo alternativas remotas de execução local e explicando a compatibilidade do Expo Go; verificar que o caminho principal usa development build e não exige conta EAS para Android local.
- [ ] 2.3 Gerar e instalar um development build Android em emulador disponível, iniciar Metro direto e abrir a tela com backend parado; registrar evidência visual/log, confirmar Fast Refresh após edição de texto e restaurar o texto inicial. Se faltarem ferramentas, registrar a pendência e não marcar a validação visual como concluída.

## 3. Servidor de desenvolvimento em Docker

- [x] 3.1 Criar `mobile/Dockerfile`, `.dockerignore` e `docker-compose.mobile.yml` com perfil `mobile`, Node alinhado ao host, bind mount do código, volume de dependências Linux sincronizado com o lockfile e porta loopback 8081; verificar `docker compose -f docker-compose.mobile.yml --profile mobile config` e build da imagem.
- [ ] 3.2 Configurar Metro para escutar no contêiner e anunciar endereço acessível pelo encaminhamento ADB; documentar build Android sem iniciar outro bundler, seleção de dispositivo e `adb reverse`; verificar carregamento do bundle e conexão do development client ao Metro Docker.
- [ ] 3.3 Validar edição de texto com Metro Docker e bind mount no Windows, corrigindo o watcher se necessário; registrar Fast Refresh visível sem rebuild nativo e reinstalação coerente das dependências após mudança de lockfile.
- [ ] 3.4 Documentar comandos exatos de iniciar/parar mobile, deep link ou launcher validado, diagnóstico de porta/firewall/endereço e limpeza restrita a volumes mobile; executar os comandos documentados e confirmar que não dependem de secrets ou das APIs.

## 4. Integração e entrega

- [x] 4.1 Adicionar ao README raiz o acesso ao guia mobile e verificar a separação entre build web Angular, aplicativo Expo e futura API compartilhada; revisar o diff para confirmar ausência de mudanças em contratos, autenticação e funcionalidades web.
- [x] 4.2 Comparar as configurações Compose padrão e de produção com a configuração mobile; confirmar que o serviço mobile só aparece quando o arquivo adicional é selecionado e que os serviços existentes mantêm portas, redes e volumes.
- [ ] 4.3 Reproduzir o fluxo documentado de instalação até a tela inicial nos dois modos de Metro, consolidando evidências Android e resultados de checagens; distinguir exportação JavaScript de teste nativo iOS e registrar qualquer validação bloqueada sem declará-la aprovada.

## Evidências e pendências

Ver `mobile/VALIDATION.md`. Metro direto e Docker servem manifesto e bundle Android
com HTTP 200; Docker está saudável. Os critérios nativos das tarefas abertas
dependem de Android SDK/JDK e emulador ou dispositivo conectado, indisponíveis
na validação de 22/10/2026. Nenhuma instalação de emulador foi realizada.
