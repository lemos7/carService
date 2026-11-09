# Proposal

## Why

O Garagem em Dia precisa de uma aplicação móvel independente do site Angular, preparada para futuramente consumir as mesmas APIs. Esta entrega estabelece somente uma base Expo que possa ser iniciada, visualizada e editada localmente, incluindo uma opção de servidor de desenvolvimento em Docker.

## What Changes

- Criar `mobile/` com React Native, Expo e TypeScript, dependências e lockfile próprios, e uma tela inicial identificada como Garagem em Dia.
- Usar a versão estável mais recente do Expo: SDK 58, confirmada em 22/10/2026, com React e React Native nas versões compatíveis do template oficial. Revalidar estabilidade na implementação e registrar as versões efetivamente utilizadas.
- Disponibilizar scripts para iniciar Metro e gerar/executar um development build Android no host, com instruções para iOS em macOS.
- Adicionar Compose opt-in para executar Metro em Docker, com atualização de código e conexão ao emulador no host.
- Documentar instalação de emulador Android por Android Studio e por ferramentas de linha de comando, além das alternativas de dispositivo físico e simulador iOS em Mac.
- Manter o projeto móvel separado do Angular: nenhum compartilhamento de componentes, comunicação entre interfaces ou dependência de disponibilidade do backend nesta etapa.

Fora de escopo: autenticação, consumo da API, telas de negócio, notificações, sincronização offline, publicação em lojas, builds de produção e instalação automática de ferramentas no computador do usuário.

## Capabilities

### New Capabilities

- `mobile-runtime`: inicialização e exibição da aplicação móvel independente, com desenvolvimento direto ou via Metro em Docker.

### Modified Capabilities

Nenhuma.

## Impact

Novos arquivos em `mobile/` e `docker-compose.mobile.yml`; ajustes documentais no README raiz e regras de arquivos gerados no `.gitignore`. O Compose adicional será exclusivo de desenvolvimento e não será carregado automaticamente. APIs, dados, autenticação, aplicação Angular e configuração de produção permanecem compatíveis. Android SDK/JDK e emulador são pré-requisitos do host para o caminho nativo local; Docker fornece Node/Metro, não o dispositivo virtual.
