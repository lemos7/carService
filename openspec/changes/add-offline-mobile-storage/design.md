# Design

## Context

Ver `proposal.md` para motivação e escopo. O código mobile usa Expo `~58.0.17`, React Native `0.88.0`, Expo Router e React Context. `MaintenanceProvider` acessa diretamente `components/manutencoes/storage.ts`, que grava JSON e PDF em `Paths.cache/maintenance-records`. `demoVehicles` alimenta lista e rotas; `Overview` contém números fixos. Login apenas navega, cadastro mostra um aviso e recuperação tenta chamar a API quando `EXPO_PUBLIC_API_URL` existe.

Não há testes mobile configurados em `package.json`; existem scripts de lint, typecheck e export. O README ainda descreve principalmente o bootstrap. A especificação pendente `bootstrap-expo-mobile/mobile-runtime` exige independência das APIs, que deve ser preservada; o texto da tela inicial dessa mudança não descreve mais todas as telas presentes. Esta proposta não reescreve aquele planejamento.

## Goals / Non-Goals

**Goals:** separar interface, contratos assíncronos e armazenamento; garantir durabilidade e consistência; permitir falhas reproduzíveis para aprendizado sem um processo de servidor.

**Non-Goals:** replicar os três microsserviços, introduzir servidor HTTP embarcado, ORM, fila de sincronização, multiusuário ou uma fronteira de segurança baseada no login demonstrativo. Não expandir os módulos ainda não implementados.

## Decisions

### 1. SQLite direto, com inicialização única

Instalar via `npx expo install expo-sqlite`, preservando o SDK 58 e usando APIs assíncronas da versão compatível. O banco `garagem-em-dia.db` ficará na localização persistente padrão do módulo. Usar `SQLiteProvider` na composição raiz e uma inicialização compartilhada antes de liberar os serviços; renderizar carregamento ou erro com nova tentativa, sem apagar o banco em caso de falha. Ativar chaves estrangeiras, WAL e migrações sequenciais transacionais com `PRAGMA user_version`; recusar escrita em versões futuras desconhecidas.

SQLite permite relações, índices e transações entre manutenção e hodômetro. JSON/AsyncStorage exigiriam reimplementar essas garantias. Um ORM adicionaria uma segunda abstração e ferramentas desnecessárias para duas entidades. React Context permanece responsável pelo estado de tela, não pela persistência.

Referências consultadas para SDK 58: [SQLite](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/) e [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/). A implementação deve confirmar a assinatura das APIs da versão instalada antes de codificar.

### 2. Modelo mínimo de dados

| Tabela | Conteúdo e restrições |
| --- | --- |
| `vehicles` | `id` textual estável, modelo, ano, placa normalizada única na garagem, cor, motor e hodômetro inteiro não negativo |
| `maintenance_records` | `id` textual único, FK do veículo, data civil `YYYY-MM-DD`, custo inteiro em centavos, categoria, quilometragem, detalhes, instante de criação; metadados opcionais do PDF e caminho relativo |
| `app_metadata` | marcadores de seed e versão de importação concluída |
| `legacy_imports` | arquivo/identificador legado, resultado e diagnóstico para retomar importações sem duplicação |

Criar índice de histórico por veículo/data. Preservar os DTOs existentes na fronteira, convertendo centavos para o `cost` atual; validar limites e precisão antes da conversão. Nunca inferir zero para custo ilegível. O seed contém o Vectra atual com ID `vectra-demo`; inserir seed e marcador na mesma transação, sem sobrescrever em cada abertura. Não criar usuários ou tabela de senhas. O nome exibido será o de uma pessoa demonstrativa fixa, sem alegar que o e-mail seleciona dados distintos.

### 3. Contratos assíncronos e adaptador local

Criar contratos tipados em `src/services/`, infraestrutura em `src/data/` e tipos de domínio fora de `src/app/`. A direção será: tela/hook → contrato de serviço → adaptador local → repositório SQLite/arquivos. Serviços cobrem listar/consultar veículos, obter resumo, listar/criar manutenção e responder aos formulários demonstrativos. Não adicionar adaptador remoto nesta mudança.

Um invólucro configurável aplica atraso fixo (padrão demonstrativo de 250 ms, zero nos testes) e uma falha de próxima operação selecionada apenas em desenvolvimento/testes. Falhas são disparadas antes da execução, nunca após um commit, e consumidas uma vez. Não usar aleatoriedade, timers persistentes ou polling. Expor erros tipados de validação, ausência, conflito e persistência, traduzidos em mensagens na UI; não vazar SQL/caminhos internos.

Queries usarão parâmetros vinculados. A criação de manutenção valida os dados e a existência do veículo na camada de serviço; usa uma transação exclusiva para inserir o registro e atualizar o hodômetro com o maior valor entre o atual e o informado. Entradas históricas são aceitas. Repetição de ID com payload idêntico retorna o registro já salvo; payload diferente produz conflito. O formulário mantém o mesmo ID ao repetir a mesma tentativa, e uma nova operação recebe outro ID.

### 4. PDFs e importação legada

Reutilizar `expo-file-system` com `Paths.document`, mantendo arquivos em um subdiretório próprio. O banco guarda caminhos relativos gerados internamente; nomes originais servem apenas para exibição. Resolver o diretório atual ao ler, evitando depender de caminhos absolutos antigos do sandbox.

Para uma nova manutenção com PDF: validar extensão/tamanho com as regras atuais, copiar para arquivo temporário próprio, promover para destino estável e só então confirmar registro e hodômetro na transação SQLite. Se a cópia falhar, não gravar registro. Se a transação falhar, tentar limpar apenas os arquivos criados por essa operação; se o processo morrer entre etapas, reconciliar arquivos temporários/órfãos no próximo início sem remover anexos referenciados. Serializar gravações/importação e usar a mesma fila para reconciliação, evitando apagar arquivos em uso. Nunca sobrescrever anexo de um ID já confirmado.

Importar depois do schema/seed e antes de liberar gravações. Ler apenas `.json` confirmados da pasta legada, validar com o decoder existente reforçado para limites numéricos e caminhos, e aceitar somente PDFs dentro da pasta legada esperada. Não confiar em URI arbitrária contida no JSON. Para cada registro válido, copiar seu PDF disponível e confirmar registro, ajuste de hodômetro e marcador de importação na mesma transação. Se o PDF estiver ausente, importar os dados com status de anexo indisponível. ID existente com conteúdo incompatível, veículo desconhecido ou JSON inválido gera diagnóstico e preserva a origem; nunca inventar vínculo.

Arquivos `.pending` não são importados. A importação mantém originais, continua para outros registros e apresenta aviso resumido com nova tentativa. Problemas corrigíveis não recebem marcador de sucesso; uma falha de armazenamento impede liberar escritas até nova tentativa. Um encerramento inesperado repete somente itens não confirmados, reconhece os já importados e reconcilia arquivos órfãos. Depois da migração, as novas gravações usam exclusivamente SQLite/documentos; não há escrita dupla.

### 5. Integração e acesso demonstrativo

Substituir referências de leitura a `demoVehicles` nas rotas `veiculo` e `registrar-manutencao` e na lista por serviços. Após salvar, publicar uma atualização consistente de histórico, veículos e resumo; falha ao atualizar uma leitura deve ser mostrada como erro de atualização, sem tratar um commit bem-sucedido como falha de salvamento. Não mostrar dados antigos como se fossem atuais.

`Overview` calcula contagem e quilometragem dos veículos persistidos. Avisos continuam explicitamente ilustrativos e consumo permanece vazio, sem introduzir lançamentos fictícios. Manter ações ainda não implementadas desabilitadas, corrigindo textos que hoje dizem que o registro de manutenção inteiro está indisponível.

Login e cadastro continuam validando campos, passam por serviço demonstrativo e abrem a mesma garagem com indicação clara de simulação. Senhas ficam somente no formulário e são descartadas após a operação; não são logadas, enviadas ou persistidas. O fluxo de recuperação retorna “Simulação concluída. Nenhum e-mail foi enviado.” e não altera credenciais. Retirar sua dependência de `EXPO_PUBLIC_API_URL`. Sair retorna ao acesso e não apaga dados. Abertura normal do app mostra o acesso, sem sessão persistida; essas telas não são proteção de acesso aos arquivos locais.

## Risks / Trade-offs

- Cache legado já eliminado → não é recuperável; documentar a limitação e migrar apenas o que ainda existe.
- Banco e arquivos não compartilham uma transação → ordenar cópia antes de commit e reconciliar somente arquivos próprios sem referência.
- Dados locais podem ser removidos ao desinstalar/limpar dados do app → documentar; backup/exportação ficam para outra mudança.
- Login demonstrativo pode parecer autenticação → identificar a simulação e a garagem única; não guardar credenciais.
- Testes com substitutos não comprovam SQLite nativo → executar cenários de transação, reinício, anexos e migração em dispositivo/emulador.
- Desenvolvimento ainda precisa do Metro → iniciar diretamente no host com emulador; validar modo avião em build com bundle embarcado. Docker e APIs não são necessários.
- iOS não pode ser simulado localmente no Windows → verificar em Mac quando disponível e registrar explicitamente a limitação, sem chamar exportação de teste em simulador.

## Migration Plan

1. Adicionar dependência e reconstruir o development client quando necessário; não editar diretórios nativos gerados manualmente.
2. Introduzir contratos, schema, seed e repositórios; verificar schema novo e atualização sem perda.
3. Introduzir arquivos persistentes e importação recuperável; validar fixtures de registros antigos, erros e interrupções.
4. Conectar telas e simulação de acesso; atualizar documentação de execução sem APIs.
5. Validar reinício, limpeza apenas de cache e modo offline, além de typecheck/lint/export.

Reversão de código não deve apagar banco, documentos ou originais. A versão anterior não entende o novo banco e não verá gravações novas; não prometer downgrade transparente nem regenerar o cache automaticamente. Preferir corrigir com nova migração; preservar os arquivos para diagnóstico antes de qualquer reversão manual.
