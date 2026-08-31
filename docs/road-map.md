1. validar grid do mapa com zoom e modal com rumores
   - [x] grid 32x20 (proporcao 16:10) colado a esquerda, com painel lateral ao clicar no quadrante
   - [x] painel lateral com resumo em markdown (editavel) + CRUD de rumores (comentarios)
   - [ ] zoom no grid ainda nao implementado
2. validar zoom na sessao do mapa com rumores
3. testar como deixar imersimo a adicao dos rumores
4. paginacao/scroll de rumores quando o quadrante tiver muitos comentarios
5. death points e marcadores de loot no grid
   - [x] feito via sistema generico de pins arrastaveis no mapa (routes/pins.js + PinPalette): 💀 death point, 💰 loot, 🏰 cidade, ⚔️ combate, ❗ missao, 📍 generico — qualquer user logado cria, so dono/admin edita/apaga
6. quadro de missoes globais
   - [x] pin ❗ ja marca missao direto no mapa
   - [ ] falta uma visao em lista/board dedicada (separada do mapa) pra missoes globais
7. wiki
   - [x] backend le/estrutura a wiki a partir de um folder (apps/backend/wiki/), arquivos .md, exposto via api (crud de paginas e pastas, so admin edita)
   - [x] frontend em /wiki com navegacao em arvore + editor markdown (mesmo estilo do QuadrantPanel)
8. navbar
   - [x] redesenhada: icones por link, estado ativo em pilula (accent), brand clicavel pro mapa, badge "Admin", botao sair com hover de perigo
9. auth/usuarios (nao estava no roadmap original, mas evoluiu bastante e valia registrar)
   - [x] autenticacao real (users table, senha com bcrypt, JWT) — deixou de ser o login provisorio "qualquer senha funciona"
   - [x] admin gerencia usuarios (criar/editar/apagar) em /perfil
   - [x] fichas de personagem (nome/raca/classe/nivel) com CRUD, vinculadas ao usuario dono
10. campanhas em curso (docs/projeto.md)
    - [x] backend: tabelas `campaigns` (nome, mestre=criador, prologo) e `campaign_atas` (titulo+conteudo por sessao, ordenadas por created_at); qualquer user logado cria campanha/edita prologo/CRUD de atas; so mestre ou admin apaga a campanha inteira (cascade nas atas)
    - [x] frontend: /campanhas (lista + form de criar) e /campanhas/:id (prologo editavel + lista de atas em accordion, cada uma editavel/removivel)
    - [ ] papel de "mestrante" como algo distinto de player (hoje e so quem criou a campanha, sem gate de permissao sobre o conteudo — qualquer user logado edita qualquer campanha)
    - [ ] vinculo de campanha a personagens/rumores/mapa (hoje o mapa e o mundo sao unicos e compartilhados, sem separacao por campanha)