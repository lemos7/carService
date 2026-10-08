# Spec Delta

## Purpose

Permitir que o usuário obtenha um documento PDF consolidado e portátil com os dados, custos, consumo e histórico de manutenção de um veículo cadastrado.

## ADDED Requirements

### Requirement: Download autenticado do relatório
O sistema SHALL fornecer uma operação autenticada que gere um relatório PDF somente para um veículo pertencente ao usuário atual.

#### Scenario: Relatório de veículo próprio
- **WHEN** o usuário autenticado solicita o relatório de um veículo que lhe pertence
- **THEN** o sistema responde com um arquivo `application/pdf` para download
- **AND** o nome do arquivo identifica o veículo e a data de geração

#### Scenario: Veículo inexistente ou de outro usuário
- **WHEN** o usuário solicita o relatório de um veículo inexistente ou pertencente a outro usuário
- **THEN** o sistema responde como veículo não encontrado
- **AND** não revela se o identificador pertence a outro usuário

### Requirement: Conteúdo cadastral do veículo
O relatório SHALL apresentar a data de geração, modelo, ano, placa, cor, motor, quilometragem atual e foto disponível do veículo.

#### Scenario: Veículo com foto
- **WHEN** o veículo possui uma foto acessível no momento da geração
- **THEN** o relatório inclui a foto e todos os dados cadastrais

#### Scenario: Veículo sem foto
- **WHEN** o veículo não possui foto ou a imagem não pode ser carregada
- **THEN** o relatório é gerado sem a foto e preserva os demais dados

### Requirement: Período do relatório
O sistema SHALL gerar o histórico completo quando nenhum período for informado e SHALL aceitar datas inicial e final inclusivas para filtrar dados históricos e totais derivados.

#### Scenario: Histórico completo
- **WHEN** a solicitação não contém datas inicial e final
- **THEN** o relatório considera todos os abastecimentos, serviços realizados e lembretes do veículo

#### Scenario: Período válido
- **WHEN** a solicitação contém data inicial e final válidas e a inicial não é posterior à final
- **THEN** abastecimentos e serviços realizados são limitados às datas inclusivas informadas
- **AND** os totais e indicadores são calculados a partir dos registros incluídos

#### Scenario: Período inválido
- **WHEN** apenas uma das datas é informada ou a data inicial é posterior à final
- **THEN** o sistema rejeita a solicitação como inválida sem gerar o PDF

### Requirement: Resumo de custos e consumo
O relatório SHALL calcular na API os totais de combustível e manutenção, o total geral, a distância abastecida, os litros, o consumo médio ponderado, o preço médio por litro e o custo de combustível por quilômetro.

#### Scenario: Indicadores com registros válidos
- **WHEN** o período contém abastecimentos e serviços realizados com os campos necessários
- **THEN** o PDF apresenta os indicadores calculados sobre a soma das distâncias, litros e valores válidos
- **AND** apresenta custos de manutenção agrupados por categoria

#### Scenario: Indicador sem denominador válido
- **WHEN** não há litros ou distância válidos para um indicador
- **THEN** o PDF apresenta o indicador como não disponível, sem divisão por zero

### Requirement: Históricos detalhados
O relatório SHALL listar separadamente abastecimentos, serviços realizados e lembretes de manutenção para evitar que um lembrete concluído seja contabilizado como serviço com custo.

#### Scenario: Dados históricos existentes
- **WHEN** existem registros para o veículo no escopo solicitado
- **THEN** o PDF lista abastecimentos com data, quilometragem, litros e custo
- **AND** lista serviços realizados com data, quilometragem, categoria, descrição, custo e indicação de comprovante
- **AND** lista lembretes com título, vencimento, aviso, recorrência e estado atual

#### Scenario: Categoria sem registros
- **WHEN** uma categoria de histórico não possui registros no escopo solicitado
- **THEN** o PDF identifica explicitamente que não há registros nessa categoria

### Requirement: Tratamento de dados legados incompletos
O sistema MUST preservar registros legados no histórico, marcar campos ausentes como não informados e excluir dos cálculos somente registros sem os dados necessários ao indicador.

#### Scenario: Registro legado sem data ou custo
- **WHEN** um serviço realizado não possui data ou custo
- **THEN** o registro permanece visível no histórico com os campos ausentes identificados
- **AND** o relatório informa quantos registros foram omitidos dos totais por insuficiência de dados

### Requirement: Experiência de download no perfil
O perfil do veículo SHALL oferecer uma ação de geração do relatório e SHALL comunicar o andamento e eventuais falhas sem abandonar os dados já exibidos.

#### Scenario: Download concluído
- **WHEN** o usuário aciona a geração e a API responde com sucesso
- **THEN** o navegador baixa o PDF retornado pela API

#### Scenario: Falha na geração
- **WHEN** a API não consegue gerar o relatório
- **THEN** o perfil encerra o estado de carregamento e apresenta uma mensagem de erro acionável
