# Registro local de manutenções

A implementação atual usa SQLite e PDFs em documentos persistentes. Consulte
[README.md](README.md) para arquitetura, migração e limites de durabilidade,
e [VALIDATION.md](VALIDATION.md) para os resultados atuais.

## Registro histórico da implementação anterior — 24/10/2026

O conteúdo abaixo documenta a versão anterior, que gravava no cache; não descreve
o armazenamento atual.

# Registro temporário de manutenções

Na tela do veículo, **Registrar manutenção** abre o cadastro. Data, valor em reais,
categoria e quilometragem são obrigatórios. Detalhes (até 4.000 caracteres) e nota
fiscal PDF (até 10 MB) são opcionais. O formulário preserva os dados quando a
gravação falha e impede envios repetidos enquanto salva.

Mensagens de operação usam o snackbar global, na parte inferior e com largura
total, fechamento automático em 2 segundos e botão ×. Para reutilizar:

```tsx
const { showSnackbar } = useSnackbar(); // components/SnackbarProvider
showSnackbar('sucesso', 'Manutenção registrada com sucesso.');
showSnackbar('aviso', 'Revise os campos indicados.');
showSnackbar('erro', 'Não foi possível salvar. Tente novamente.');
```

Os tipos usam verde, amarelo e vermelho, respectivamente. Uma nova mensagem
substitui a anterior e reinicia o prazo; a navegação não desmonta o snackbar.
As orientações de validação permanecem junto aos campos do formulário.

Os registros ficam em `Paths.cache/maintenance-records/<id>.json`, separados por
veículo. Anexos são copiados para a mesma pasta. A gravação usa um arquivo
`.pending` e aguarda sua movimentação para `.json` antes de confirmar o sucesso.
O histórico é carregado ao abrir o app e ordenado por data da manutenção, com
desempate pela data de criação. Falhas de leitura exibem opção de tentar novamente.

Este armazenamento não utiliza o backend e não é um backup: limpar o cache,
desinstalar o aplicativo ou a limpeza automática do sistema pode remover os dados.
O veículo continua sendo o demonstrativo já utilizado no app.

## Dependências

Instaladas com `npx expo install`, mantendo o SDK 58: `expo-file-system` e
`expo-document-picker`. Recompile o development client após atualizar:

```sh
npm run android:build
# Em um Mac configurado:
npm run ios
```

APIs conferidas na documentação do [FileSystem SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)
e do [DocumentPicker SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/),
incluindo as operações assíncronas de cópia, escrita e movimentação.

## Verificação — 24/10/2026

- TypeScript e lint aprovados.
- Sete testes de manutenção aprovados: validação, datas, moeda, limites, PDF,
  registros corrompidos e persistência com falhas de escrita/movimentação.
- Os quatro testes existentes de autenticação/recuperação também passaram.
- Compilação e instalação Android concluídas no emulador Pixel 10a.
- Cadastro pela interface confirmou JSON no cache, mensagem de sucesso e
  atualização imediata do histórico com data, categoria, valor e quilometragem.
- Capturas: `maintenance-review.png` e `maintenance-history.png`.
- iOS não executado: este ambiente Windows não dispõe de Xcode/simulador iOS.
- Seleção real de PDF e falha real por disco cheio não foram exercitadas no
  emulador; validações e falhas de persistência têm cobertura automatizada com
  um adaptador de filesystem controlado.

```sh
npm run typecheck
npm run lint
node --experimental-strip-types --test tests/maintenance.test.mjs tests/maintenance-storage.test.mjs
```
