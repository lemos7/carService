# Tasks

## 1. Banco e contratos locais

- [ ] 1.1 Instalar `expo-sqlite` com o instalador Expo compatível com SDK 58, atualizar lockfile e compor inicialização única em `_layout.tsx`; verificar instalação, typecheck e abertura com estados de carregamento/erro/nova tentativa.
- [x] 1.2 Criar schema, índices, chaves estrangeiras, migrações transacionais versionadas e seed único `vectra-demo`; verificar banco vazio, reabertura, upgrade com dados, rollback de migração e rejeição de versão futura em banco de teste.
- [x] 1.3 Definir DTOs, erros tipados e contratos assíncronos para veículos, resumo, manutenções e acesso demonstrativo fora de `src/app/`; verificar compilação estrita e ausência de imports de SQLite nos componentes consumidores.
- [x] 1.4 Implementar repositórios com parâmetros vinculados, conversão monetária em centavos e transação manutenção/hodômetro; adicionar verificação de entrada histórica, veículo ausente, payload inválido, ID repetido idêntico/conflitante e rollback sem atualização parcial.
- [x] 1.5 Documentar em `mobile/README.md` a arquitetura local, garagem única e limites de durabilidade; conferir que comandos de execução usam somente Metro e emulador, sem APIs ou Docker obrigatório.

## 2. Anexos e compatibilidade com dados existentes

- [x] 2.1 Implementar armazenamento de PDFs em documentos com caminhos relativos, staging e compensação de falhas; verificar PDF válido, arquivo ausente/inválido, falha de cópia e falha de commit, preservando registros e anexos já confirmados.
- [x] 2.2 Implementar importação legada validada por registro, com marcadores transacionais, diagnósticos e nova tentativa; verificar fixtures com JSON válido/inválido, PDF ausente, `.pending`, veículo desconhecido, caminho externo e ID conflitante, sem excluir fontes.
- [x] 2.3 Serializar gravações/importação e reconciliar somente temporários/órfãos próprios; verificar interrupções antes/depois do commit, repetição da importação sem duplicação e preservação de PDFs referenciados.
- [ ] 2.4 Mostrar avisos de migração e anexos indisponíveis sem esconder histórico válido; documentar migração, impossibilidade de recuperar cache já apagado e limitações de downgrade; conferir os avisos com fixtures de falha.

## 3. Serviços e integração das telas

- [x] 3.1 Implementar adaptador local com latência fixa configurável e falha única por operação em desenvolvimento/testes; adicionar testes determinísticos de pendência, sucesso, erro antes da gravação e repetição bem-sucedida, sem chamadas HTTP.
- [ ] 3.2 Adaptar `MaintenanceProvider` e formulário para usar os serviços e manter ID estável por tentativa; verificar bloqueio de envio duplicado, preservação do formulário em erro e atualização somente após commit.
- [ ] 3.3 Substituir `demoVehicles` como fonte ativa na lista e nas rotas de detalhe/registro; verificar carregamento, lista vazia, erro com nova tentativa e veículo inexistente como estados distintos.
- [ ] 3.4 Conectar contagem/quilometragem da visão geral e atualização de histórico aos dados confirmados; verificar manutenção com hodômetro maior/menor, consistência entre telas e erro de refresh sem reenviar uma gravação já concluída.
- [x] 3.5 Identificar alertas ilustrativos e ajustar textos de ações disponíveis, preservando módulos ainda não implementados; verificar que não há promessa de cadastro de veículos, consumo ou relatórios funcionais nesta etapa.
- [ ] 3.6 Documentar configuração de atraso e falha de próxima operação; executar o exemplo documentado e conferir que o comportamento normal não contém falhas aleatórias.

## 4. Fluxos demonstrativos de acesso

- [ ] 4.1 Conectar login/cadastro ao serviço local com carregamento e erro, mantendo validações e identificação de simulação; verificar acesso à mesma garagem, descarte de senha e ausência de credenciais em banco, arquivos e logs.
- [x] 4.2 Substituir a recuperação HTTP por resposta local explícita sem envio de e-mail; verificar entrada inválida, sucesso, falha simulada e ausência de requisições mesmo com `EXPO_PUBLIC_API_URL` configurada.
- [ ] 4.3 Ajustar saudação, saída e abertura normal sem sessão persistida; verificar que sair/reabrir volta ao acesso e mantém histórico. Documentar que os formulários não são autenticação real nem isolamento de usuários.

## 5. Validação integrada

- [x] 5.1 Executar `npm run typecheck`, `npm run lint`, testes adicionados e `npm run export` em `mobile/`; registrar resultados e corrigir falhas antes de concluir.
- [ ] 5.2 No Android, validar início sem backend, leitura e gravação com PDF, falha e retry, reinício, migração interrompida e limpeza somente do cache; registrar evidências em `mobile/VALIDATION.md` sem apagar dados reais do usuário.
- [ ] 5.3 Validar os fluxos em build Android com bundle embarcado e rede desligada, incluindo recuperação simulada; confirmar ausência de dependência do Metro/APIs e registrar resultado separadamente da exportação JavaScript.
- [x] 5.4 Repetir os cenários essenciais de persistência/anexos no simulador iOS quando houver macOS/Xcode; se indisponível, registrar explicitamente essa limitação em `mobile/VALIDATION.md`, sem afirmar cobertura nativa iOS.
