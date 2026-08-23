Porjeto para plataforma de compatilhamento de campanha para RPG no estilko west marches

Conceito inicial da plataforma

Mapa Mundial
- Mapa com grid sobre uma imagem
- Grid de 32 colunas por 20 linhas, board com proporcao 16:10, colado a esquerda da tela
- Imagem de fundo do mapa e trocada via upload (somente admin)
- Cada quadrado do grid abre um painel ao lado (a direita do grid) com:
    - Resumo do quadrante em Markdown, editavel por qualquer usuario logado (arquivo .md por quadrante no backend)
    - Lista de "rumores" (comentarios) sobre aquele quadrante, com CRUD completo
- Os rumores sao colocados pelos jogadores
- Diversas campanhas podem rolar sobre o mapa 
- Death points conhecidos
- Marcadores de loot
- Quadro de missoes globais
- Rumores podem ser compartilhados maracando qual personagem que falou aquilo player/npc ou pode colocar como mensagem anonima
    - Cada rumor guarda tambem o usuario logado que criou (para permitir editar/apagar so o proprio rumor, admin pode mexer em qualquer um)

Wiki
- Regras do Jogo
- Personagens/npcs conhecidos
- Quest abertas

Plataforma
- Login por usuario
- Roles do user, Admin, player e/ou mestrante (qualquer um pode ser mestrante de alguma campanha)
- Fichas de personagens por usuario

Camapanhas em curso
- Lista de campanhas em curso
- Cada campanha 
    - Tem o prologo da camapanha
    - tem uma ata doque rolou naquela campanha
