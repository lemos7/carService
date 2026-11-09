# Proposal

## Why

O aplicativo precisa funcionar sem as APIs .NET, pois executar servidor e emulador simultaneamente excede os recursos da máquina de desenvolvimento. Hoje os veículos são constantes e as manutenções/PDFs ficam no cache; uma base local persistente permite demonstrar e aprender os fluxos com comportamento assíncrono semelhante ao de uma API.

## What Changes

- Adicionar SQLite no aplicativo Android/iOS como fonte dos veículos demonstrativos e das manutenções, com inicialização e migrações versionadas.
- Criar uma interface de serviços assíncronos e um adaptador local, com latência configurável e falhas determinísticas para desenvolvimento, sem servidor HTTP nem chamadas às APIs.
- Migrar os registros JSON existentes de forma idempotente; guardar PDFs no diretório de documentos do aplicativo.
- Conectar lista, detalhes, registro de manutenção e indicadores de veículos/quilometragem aos serviços locais, com estados de carregamento, erro e nova tentativa.
- Manter uma única garagem demonstrativa por instalação. Login e cadastro serão simulações claramente identificadas, sem guardar senhas; recuperação de senha simulará a resposta sem prometer envio de e-mail.
- Preservar os limites da demonstração: alertas ainda ilustrativos e consumo sem lançamentos. Não implementar nesta mudança cadastro/edição de veículos, abastecimentos, relatórios, autenticação real, backup, nuvem ou sincronização.

## Capabilities

### New Capabilities

- `mobile-local-data`: persistência, inicialização, migração e integridade dos veículos, manutenções e anexos locais.
- `mobile-service-simulation`: acesso assíncrono local, comportamento de falhas/carregamento e fluxos demonstrativos sem backend.

### Modified Capabilities

Nenhuma. O catálogo principal ainda não contém especificações. A mudança em andamento `bootstrap-expo-mobile` define execução independente; esta proposta mantém essa independência e avança os fluxos que já existem no código, sem alterar seus artefatos.

## Impact

- Apenas `mobile/`: nova dependência `expo-sqlite` compatível com Expo 58 e atualização do lockfile; reutilização de `expo-file-system`.
- Nova camada de dados/serviços fora de `src/app/`; integração com `_layout.tsx`, `MaintenanceProvider`, telas de veículos, visão geral e formulários demonstrativos de acesso.
- Substituição de `components/manutencoes/storage.ts` como fonte ativa; importação compatível de `cache/maintenance-records`.
- Documentação e validação em Android/iOS, com execução somente do Metro e emulador durante desenvolvimento. Build com bundle embarcado para validar ausência de dependência do Metro em execução distribuída.
- Backend, frontend Angular e deploy existentes não precisam executar nem ser modificados.
