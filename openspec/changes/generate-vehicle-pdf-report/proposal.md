# Proposal

## Why

As informações do veículo, abastecimentos, custos e manutenções estão disponíveis apenas em telas separadas, o que impede o usuário de obter um documento consolidado para consulta, compartilhamento ou arquivo. A API deve gerar um PDF completo e consistente com os indicadores exibidos no sistema, respeitando o isolamento dos dados por usuário.

## What Changes

- Adicionar uma operação autenticada para gerar e baixar um relatório PDF de um veículo pertencente ao usuário.
- Consolidar no relatório os dados cadastrais do veículo, a quilometragem atual, os abastecimentos, os custos e indicadores de consumo, os serviços realizados e os lembretes de manutenção.
- Gerar o histórico completo por padrão e aceitar um período opcional para limitar abastecimentos, serviços realizados e totais derivados.
- Centralizar na API as regras de cálculo hoje existentes no frontend, incluindo consumo médio, preço médio por litro, custo por quilômetro e totais de combustível e manutenção.
- Tratar registros legados sem data ou custo como dados não informados, excluindo-os de cálculos que exigem esses campos e indicando no PDF a existência de itens omitidos.
- Disponibilizar a ação de download no perfil do veículo, com tratamento de carregamento e falha.

## Capabilities

### New Capabilities

- `vehicle-reporting`: geração autenticada de relatório PDF consolidado por veículo, com filtros, indicadores de custos e históricos.

### Modified Capabilities

Nenhuma.

## Impact

- API de manutenção: novo endpoint de relatório, agregação e cálculos, renderização de PDF e acesso interno aos dados do veículo.
- API de veículos: consulta interna protegida para fornecer os dados cadastrais e a foto do veículo à API de manutenção.
- Frontend Angular: cliente de download e ação no perfil do veículo.
- Configuração e dependências: biblioteca .NET para geração de PDF e uso das configurações já existentes entre os serviços.
- Testes: cobertura dos cálculos, autorização, filtros de período, conteúdo mínimo e resposta PDF.
