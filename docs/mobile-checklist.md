# Checklist Mobile PostHub

## Base compartilhada
- [x] Ajustar `Tabs` para funcionar em mobile com rolagem horizontal e sem esmagar labels.
- [x] Adaptar `Modal` para abrir em formato de sheet/tela cheia no celular.
- [ ] Melhorar o fallback mobile de módulos desktop para reduzir densidade visual e overflow.
- [ ] Revisar tabelas compartilhadas para trocar leitura horizontal por cards/resumo no mobile.

## Primeiro contato e navegação
- [x] Remover o bloqueio inicial que recomenda desktop em módulos já aceitáveis no mobile.
- [x] Expor melhor os módulos no menu mobile sem esconder áreas importantes do produto.
- [x] Sinalizar no menu quais módulos ainda estão em adaptação para celular.
- [ ] Revisar hierarquia da `MobileTopBar` para reduzir ruído visual no primeiro acesso.

## Módulos prioritários
- [x] `Approval`: simplificar grids de seleção, fluxo de criação e anexos.
- [ ] `Kanban`: criar visão mobile por coluna/lista em vez de board horizontal puro.
- [x] `Performance`: oculto da navegação do produto por enquanto, sem expor no mobile.
- [x] `Reports`: criar modo mobile focado em configuração e resumo, não em preview desktop completo.
- [ ] `References`: trocar modal desktop central por sheet/detail view mobile.
- [ ] `Settings`: adaptar tabs internas e ações administrativas para stack vertical.
- [ ] `Integrations`: revisar hero/banner final e estados de ação para leitura mobile.

## Cobertura mobile real
- [x] `DashboardMobile` existente e aproveitável.
- [x] `IdeasMobile` existente e aproveitável.
- [x] `EditorialCalendar` com adaptação inicial para mobile.
- [ ] Criar experiência mobile dedicada para `Kanban` e reduzir fallback desktop nos módulos restantes.
