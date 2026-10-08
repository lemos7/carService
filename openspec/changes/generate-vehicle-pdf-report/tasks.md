# Tasks

## 1. Consulta interna do veículo

- [x] 1.1 Adicionar à API de veículos uma rota interna protegida por `X-Internal-Key` que consulte `vehicleId` e `userId` juntos e retorne o DTO mínimo do relatório; verificar com testes de API os casos próprio, outro usuário, inexistente e chave inválida.
- [x] 1.2 Criar na persistência da API de manutenção o cliente interno tipado para consultar os dados e carregar opcionalmente a foto, com tratamento explícito de 404 e indisponibilidade; verificar com testes usando respostas HTTP simuladas.

## 2. Agregação e regras do relatório

- [x] 2.1 Criar os modelos imutáveis de entrada e saída do relatório, incluindo período, seções históricas, totais, agrupamentos, indicadores e contagens de omitidos; verificar compilando a solução e exercitando a construção nos testes.
- [x] 2.2 Implementar a validação de `startDate`/`endDate` e o filtro inclusivo de abastecimentos e serviços, mantendo lembretes por quilometragem e serviços legados sem data em seção separada; verificar com testes para histórico completo, limites do período e combinações inválidas.
- [x] 2.3 Implementar os cálculos de distância, litros, combustível, manutenção, total geral, consumo médio ponderado, preço médio por litro, custo por quilômetro e custos por categoria; verificar com testes equivalentes aos casos de referência de `cost-analytics.ts`, incluindo coleções vazias e denominador zero.
- [x] 2.4 Montar o serviço agregador com consultas restritas ao usuário e leitura sem rastreamento, mantendo serviços, abastecimentos e lembretes em seções distintas; verificar com testes que dados de outro veículo ou usuário não entram no modelo.

## 3. Documento PDF e endpoint

- [x] 3.1 Adicionar QuestPDF à API de manutenção e configurar explicitamente a licença aplicável ao projeto; verificar que `dotnet restore` e `dotnet build backend/CarCare.sln` concluem sem erro.
- [x] 3.2 Implementar o renderizador paginado em `pt-BR` com cabeçalho, dados e foto do veículo, resumo, categorias, abastecimentos, serviços, lembretes, estados vazios e aviso de dados incompletos; verificar com testes que os bytes começam com a assinatura PDF e que o texto essencial pode ser extraído do documento.
- [x] 3.3 Expor `GET /api/maintenance/reports/vehicles/{vehicleId}` com período opcional, `application/pdf`, nome de arquivo seguro e respostas 400/404/erro de dependência adequadas; verificar com testes de API autenticados, inclusive tentativa de acessar veículo de outro usuário.
- [x] 3.4 Cobrir o relatório com um cenário de volume suficiente para produzir várias páginas e com foto ausente ou inválida; verificar que a geração conclui, todas as seções permanecem no texto extraído e o PDF pode ser aberto.

## 4. Download no perfil do veículo

- [x] 4.1 Adicionar ao cliente Angular o método de download como `Blob`, suporte aos parâmetros opcionais e leitura segura do nome em `Content-Disposition`; verificar com teste do serviço HTTP para URL, parâmetros e tipo de resposta.
- [x] 4.2 Adicionar ao perfil do veículo a ação “Baixar relatório”, com bloqueio durante a geração, criação e revogação da URL temporária e mensagem de erro acessível; verificar com teste do componente os fluxos de sucesso, clique duplicado e falha.
- [x] 4.3 Ajustar o estilo responsivo da ação conforme os componentes existentes; verificar com `npm test` e `npm run build` no frontend e inspeção do perfil em largura móvel e desktop.

## 5. Verificação integrada

- [x] 5.1 Executar os testes da solução e do frontend e corrigir qualquer regressão causada pela mudança; verificar que as suítes e builds existentes terminam com sucesso.
- [x] 5.2 Executar o fluxo pelo gateway com um usuário autenticado, dados próprios, registros incompletos e tentativa cruzada entre usuários; verificar o download, a abertura do PDF, os totais esperados e a ausência de vazamento de dados.

## Workflow follow-up

- Arquivar a mudança depois que a implementação e a revisão forem concluídas.
- Sincronizar a especificação `vehicle-reporting` com as especificações principais durante o arquivamento.
