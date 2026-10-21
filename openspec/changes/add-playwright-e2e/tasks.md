# Tasks

## 1. Configuração Playwright

- [x] 1.1 Adicionar `@playwright/test` compatível com Node 22 ao frontend e atualizar lockfile; verificar instalação limpa com `npm ci` e instalação de Chromium.
- [ ] 1.2 Criar `playwright.config.ts` e scripts `test:e2e`, `test:e2e:ui` e `test:e2e:report`, separando `e2e` dos testes Node; verificar descoberta dos testes, política de retries/workers, evidências e execução preservada de `npm test`.
- [ ] 1.3 Atualizar `.gitignore` e README com pré-requisitos, instalação, comandos e diretórios de evidência; verificar que comandos resolvem e artefatos/estado de sessão não aparecem em `git status`.

## 2. Ambiente isolado e ciclo de execução

- [ ] 2.1 Criar override Compose E2E com APIs em Development, porta web configurável e healthchecks; verificar `docker compose config` com arquivos explícitos, volumes exclusivos, origem consistente e ausência das portas/dados do ambiente local.
- [ ] 2.2 Implementar runner Node que gera identificador de execução e segredos via `CarCare.Provision`, sobe Compose e aguarda prontidão com timeout; verificar resposta do gateway e das verificações de saúde, além de erro claro para porta ocupada ou serviço indisponível.
- [ ] 2.3 Implementar coleta de logs, propagação de exit code, limpeza em finally/interrupção e comando de limpeza de recursos órfãos; verificar sucesso, falha e interrupção preservando volumes locais. Adicionar testes focados para rejeitar nomes de projeto e caminhos de limpeza fora do escopo E2E.
- [ ] 2.4 Documentar ciclo local/headless/UI, escolha de porta, diagnóstico de inicialização e limpeza manual segura; verificar execução das instruções em Windows e Linux ou registrar explicitamente qualquer plataforma não validada.

## 3. Fixtures e cenários de navegador

- [ ] 3.1 Criar fixtures com usuário e BrowserContext exclusivos por teste/tentativa, preparação por APIs públicas e autenticação real; verificar sessão restaurada após navegação e ausência de compartilhamento entre dois testes.
- [ ] 3.2 Implementar testes de cadastro, login válido/inválido, reload autenticado, logout e proteção de rota privada; verificar cada cenário contra APIs reais com assertions de URL e conteúdo visível.
- [ ] 3.3 Implementar cadastro/edição de veículo e rejeição de hodômetro regressivo; verificar persistência após reload e preservação do hodômetro na rejeição.
- [ ] 3.4 Implementar registro de serviço com data, categoria e custo e validação de campos obrigatórios; verificar histórico após reload e custo exibido no perfil.
- [ ] 3.5 Implementar abastecimento com valores determinísticos e validação de hodômetro; verificar 10 km/l, R$ 0,60/km no filtro de período explícito e atualização do hodômetro.
- [ ] 3.6 Implementar download de relatório pelo perfil; verificar evento de download concluído, extensão, conteúdo não vazio e assinatura PDF.
- [ ] 3.7 Ajustar somente labels/identificadores necessários aos seletores e documentar no README a matriz de cobertura, execução por spec e limites; verificar ausência de sleeps fixos, cada spec isolada, `npm test` e build Angular.

## 4. Automação contínua

- [ ] 4.1 Criar workflow GitHub Actions para pull requests, pushes e disparo manual com Node 22, .NET 10, Compose, `npm ci`, Chromium e runner comum; validar sintaxe e execução em Linux, garantindo que falhas retornem status não zero.
- [ ] 4.2 Configurar publicação de relatório/logs/traces com retenção de sete dias e limpeza final mesmo em falha; verificar por falha controlada que as evidências existem e os uploads excluem segredos e bancos. Documentar acesso ao relatório e limitações do CI.

## 5. Verificação integrada

- [ ] 5.1 Executar a suíte completa duas vezes com ambientes novos; confirmar sucesso, independência dos dados e remoção dos recursos exclusivos ao final.
- [ ] 5.2 Exercitar falha controlada de teste e falha de preparação; confirmar códigos de saída, relatório/screenshot/trace quando o navegador executa, logs diagnósticos e limpeza, removendo a falha artificial depois.
- [ ] 5.3 Executar testes Node e build Angular finais, além das verificações .NET pertinentes a qualquer alteração compartilhada; registrar resultados e limitações reais de execução antes de concluir as tarefas.
