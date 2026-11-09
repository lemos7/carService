# Alterações na especificação

## Purpose

Permitir demonstrar os fluxos existentes do aplicativo com respostas assíncronas locais, exercitando carregamento e falhas sem executar um backend.

## ADDED Requirements

### Requirement: Fluxos independentes do backend
O aplicativo DEVE (SHALL) executar acesso demonstrativo, listagem e detalhes de veículos, histórico e registro de manutenções sem processos de backend, acesso à internet, credenciais de API ou requisições HTTP de dados de negócio. Uma URL de API configurada NÃO DEVE (SHALL NOT) habilitar acesso à rede nesse modo local.

#### Scenario: Sessão offline
- **WHEN** o aplicativo instalado com o pacote JavaScript embarcado é executado sem rede e o usuário acessa a demonstração, abre um veículo e salva uma manutenção
- **THEN** essas operações são concluídas com os dados do dispositivo e nenhuma requisição de rede para dados de negócio é tentada

#### Scenario: Sessão de desenvolvimento
- **WHEN** apenas o emulador e o Metro estão em execução e uma URL de API está configurada no ambiente
- **THEN** os mesmos fluxos de negócio usam serviços locais e não dependem dessa URL

### Requirement: Operações assíncronas observáveis
O aplicativo DEVE (SHALL) expor estados de processamento, sucesso e falha nas operações dos serviços locais. A configuração de desenvolvimento DEVE (SHALL) permitir latência fixa e falha determinística na próxima operação selecionada, sem falhas aleatórias no uso normal. Falhas simuladas DEVEM (SHALL) ocorrer antes de alterações na persistência.

#### Scenario: Gravação com atraso
- **WHEN** uma manutenção válida é salva com latência simulada
- **THEN** o formulário exibe o progresso, impede envios duplicados e informa sucesso somente após a conclusão da persistência

#### Scenario: Falha controlada e nova tentativa
- **WHEN** a próxima gravação está configurada para falhar e o usuário envia o formulário e depois tenta novamente
- **THEN** a primeira tentativa exibe um erro sem alterar os dados armazenados, preserva os valores do formulário e a nova tentativa pode ser concluída sem duplicar o histórico

### Requirement: Telas refletem os dados locais
Listas e detalhes de veículos, histórico de manutenções, contagem de veículos e quilometragem total DEVEM (SHALL) refletir os registros locais confirmados. Carregamento DEVE (SHALL) ser distinto de dados vazios ou ausentes; erros de leitura DEVEM (SHALL) permitir nova tentativa. Alertas ilustrativos e recursos de consumo não implementados DEVEM (SHALL) ser identificados claramente, sem apresentar resultados persistidos inventados.

#### Scenario: Atualização após gravação
- **WHEN** uma manutenção avança o hodômetro de um veículo
- **THEN** o histórico, os detalhes do veículo e a visão geral exibem valores confirmados e consistentes, sem reiniciar o aplicativo

#### Scenario: Falha na leitura
- **WHEN** a leitura de um veículo falha
- **THEN** a tela exibe um erro com opção de nova tentativa, em vez de uma garagem vazia ou de um resultado de veículo não encontrado

#### Scenario: Veículo ausente
- **WHEN** uma leitura bem-sucedida não encontra um veículo para o identificador da rota
- **THEN** a tela informa que o veículo não foi encontrado e oferece navegação de volta à lista

### Requirement: Acesso demonstrativo explícito
Login e cadastro DEVEM (SHALL) se identificar como simulações de uma única garagem local, manter a validação dos formulários e usar respostas locais assíncronas. NÃO DEVEM (SHALL NOT) persistir senhas ou registrá-las em logs, alegar autenticação real ou criar contas isoladas. Sair DEVE (SHALL) preservar os dados da garagem e retornar à tela de acesso.

#### Scenario: Login ou cadastro
- **WHEN** o usuário envia campos válidos em qualquer um dos formulários de acesso demonstrativo
- **THEN** a resposta local abre a mesma garagem após o carregamento, sem armazenar a senha informada ou alegar a criação de uma conta no servidor

#### Scenario: Saída e reabertura
- **WHEN** o usuário sai ou reinicia o aplicativo
- **THEN** a tela de acesso é exibida e a garagem persistida permanece intacta

### Requirement: Simulação transparente da recuperação de senha
A recuperação de senha DEVE (SHALL) retornar uma resposta demonstrativa local e assíncrona para dados válidos, sem requisição externa, promessa de entrega de e-mail ou alteração de credenciais.

#### Scenario: Recuperação simulada
- **WHEN** o usuário informa um e-mail válido na recuperação de senha
- **THEN** uma mensagem informa explicitamente que a operação foi simulada e que nenhum e-mail foi enviado
