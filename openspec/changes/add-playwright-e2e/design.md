# Design

## Context

Ver a motivação em `proposal.md`. O frontend usa Angular 20, TypeScript e testes Node em `frontend/tests/*.test.cjs`. A solução .NET 10 possui verificações executáveis em `backend/tests/CarCare.Security.Checks`. Não há workflow em `.github` nem configuração Playwright. As rotas estão em `frontend/src/app/app.routes.ts`.

A autenticação usa cookie HttpOnly e restauração por `/api/auth/session`; não usa token no localStorage. O gateway Nginx encaminha chamadas às três APIs. O Compose atual mantém bancos e uploads em volumes nomeados, e o override de desenvolvimento publica portas fixas. `CarCare.Provision` gera chaves em um diretório novo e recusa sobrescrever diretórios existentes. Não há specs principais publicadas; a mudança de relatório PDF já contém implementação e verificações próprias.

## Goals / Non-Goals

**Goals:** execução reproduzível em Windows e Linux, exercitando o navegador e serviços reais, dados independentes por teste, falhas diagnosticáveis e comando com código de saída confiável para CI.

**Non-Goals:** substituir as suítes existentes, testar cada regra pelo navegador, criar endpoints de seed ou limpeza, contornar autenticação/CSRF ou validar SMTP e TLS de produção.

## Decisions

### Runner e configuração

Usar `@playwright/test` como dependência de desenvolvimento do frontend, versão compatível com Node 22 registrada no lockfile. Centralizar configuração em `frontend/playwright.config.ts`, com `testDir: './e2e'` para não capturar os testes Node. Disponibilizar `test:e2e`, `test:e2e:ui` e `test:e2e:report`. A execução padrão é Chromium desktop, um worker, sem retries locais e no máximo um retry no CI, com `forbidOnly` no CI. Uma única matriz mantém o custo inicial pequeno; Firefox/WebKit ficam para ampliação posterior.

O runner Node de orquestração controla o ambiente e propaga falhas de preparação, testes e limpeza. Preferir argumentos estruturados ao invocar processos para suportar caminhos Windows com acentos e espaços. O modo UI mantém o ambiente durante a sessão e faz limpeza ao sair. `test:e2e:report` apenas abre artefatos já gerados. Não iniciar só `ng serve` com mocks: isso deixaria gateway, cookies e integração entre serviços fora da cobertura.

### Ambiente descartável

Adicionar `docker-compose.e2e.yml`, combinado explicitamente com `docker-compose.yml`; não carregar o override de desenvolvimento. Definir Development para as APIs, URLs internas existentes e somente a porta web em loopback, configurável e diferente de 4200 (padrão 4300). `FrontendUrl` e a baseURL do navegador devem usar a mesma origem.

Cada execução recebe nome Compose exclusivo com prefixo `carcare-e2e-`, volumes próprios e segredos gerados em `artifacts/e2e/<run-id>/secrets` por `CarCare.Provision`. Usar `SECRETS_DIR` apenas no ambiente do subprocesso. Não montar dados ou segredos locais existentes. Verificar o Compose resolvido para ausência de volumes com nomes globais ou bind mounts de dados reais. Falhar claramente se a porta estiver ocupada, sem reutilizar outra aplicação.

Adicionar healthchecks de teste às APIs e aguardar prontidão com timeout finito antes dos testes, incluindo resposta do gateway. Evitar depender apenas de `depends_on`, que não garante prontidão. Em falhas, capturar logs de serviços sem imprimir segredos. Em bloco finally e ao interromper a execução, encerrar somente o projeto exclusivo, remover seus volumes e diretório de segredos. Validar o prefixo do projeto e que os caminhos resolvidos estão sob `artifacts/e2e` antes de remover recursos. Preservar relatórios de diagnóstico. Não usar comandos globais de prune.

### Fixtures e interação

Criar usuário exclusivo por teste/tentativa e BrowserContext novo. O cenário de autenticação faz cadastro e login pela UI; outros cenários podem preparar usuário e veículo via APIs públicas usando o contexto de requisições associado ao navegador, respeitando cookies, origem e cabeçalhos de CSRF existentes. Não compartilhar storageState persistente, contas ou veículos entre cenários. A desmontagem do ambiente elimina os dados sem exigir endpoint de exclusão.

Usar `getByRole` e `getByLabel`; corrigir associação de labels quando necessário e adicionar `data-testid` apenas onde não houver seletor semântico estável. Esperar resultados visíveis com assertions Playwright e eventos de resposta/download quando pertinentes, sem sleeps fixos. O comportamento principal de cada teste deve ocorrer pela UI; chamadas de API servem apenas para preparação e verificações auxiliares.

### Cobertura e aceitação inicial

| Área | Cenário verificável |
| --- | --- |
| Autenticação | Visitante em `/veiculos` vai para login; cadastro válido abre área autenticada; reload restaura sessão; logout bloqueia rota privada; login válido reabre área privada e credencial inválida mostra erro. |
| Veículos | Criar veículo, verificar listagem/perfil após reload, editar dados e verificar persistência. Tentativa de reduzir hodômetro mostra rejeição e preserva o valor anterior. |
| Serviços | Pela rota `/veiculos/:id/manutencoes/nova`, preencher data, categoria, descrição, hodômetro e custo; verificar serviço em `/veiculos/:id/manutencoes` após reload e custo no perfil. Campos obrigatórios ausentes impedem registro. |
| Abastecimentos | Em `/consumo`, registrar distância de 500 km, 50 litros e valor de R$ 300 com data fixa; verificar resultado de 10 km/l, hodômetro e custo por km de R$ 0,60 no período correspondente do perfil. Hodômetro final não superior ao inicial impede registro. |
| Relatório | No perfil preparado com dados, acionar Baixar relatório, aguardar download, verificar ausência de falha, extensão `.pdf`, conteúdo não vazio e assinatura `%PDF-`. Não comparar binário completo nem duplicar os testes de conteúdo existentes em .NET. |

Os cenários devem funcionar individualmente, sem depender da ordem de execução. Datas de dados e filtros serão explícitos para não falharem com a mudança do mês. Esta matriz registra a cobertura de comportamentos existentes, sem criar requisitos novos de produto.

### Evidências e CI

Gerar relatório HTML sem abertura automática, resumo de terminal, screenshot somente em falha e trace retido em falha, inclusive localmente. Ignorar `frontend/playwright-report`, `frontend/test-results` e qualquer estado de autenticação no Git; dados temporários permanecem em `artifacts/`, já ignorado.

Criar workflow GitHub Actions em pull requests, pushes e disparo manual, Ubuntu com Node 22, .NET 10 e Docker Compose, permissões mínimas de leitura. Executar `npm ci`, instalar Chromium com dependências do sistema e chamar o mesmo comando local. Preservar o código de falha, publicar relatório e evidências mesmo quando testes falharem, com retenção curta de sete dias; excluir chaves, bancos e cookies persistidos dos uploads. Traces podem conter dados da sessão descartável. A limpeza deve acontecer mesmo após falhas; prever etapa final de limpeza caso o runner termine antes do finally. Não alterar regras de proteção de branches nesta mudança.

Referências consultadas: [configuração Playwright](https://playwright.dev/docs/test-configuration) e [CI](https://playwright.dev/docs/ci-intro). As opções e a versão exata serão conferidas contra a dependência instalada na implementação.

## Risks / Trade-offs

- Builds Docker tornam o feedback mais lento → reutilizar cache de imagem, limitar inicialmente a Chromium e manter testes Node rápidos separados.
- SQLite e sincronização entre APIs podem causar interferência → usuário/veículo por teste, um worker inicialmente e assertions com espera limitada.
- Falha de inicialização pode parecer falha de UI → healthchecks, timeout e logs separados da execução dos cenários.
- Labels atuais podem não permitir seletores robustos → ajustes mínimos nos componentes compartilhados sem mudar o fluxo do usuário.
- Interrupção forçada pode deixar recursos → nomes e caminhos exclusivos, comando de limpeza documentado e etapa final no CI.
- Chromium não representa todos os navegadores e Development não valida cookies Secure/TLS → manter verificações de segurança existentes e registrar essa limitação.

## Migration Plan

Adicionar dependência e infraestrutura, implementar fixtures e cenários, validar localmente e então ativar workflow. Aceitação: suíte completa passa duas vezes em ambientes novos, cada spec passa isoladamente, falha controlada gera evidências e saída não zero, recursos de teste são removidos e volumes locais permanecem intactos. Executar `npm test`, build Angular e verificações .NET pertinentes se houver mudança nos componentes ou infraestrutura compartilhada. Reverter apenas arquivos/dependências de teste e workflow se necessário; não há migração de banco nem rollout de produto.
