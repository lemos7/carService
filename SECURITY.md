# Segurança e checklist de publicação

Este checklist distingue controles implementados de validações que precisam acontecer no servidor real. A aplicação não deve ser considerada publicada ou homologada apenas porque compila.

## Prioridades da revisão

- [x] **1. Eliminar segredos padrão.** Removidos `Jwt:Key`, `JWT_KEY` e todos os fallbacks da chave interna; `.env.example` contém somente configurações públicas e caminhos.
- [x] **2. Falhar na inicialização.** Todas as APIs validam configurações antes de abrir endpoints. Identity exige um par RSA correspondente; as outras APIs exigem uma chave interna Base64 de pelo menos 32 bytes. Produção exige origem HTTPS e SMTP configurado.
- [x] **3. Gerar segredos fortes.** `CarCare.Provision` gera RSA de 3072 bits e chave interna aleatória de 256 bits; restringe permissões e recusa sobrescrever diretórios existentes. Nenhum valor é exibido.
- [x] **4. Fechar portas das APIs.** Nenhuma API publica portas no Compose. A comunicação acontece na rede `backend`, marcada `internal`. Somente Identity tem saída externa para SMTP; Nginx é a entrada pública.
- [x] **5. Excluir dados dos builds.** Bancos, WAL, uploads, documentos, `.env`, diretórios de secrets, certificados e chaves privadas estão excluídos dos contextos pertinentes. `.gitignore` cobre também documentos e variantes de `.env`.
- [x] **6. Preparar HTTPS obrigatório.** O perfil de produção do Nginx exige certificado e chave montados como somente leitura; redireciona HTTP para HTTPS, usa TLS 1.2/1.3 e HSTS. O perfil local publica HTTP somente em `127.0.0.1`.
- [x] **7. Proteger recuperação de senha nos logs.** O fallback que registra links só funciona em `Development`; produção exige SMTP. Nginx registra `$uri` sem query string, omite erros de requisição que poderiam conter a URL e envia `Referrer-Policy: no-referrer`. A tela remove o token da URL depois de lê-lo.
- [x] **8. Limitar autenticação.** Nginx limita login, cadastro e recuperação a 5 requisições/minuto por IP, com burst de 5. A Identity API acrescenta limite global de 60/minuto por operação e retorna `429`. Variações de maiúsculas/minúsculas ou barra final compartilham o limite.
- [x] **9. Montar secrets e suportar rotação.** Docker Compose monta arquivos em `/run/secrets`; somente Identity recebe a chave JWT privada. JWT usa RS256, `kid` derivado da chave pública e suporte opcional à chave pública anterior durante rotação.

## Proteções adicionais

- [x] JWT de uma hora em cookie `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sem `Domain`, com prefixo `__Host-` em produção.
- [x] Token removido do JSON de login/cadastro e do `localStorage`; a sessão é restaurada por endpoint autenticado.
- [x] Logout apaga o cookie no servidor; a interface só confirma a saída após sucesso.
- [x] Requisições que alteram dados exigem cabeçalho customizado e validam `Origin` quando fornecido. CORS permanece desabilitado. Requisições com `Sec-Fetch-Site: cross-site` são rejeitadas.
- [x] Chaves internas comparadas em tempo constante, com rejeição de chave vazia.
- [x] `/internal/` bloqueado no proxy público; arquivos de secrets não são copiados para imagens.
- [x] Respostas das APIs usam `Cache-Control: no-store`; erros inesperados não devolvem a mensagem interna.
- [x] Nginx adiciona CSP, proteção contra framing e `nosniff` no perfil de produção.

## Verificações automatizadas

Evidências locais em 02/10/2026: build das APIs sem erros ou avisos, build Angular aprovado, 31 verificações de segurança, 12 verificações de integração das APIs e 13 verificações HTTPS pelo Nginx aprovadas (56 ao todo). As quatro imagens Docker foram construídas e iniciadas em ambiente isolado; `nginx -t` aprovou a configuração TLS. Os perfis Compose passaram pela validação de configuração, incluindo ausência de portas nas APIs e isolamento da chave privada. O teste HTTPS usou certificado temporário de localhost com validação por correspondência exata, sem instalar confiança global. Certificado público e entrega SMTP real ainda não foram testados.

Execute a partir da raiz:

```powershell
dotnet build backend/CarCare.sln
dotnet run --project backend/tests/CarCare.Security.Checks -- --api-smoke backend
docker compose -f docker-compose.yml -f docker-compose.development.yml config --quiet
docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.production.yml config --quiet
```

O executável de testes verifica configuração ausente, chaves fracas ou incompatíveis, token expirado, audience incorreta, recusa de HMAC, rotação, cookie, CSRF e rate limiting. O modo `--api-smoke` inicia as três APIs em portas temporárias de loopback com bancos descartáveis, verifica login/sessão, acesso protegido e sincronização de hodômetro, e encerra apenas os processos que criou. Não utiliza os bancos nem segredos reais do projeto.

### Reproduzir o teste HTTPS isolado

Com Docker Engine disponível e secrets locais já gerados, execute da raiz em PowerShell. O certificado abaixo vale um dia e serve exclusivamente para testes locais. O override `deploy/compose.smoke.yml` usa uma credencial SMTP fictícia, não envia e-mails e nunca deve ser usado na publicação real.

```powershell
dotnet run --project backend/tools/CarCare.Provision -- --test-tls artifacts/tls-check
$env:SERVER_NAME = 'localhost'
$env:FRONTEND_URL = 'https://localhost:14443'
$env:TLS_CERT_FILE = './artifacts/tls-check/fullchain.pem'
$env:TLS_KEY_FILE = './artifacts/tls-check/privkey.pem'
docker compose -p carcare-securitycheck -f docker-compose.yml -f docker-compose.production.yml -f deploy/compose.smoke.yml up --build -d
docker exec carcare-securitycheck-web-1 nginx -t
dotnet run --project backend/tests/CarCare.Security.Checks -- --gateway-smoke artifacts/tls-check/fullchain.pem
docker compose -p carcare-securitycheck -f docker-compose.yml -f docker-compose.production.yml -f deploy/compose.smoke.yml down
```

As portas de teste são restritas a loopback (`14080` e `14443`); os volumes têm prefixo `carcare-securitycheck`. Use uma nova pasta para regenerar um certificado expirado. Feche o terminal ao terminar para descartar as variáveis locais de teste.

## Preparação do ambiente

1. Gere secrets diretamente no host de destino ou use o secret manager da hospedagem:

   ```powershell
   dotnet run --project backend/tools/CarCare.Provision -- secrets
   ```

   Se a pasta já existe, o comando recusa a operação. Não regenere as chaves a cada deploy. Guarde backup criptografado e restrinja o acesso do host.

2. Preencha `secrets/smtp-password` com a credencial SMTP, usando editor seguro ou integração do secret manager. O gerador deixa esse arquivo vazio deliberadamente; produção rejeita esse estado. Não envie credenciais pelo chat ou em argumentos de shell.

3. Copie `.env.example` para `.env` e configure `FRONTEND_URL`, `SERVER_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME` e `SMTP_FROM`. `FRONTEND_URL` deve ser exatamente a origem pública (ex.: `https://garagem.seudominio.com`), sem caminho, query ou credenciais.

4. Configure `TLS_CERT_FILE` e `TLS_KEY_FILE` com o certificado de cadeia completa e a chave privada PEM do domínio. Configure renovação no host e recarga do Nginx após cada renovação. Não use certificado autoassinado para publicação pública.

5. Valide e execute:

   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
   docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d
   docker compose -f docker-compose.yml -f docker-compose.production.yml exec web nginx -t
   ```

O comando padrão `docker compose up --build` carrega automaticamente `docker-compose.override.yml`, que reutiliza a configuração de desenvolvimento: origem `http://localhost:4200`, ambiente `Development` e porta publicada somente em loopback. Para produção, use explicitamente `-f docker-compose.yml -f docker-compose.production.yml`: o override local não será carregado, e apenas 80/443 serão publicados. Usar somente `-f docker-compose.yml` requer configuração externa completa e não publica portas. Ao trocar de perfil, use `docker compose down` com os arquivos do perfil anterior para remover contêineres com portas antigas; não use `down -v` (apagaria os dados).

Docker Compose com secrets baseados em arquivos **não é um cofre criptografado**: os arquivos continuam no host, acessíveis aos administradores e ao daemon Docker. Em uma nuvem, o gerenciador de segredos deve provisionar arquivos restritos ou volumes de secrets nesses caminhos; nunca inclua segredos no front-end, Dockerfile, imagem ou Git. A chave pública pode ser distribuída; a privada e a chave interna devem permanecer confidenciais.

## Rotação

### Rotação planejada de JWT

1. Gere um novo conjunto em uma pasta restrita fora do repositório ou ignorada pelo Git. O gerador nunca sobrescreve o conjunto atual.
2. Preserve a chave interna e a credencial SMTP atuais no novo conjunto, a menos que também esteja planejando rotacioná-las. Monte o novo par RSA via `SECRETS_DIR`.
3. Aponte `PREVIOUS_JWT_PUBLIC_KEY_FILE` para a chave pública anterior e acrescente `-f docker-compose.rotation.yml` ao comando de produção. Recrie as três APIs na mesma janela de manutenção. Novos tokens usam a chave nova; tokens antigos continuam válidos durante sua expiração.
4. Após pelo menos 1 hora e 30 segundos desde a última emissão pela chave anterior, retire o arquivo de rotação do comando e recrie as APIs. A chave antiga deixa de ser aceita.

### Incidente ou segredo comprometido

Rotacione imediatamente o par RSA e/ou a chave interna e recrie todos os serviços afetados. **Não** mantenha a chave pública comprometida na lista de validação: isso invalidará as sessões antigas. Se SMTP foi exposto, revogue a senha no provedor e substitua o arquivo. Alterar apenas um arquivo montado não recarrega automaticamente a configuração da aplicação; é necessário recriar os processos.

Logout remove o cookie do navegador, mas JWT continua sendo stateless: uma cópia previamente roubada permanece válida até expirar ou até a chave ser retirada. Redefinir senha ainda não revoga todas as sessões existentes. Para revogação individual imediata, uma evolução é persistir sessões ou uma versão de credenciais consultada durante a autorização.

## Pendências externas para liberar publicação

- [ ] Informar domínio e hospedagem; configurar DNS, firewall e acesso administrativo restrito.
- [ ] Provisionar certificado público válido para o domínio e testar HTTPS/redirecionamento/HSTS no servidor.
- [ ] Configurar credenciais SMTP reais e confirmar recebimento e uso do link de recuperação, sem token nos logs de produção.
- [x] Executar o build e a inicialização das imagens em um Docker Engine disponível; validar `nginx -t` (concluído no ambiente isolado local).
- [ ] Testar pela entrada HTTPS: cadastro, login, recarga da página, logout, upload/download, combustível, resposta `429` e recusa de `/internal/`.
- [ ] Confirmar externamente que 7001, 7002 e 7003 estão fechadas e que somente 80/443 são públicas para a aplicação.
- [ ] Configurar backup dos volumes e secrets, testar restauração e automatizar renovação do certificado.

Esses itens permanecem abertos até existir evidência do ambiente de destino. O ambiente de desenvolvimento não substitui essa homologação.

## Limites conhecidos

O rate limiter da API é local ao processo; com múltiplas réplicas, o orçamento deve ser centralizado no gateway ou em armazenamento compartilhado. O Nginx pressupõe ser a entrada direta: se houver CDN/load balancer, configure a identificação do IP real apenas para proxies confiáveis. Não confie livremente em `X-Forwarded-For`.

O tráfego público é TLS; HTTP permanece restrito à rede interna do Compose. Para múltiplos hosts, use transporte interno autenticado/criptografado. Fotos de veículos continuam servidas como arquivos públicos em `/uploads`; não use fotos com informações sensíveis em uma demonstração pública. SQLite usa volumes locais, e a migração de schema ainda requer evolução própria.

Referências: [Docker Compose secrets](https://docs.docker.com/reference/compose-file/secrets/), [ASP.NET Core rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-10.0).
