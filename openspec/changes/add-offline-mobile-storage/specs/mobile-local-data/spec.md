# Alterações na especificação

## Purpose

Preservar os dados da garagem demonstrativa no próprio dispositivo e permitir continuar o histórico de manutenções sem depender de um servidor.

## ADDED Requirements

### Requirement: Registros locais persistentes
O aplicativo DEVE (SHALL) manter veículos e manutenções salvas no dispositivo após reinícios do processo e limpeza normal do cache. Cada instalação DEVE (SHALL) ter uma única garagem demonstrativa compartilhada, independentemente do e-mail informado nas telas de acesso demonstrativo.

#### Scenario: Reabertura após salvar
- **WHEN** o usuário salva uma manutenção, fecha o aplicativo, limpa apenas o cache e o reabre
- **THEN** o veículo e o registro continuam disponíveis com os mesmos identificadores e valores

#### Scenario: Novo acesso à demonstração
- **WHEN** o usuário sai e entra novamente com outro e-mail demonstrativo
- **THEN** a mesma garagem e o mesmo histórico são exibidos, sem alegar isolamento entre contas

### Requirement: Inicialização e atualizações seguras
O aplicativo DEVE (SHALL) inicializar e atualizar o armazenamento local antes de permitir operações dependentes, preservar os registros existentes durante atualizações e inserir o veículo demonstrativo apenas uma vez. Falhas de inicialização DEVEM (SHALL) permitir nova tentativa sem redefinir os dados silenciosamente.

#### Scenario: Primeira abertura e aberturas seguintes
- **WHEN** o aplicativo é aberto em uma nova instalação e depois reaberto
- **THEN** existe exatamente um registro do veículo demonstrativo e seus valores salvos não são redefinidos

#### Scenario: Falha na atualização
- **WHEN** uma atualização falha ou o formato armazenado é mais recente do que o aplicativo suporta
- **THEN** as gravações dependentes são bloqueadas, os dados existentes são preservados e um erro claro é exibido com uma ação para tentar novamente

### Requirement: Consistência das manutenções
O aplicativo DEVE (SHALL) validar os dados da manutenção e a existência do veículo antes de salvar. A gravação da manutenção e o avanço do hodômetro DEVEM (SHALL) ser atômicos. Lançamentos históricos DEVEM (SHALL) ser aceitos sem reduzir o hodômetro atual. A repetição de uma solicitação idêntica com o mesmo identificador NÃO DEVE (SHALL NOT) duplicar o registro.

#### Scenario: Manutenção salva com sucesso
- **WHEN** uma manutenção válida é salva com quilometragem superior à do hodômetro atual
- **THEN** o lançamento no histórico e o novo hodômetro aparecem juntos nos detalhes do veículo e na visão geral

#### Scenario: Manutenção histórica
- **WHEN** um lançamento histórico válido tem quilometragem inferior à do hodômetro atual
- **THEN** o registro é salvo e o hodômetro permanece inalterado

#### Scenario: Gravação rejeitada
- **WHEN** o veículo não existe, um dado informado é inválido ou a persistência falha
- **THEN** nenhuma alteração parcial no histórico ou no hodômetro é publicada e o formulário continua disponível para correção ou nova tentativa

#### Scenario: Solicitação duplicada
- **WHEN** uma solicitação já confirmada é repetida com o mesmo identificador e os mesmos dados
- **THEN** o registro existente é retornado sem adicionar outro lançamento

### Requirement: Persistência das notas fiscais anexadas
O aplicativo DEVE (SHALL) manter as notas fiscais PDF válidas selecionadas no armazenamento persistente próprio e associá-las às manutenções salvas. Uma nova gravação com anexo DEVE (SHALL) falhar se o anexo não puder ser preservado. A ausência de anexos em registros antigos NÃO DEVE (SHALL NOT) impedir a leitura dos dados da manutenção.

#### Scenario: Anexo preservado após remoção dos arquivos temporários
- **WHEN** uma manutenção com PDF é salva e o arquivo original do seletor e o cache do aplicativo são removidos
- **THEN** o registro salvo continua referenciando um PDF existente e legível com seu nome de exibição original

#### Scenario: Falha na cópia do arquivo
- **WHEN** uma nota fiscal não pode ser copiada para o armazenamento persistente
- **THEN** a operação informa a falha e nenhuma nova manutenção ou atualização do hodômetro é confirmada

#### Scenario: Anexo antigo ausente
- **WHEN** um registro antigo referencia um PDF que não existe mais
- **THEN** os detalhes da manutenção continuam visíveis e o anexo é identificado como indisponível

### Requirement: Importação recuperável dos dados legados
O aplicativo DEVE (SHALL) importar registros legados válidos e confirmados em JSON sem duplicação, preservar os arquivos de origem e informar registros inválidos ou PDFs indisponíveis sem bloquear o histórico válido. Importações interrompidas DEVEM (SHALL) ser retomadas com segurança. Registros de veículos desconhecidos DEVEM (SHALL) ser preservados para revisão, sem atribuição a outro veículo.

#### Scenario: Registros existentes no cache
- **WHEN** uma instalação com registros legados e PDFs válidos abre a nova versão pela primeira vez
- **THEN** esses registros e os PDFs disponíveis passam ao armazenamento persistente, mantendo seus identificadores e valores

#### Scenario: Importação interrompida ou repetida
- **WHEN** uma importação é interrompida e o aplicativo é reaberto ou a importação é repetida
- **THEN** os registros confirmados permanecem únicos, os demais registros válidos são importados e os arquivos de origem permanecem intactos

#### Scenario: Combinação de arquivos válidos e danificados
- **WHEN** o armazenamento legado contém um registro válido, um JSON malformado, um registro de veículo desconhecido, um arquivo pendente incompleto e um PDF ausente
- **THEN** os registros válidos são importados, os PDFs ausentes são identificados como indisponíveis, os arquivos incompletos não são tratados como registros confirmados e avisos com orientações identificam os registros que exigem atenção, sem excluí-los
