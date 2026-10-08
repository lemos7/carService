# Design

## Context

Os dados do relatório estão divididos entre a API de veículos, que possui cadastro, foto e quilometragem atual, e a API de manutenção, que possui abastecimentos, serviços realizados e lembretes. Os indicadores de custos são calculados atualmente no Angular em `cost-analytics.ts`, enquanto as APIs apenas devolvem registros. Veja `proposal.md` para a motivação e `specs/vehicle-reporting/spec.md` para o contrato de comportamento.

A comunicação interna entre os dois serviços já usa `HttpClient`, `Services:Vehicles`/`Services:Maintenance` e `X-Internal-Key`. O gateway encaminha as rotas públicas, e cada consulta de persistência restringe dados por `UserId`.

## Goals / Non-Goals

**Goals:**

- Manter uma única implementação de agregação e cálculo no backend para o PDF.
- Gerar o documento em memória sob demanda, sem persistir cópias do relatório.
- Preservar o isolamento por usuário também na chamada entre serviços.
- Produzir um PDF paginado e legível mesmo com históricos extensos ou parcialmente preenchidos.
- Reaproveitar as regras de cálculo no backend em unidades testáveis, sem dependência do renderizador.

**Non-Goals:**

- Incorporar ao relatório os PDFs anexados aos serviços realizados; será exibida apenas a existência e o nome do comprovante.
- Criar agendamento, envio por e-mail, armazenamento ou histórico de relatórios gerados.
- Alterar o modelo de persistência ou vincular retroativamente lembretes a serviços realizados.
- Remover imediatamente os cálculos do frontend usados nos gráficos existentes.

## Decisions

### A API de manutenção será responsável pelo relatório

O endpoint público será `GET /api/maintenance/reports/vehicles/{vehicleId}` com os parâmetros opcionais `startDate` e `endDate`. A API de manutenção já possui a maior parte dos registros e agrega os dados cadastrais por uma consulta interna à API de veículos.

Alternativas consideradas:

- Gerar na API de veículos exigiria transportar todas as coleções de manutenção para o serviço que possui menos dados do relatório.
- Criar uma terceira API de relatórios aumentaria implantação e operação para uma única capacidade e duplicaria clientes internos.
- Gerar no navegador não atenderia ao requisito de serviço da API e manteria regras importantes apenas no frontend.

### A API de veículos exporá uma consulta interna com escopo de proprietário

Será criada uma rota interna protegida por `X-Internal-Key` que recebe `vehicleId` e `userId`, consulta ambos no repositório e retorna um DTO mínimo do veículo. A API de manutenção sempre propagará o identificador obtido do token autenticado; ausência ou divergência será tratada como veículo não encontrado. A foto será carregada de forma tolerante a falhas a partir do endereço interno do serviço, sem impedir o restante do relatório.

Alternativa considerada: usar o endpoint público de listagem com o cookie/token do usuário acoplaria autenticação entre serviços e transferiria veículos sem relação com o relatório.

### Agregação e renderização serão separadas

Um componente de aplicação montará um modelo imutável de relatório contendo veículo, intervalo, coleções filtradas, totais, indicadores e contagens de registros incompletos. Um renderizador receberá esse modelo e produzirá os bytes do PDF. Essa divisão permite testar cálculos sem interpretar o arquivo binário e testar o PDF por metadados e texto essencial.

Os cálculos seguirão as fórmulas já usadas no frontend:

- distância: soma de `OdometerKm - PreviousOdometerKm` dos abastecimentos válidos;
- consumo médio ponderado: distância total dividida por litros totais;
- preço médio por litro: custo total de combustível dividido por litros totais;
- custo de combustível por quilômetro: custo total de combustível dividido pela distância total;
- manutenção: soma de `TotalCost` dos serviços válidos e agrupamento pela categoria, usando "Sem categoria" quando necessário;
- total geral: combustível mais manutenção.

Divisões sem denominador válido resultarão em valor ausente. Registros sem os campos necessários permanecerão nas seções históricas, mas não participarão do indicador correspondente.

### O período será inclusivo e aplicado somente a eventos com data

Sem parâmetros, todas as coleções são apresentadas. Com `startDate` e `endDate`, abastecimentos e serviços com data serão filtrados inclusivamente. Lembretes continuam todos visíveis porque seu vencimento é definido por quilometragem, não por data. Serviços legados sem data serão exibidos em uma subseção de dados sem data e contabilizados como omitidos, pois não é possível afirmar se pertencem ao período.

Ambas as datas serão obrigatórias quando qualquer uma for informada, e `startDate <= endDate`. A API devolverá `400` para combinações inválidas.

### O PDF será gerado com uma biblioteca .NET de layout paginado

A implementação usará QuestPDF no projeto da API de manutenção, com licença configurada explicitamente conforme a elegibilidade do projeto. O documento terá cabeçalho, identificação do veículo, cartões de resumo e tabelas paginadas para abastecimentos, custos por categoria, serviços e lembretes. Valores serão formatados em `pt-BR`, datas em `dd/MM/yyyy` e números monetários em BRL.

QuestPDF foi escolhido pela composição declarativa, paginação automática e suporte a imagens e tabelas. Gerar PDF manualmente aumenta o risco de arquivos inválidos e quebras de layout; bibliotecas com licenciamento copyleft/comercial obrigatório foram evitadas.

### O frontend fará download a partir da resposta HTTP

O cliente Angular solicitará o endpoint com `responseType: 'blob'` e `observe: 'response'`, obterá o nome do `Content-Disposition` quando disponível e criará temporariamente uma URL de objeto para iniciar o download. A URL será revogada após o uso. O perfil terá um botão com estado de geração, bloqueio contra cliques duplicados e mensagem de erro acessível.

O primeiro incremento usará o histórico completo no botão. O cliente aceitará datas opcionais para suportar uma interface de filtro posterior sem mudar o contrato da API.

## Risks / Trade-offs

- [Históricos muito extensos aumentam memória e tempo de resposta] → Consultar dados sem rastreamento, renderizar uma única vez e adicionar limites de tempo e testes com volume representativo; a paginação do documento evita cortes visuais.
- [Indisponibilidade da API de veículos impede validar propriedade] → Falhar a geração com erro de dependência, sem produzir relatório parcial ou aceitar dados sem validação.
- [Foto inválida ou indisponível quebra o layout] → Validar conteúdo/tamanho, limitar dimensões e continuar sem foto quando a leitura falhar.
- [Regras do frontend e backend podem divergir] → Fixar as fórmulas em testes de aplicação e reutilizar casos de referência dos testes atuais de custos.
- [A licença da biblioteca pode não corresponder ao uso futuro] → Registrar a licença escolhida na inicialização e rever a elegibilidade antes de distribuição comercial.
- [Valores agregados podem somar trajetos sobrepostos cadastrados pelo usuário] → Manter a semântica atual baseada nos intervalos registrados; saneamento retroativo dos dados fica fora deste escopo.

## Migration Plan

1. Adicionar e testar a consulta interna da API de veículos sem alterar rotas públicas existentes.
2. Adicionar o modelo agregado, os cálculos, o renderizador e o endpoint na API de manutenção.
3. Publicar as duas APIs juntas, mantendo compatibilidade com os clientes atuais.
4. Adicionar o download no frontend após o endpoint estar disponível.
5. Em rollback, remover a ação do frontend e reverter as novas rotas; nenhum dado persistido precisa ser migrado ou revertido.
