# Proposal

## Why

Os testes atuais verificam cálculos e APIs, mas não detectam regressões nos fluxos executados pelo usuário no navegador. Adicionar Playwright permite verificar a integração entre Angular, gateway e APIs antes de entregar alterações.

## What Changes

- Adicionar Playwright Test com TypeScript no frontend, com comandos para execução headless, interface de depuração e consulta do relatório.
- Criar uma suíte inicial em Chromium para cadastro/login/logout, proteção de rotas, cadastro e edição de veículos, registro de serviço, abastecimento e download do relatório PDF.
- Executar os testes contra a aplicação real em ambiente Docker Compose descartável, com contas, bancos e arquivos separados do desenvolvimento.
- Produzir relatório HTML, screenshots e traces de falhas; documentar instalação, execução e diagnóstico.
- Adicionar execução automatizada em GitHub Actions para pull requests e pushes, com limpeza e publicação de evidências.
- Preservar os testes Node e as verificações .NET existentes.

Fora do escopo: mudança de regras de negócio, cobertura exaustiva, testes visuais por snapshot, carga, envio SMTP, matriz Firefox/WebKit e automação de produção.

## Capabilities

### New Capabilities

Nenhuma capacidade de produto adicionada. Esta mudança trata de infraestrutura e cobertura de testes; `skip_specs: true` dispensa deltas de especificação.

### Modified Capabilities

Nenhuma. Os comportamentos existentes serão exercitados sem alterar seus contratos.

## Impact

Afeta `frontend/package.json`, lockfile, configuração Playwright, nova pasta `frontend/e2e`, scripts de orquestração, configuração Compose de testes, `.github/workflows`, `.gitignore` e README. Poderão ser necessários ajustes mínimos de labels ou identificadores de teste nos templates. Reutiliza as três APIs, Nginx e `CarCare.Provision` para gerar segredos efêmeros. Não requer alterações de endpoints, esquema de banco ou credenciais reais.
