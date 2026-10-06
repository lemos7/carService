# Regras do repositório

## Front-end

- Toda página e todo componente Angular deve ser composto por três arquivos separados e adjacentes: `*.component.ts`, `*.component.html` e `*.component.css`.
- O decorator `@Component` deve referenciar os arquivos externos com `templateUrl` e `styleUrl`.
- Não use `template`, `styles` ou CSS inline em páginas e componentes, mesmo quando o template ou o estilo for pequeno.
- Ao criar ou alterar uma página ou componente, preserve esse formato e confirme que os três arquivos existem.
