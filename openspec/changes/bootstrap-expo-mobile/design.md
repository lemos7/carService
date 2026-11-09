# Design

## Context

Ver `proposal.md` para a motivação. O repositório possui Angular 20 em `frontend/`, três APIs ASP.NET Core e Compose com um override de desenvolvimento carregado automaticamente. A produção utiliza explicitamente os arquivos base e production. Não existe projeto móvel. O host de referência é Windows/PowerShell, com caminho do repositório contendo acento.

As APIs são destinadas ao reaproveitamento futuro, mas a entrega atual não deve chamá-las. As mudanças ativas de relatório PDF e Playwright não são dependências deste bootstrap. O inventário de specs principais está vazio.

## Goals / Non-Goals

**Goals:** oferecer instalação reproduzível, tela visível em dispositivo Android virtual e edição com Fast Refresh; separar compilação nativa no host do servidor Metro, executável no host ou em Docker.

**Non-Goals:** transformar o Angular, gerar uma terceira interface web, configurar credenciais da API, gerar APK/IPA de produção, publicar ou instalar Android Studio/hipervisores automaticamente. Não adicionar bibliotecas de estado, HTTP ou design system antes de existir necessidade funcional.

## Decisions

### 1. Projeto independente e versões compatíveis

Criar `mobile/` com o template oficial TypeScript/Expo Router, reduzido à tela inicial, lockfile npm próprio e configuração de aplicação própria. O Angular mantém seu build web e o Expo produz o aplicativo móvel. Não criar workspace npm compartilhado.

A pesquisa de 22/10/2026 confirma SDK 58 estável, lançado em 15/10/2026, com React Native 0.88. Usar `npx create-expo-app@latest mobile --template default@sdk-58`; revalidar o último SDK estável antes de executar, registrar versões exatas no lockfile e usar React da matriz do SDK, nunca atualizar React/React Native isoladamente. Escolher Node 24 LTS em patch suportado (mínimo 24.3 para SDK 58), com a mesma versão documentada no host e na imagem Docker. Não usar beta/canary ou funcionalidades experimentais.

O comando sem template ainda pode selecionar SDK 57 durante a transição. A versão de Expo Go nas lojas pode não acompanhar o SDK 58; por isso o caminho principal é `expo-dev-client` instalado via `npx expo install`, seguido de development build nativo. Expo Go é apenas alternativa quando sua compatibilidade estiver confirmada.

Fontes: [lançamento SDK 58](https://expo.dev/changelog/sdk-58), [template oficial](https://docs.expo.dev/get-started/create-a-project/).

### 2. Tela e scripts mínimos

Exibir "Garagem em Dia" e "Aplicativo em desenvolvimento", respeitando área segura e legibilidade. Retirar exemplos, abas e recursos do template sem utilidade para esta tela. Sem chamadas HTTP, login, permissões adicionais ou dados de negócio.

Definir scripts `start` (Metro com development client), `android` (build/instalação Android no host), `ios` (equivalente em macOS), `typecheck` e `lint`. Registrar um scheme próprio para abrir o development client. Usar geração nativa do Expo; diretórios `android/` e `ios/` gerados, `.expo/`, caches e artefatos ficam ignorados. Não compartilhar `node_modules` Windows com Linux.

### 3. Docker executa somente Metro

Adicionar `mobile/Dockerfile`, `.dockerignore` e `docker-compose.mobile.yml` autocontido, com serviço `mobile` e perfil `mobile`. Comando alvo, na raiz:

```powershell
docker compose -f docker-compose.mobile.yml --profile mobile up --build mobile
```

O arquivo também poderá ser combinado explicitamente ao Compose existente, mas o caminho documentado acima funciona sem secrets ou backend. Não editar os serviços existentes nem carregar mobile pelo override padrão.

Usar imagem Node fixada, instalar dependências com `npm ci`, publicar `127.0.0.1:8081:8081` e executar Metro ouvindo nas interfaces do contêiner. Montar código para edição e manter dependências Linux em volume próprio. O startup deverá sincronizar esse volume pelo lockfile, evitando dependências antigas após rebuild; `npm ci` na inicialização é aceitável para esta entrega. Documentar stop e remoção somente dos volumes mobile, sem `down -v` da stack principal.

O emulador, ADB, JDK e Android SDK permanecem no host. Compilar e instalar o development client no Windows antes de conectar ao Metro Docker; usar o build nativo com a opção de não iniciar um segundo bundler. Não instalar Android SDK na imagem Node nem tentar iniciar GUI/emulador no contêiner.

### 4. Conexão emulador-host-contêiner

O caminho principal usa ADB no host: conferir `adb devices`, selecionar o serial quando houver vários dispositivos e executar `adb -s <serial> reverse tcp:8081 tcp:8081`. Isso encaminha a porta do dispositivo à porta publicada no Windows. Abrir no development client a URL do Metro em `http://127.0.0.1:8081`, pelo launcher ou deep link documentado e validado; não copiar uma URL com IP privado do contêiner. Configurar o endereço anunciado pelo Expo de forma consistente com esse caminho e validar carregamento do bundle e WebSocket/Fast Refresh.

Metro direto e Metro Docker usam a mesma porta e são alternativas: parar um antes de iniciar o outro. Dispositivo Android físico por USB pode usar o mesmo encaminhamento. Conexão LAN/tunnel é alternativa documentada, não caminho obrigatório: LAN exige endereço alcançável do Windows e publicação/firewall adequados; tunnel exige rede externa e pode exigir serviços adicionais. Nunca usar `localhost` do telefone como se fosse o computador sem encaminhamento.

Fonte: [conectando development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/). Os comandos finais e o endereço anunciado serão registrados após validação real do SDK escolhido.

### 5. Opções de emulador

| Opção | Aplicação ao projeto | Preparação a documentar |
| --- | --- | --- |
| Android Studio + Android Emulator | Recomendada no Windows | Instalar versão estável, SDK/Platform Tools/Emulator, JDK compatível; ativar virtualização e aceleração suportada; criar AVD no Device Manager com imagem compatível e iniciar o dispositivo |
| Android SDK por linha de comando | Alternativa sem IDE completa; usa o mesmo emulador | Instalar ferramentas oficiais, plataforma/imagem/emulador, aceitar licenças, configurar `ANDROID_HOME` e PATH; criar e iniciar AVD pelas ferramentas disponíveis na versão instalada |
| Android físico por USB | Alternativa quando falta RAM ou virtualização | Ativar depuração USB, autorizar computador, verificar ADB, instalar development build e encaminhar a porta |
| Xcode + iOS Simulator | Simulação iOS local somente em macOS | Instalar Xcode e runtime; gerar development build iOS e abrir no Simulator |

No Windows não há simulador iOS local oficial. Dispositivo iOS com development build ou serviço remoto são alternativas com requisitos próprios de assinatura/conta, fora da validação local Android desta etapa. O código/configuração deve continuar compatível com iOS, mas não declarar teste nativo iOS realizado sem Mac/dispositivo disponível.

Fontes: [Android com Expo](https://docs.expo.dev/workflow/android-studio-emulator/), [ferramentas de emulador Android](https://developer.android.com/studio/run/emulator-commandline), [simulador iOS](https://docs.expo.dev/workflow/ios-simulator/).

### 6. Verificação proporcional

Executar instalação limpa, checagem TypeScript, lint, Expo Doctor e exportação de bundles Android/iOS para detectar problemas JavaScript. Exportar bundle não comprova build nativo: validar separadamente um development build Android e abertura real no emulador com Metro direto e Docker. Registrar screenshot/log e comprovar edição de texto nos dois modos. Validar `docker compose ... config`, imagem e startup mobile; conferir que a composição padrão/produção não inclui mobile. Não criar testes unitários que apenas confiram textos constantes.

## Risks / Trade-offs

- [Transição do Expo Go] → usar development build e fixar dependências compatíveis.
- [Virtualização, RAM ou Android SDK ausentes] → documentar requisitos e alternativa Android USB; instalação de emulador permanece escolha do usuário. Se indisponível na implementação, registrar bloqueio de validação visual, sem substituir por sucesso de exportação.
- [Docker Desktop/Windows não propaga eventos de arquivo] → validar Fast Refresh no bind mount; ajustar o watcher suportado pelo Metro se necessário e documentar a solução realmente testada.
- [IP anunciado inacessível ou porta ocupada] → usar encaminhamento ADB e endereço explícito; diagnosticar porta 8081 e impedir dois servidores simultâneos.
- [Caminho com acento causa falha em ferramenta Android] → testar o caminho atual; documentar uso de checkout em caminho simples como alternativa caso o erro seja comprovado, sem mover o repositório automaticamente.
- [Diferenças entre host e contêiner] → alinhar Node/lockfile e isolar dependências por sistema operacional.

## Migration Plan

Entrega aditiva: primeiro criar app e validar Metro direto; depois adicionar Compose e validar a conexão no mesmo development client; por fim publicar instruções de setup e evidências. Não há migração de dados ou deploy de servidor. Rollback consiste em parar o Compose mobile e reverter os arquivos desta mudança, preservando volumes e serviços existentes.
