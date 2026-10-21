# Regras do repositório

## Front-end

- Toda página e todo componente Angular deve ter uma pasta própria, com o mesmo nome base dos arquivos (por exemplo, `shared/ui/ui-alert/ui-alert.component.ts`).
- Toda página e todo componente Angular deve ser composto por três arquivos separados e adjacentes: `*.component.ts`, `*.component.html` e `*.component.css`.
- O decorator `@Component` deve referenciar os arquivos externos com `templateUrl` e `styleUrl`.
- Não use `template`, `styles` ou CSS inline em páginas e componentes, mesmo quando o template ou o estilo for pequeno.
- Ao criar ou alterar uma página ou componente, preserve esse formato e confirme que os três arquivos existem dentro da pasta própria. Ao mover arquivos, atualize todos os imports e referências afetados.
