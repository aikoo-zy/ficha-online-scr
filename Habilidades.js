/* ============================================================
   HABILIDADES DO LIVRO (Sacramento RPG, pp. 34–41)
   Resumo das regras de cada uma, pra consulta rápida na mesa.
   Os textos completos estão no livro.

   Cada habilidade tem:
   - id:      nome curto usado no código (não mude depois de usar)
   - nome:    como aparece na carta
   - tipo:    "combate" ou "profissao"
   - texto:   resumo da regra
   - niveis:  (opcional) tabela que muda com o nível do personagem
   - repetir: (opcional) true se pode ser escolhida mais de uma vez
   - vida:    (opcional) Pontos de Vida que ela soma automaticamente

   Quer criar uma habilidade sua? Copie um bloco, troque o id e o texto.
   ============================================================ */

const HABILIDADES = [
  // ---------------- COMBATE ----------------
  { id: "armas-da-natureza", nome: "Armas da Natureza", tipo: "combate",
    texto: "Com armas rústicas (faca de pedra, lança de madeira, machadinha…), o ataque causa +1 Dano Letal para cada ponto de Físico." },

  { id: "ataque-sacana", nome: "Ataque Sacana", tipo: "combate",
    texto: "Atacando de surpresa (o alvo não viu você chegar) com faca, navalha ou outra lâmina escondida, causa Dano Letal extra.",
    niveis: [[1, "+1 Dano Letal"], [3, "+2 Dano Letal"], [6, "+3 Dano Letal"]] },

  { id: "briga-de-bar", nome: "Briga de Bar", tipo: "combate",
    texto: "Improvisa armas com o que estiver à mão. Objetos pequenos e médios causam 3 de Dano de Dor. Objetos grandes causam 1 de Dano Letal, mas dão −1 nos Testes de Violência." },

  { id: "coldre-de-sabao", nome: "Coldre de Sabão", tipo: "combate",
    texto: "Na Iniciativa (as cartas que decidem a ordem de quem age no combate), puxa duas cartas e escolhe qual usar: a maior ou a menor." },

  { id: "dedo-quente", nome: "Dedo Quente", tipo: "combate",
    texto: "+1 nos Testes de Violência com revólver. Contra alvos sem cobertura (que não estão protegidos atrás de nada), os tiros causam Dano Letal extra.",
    niveis: [[1, "+1 Dano Letal"], [3, "+2 Dano Letal"], [6, "+3 Dano Letal"]] },

  { id: "furia-dos-aflitos", nome: "Fúria dos Aflitos", tipo: "combate",
    texto: "Em combate, perde 1 de Defesa, mas os ataques corpo a corpo causam +3 de Dano de Dor." },

  { id: "gatilho-furioso", nome: "Gatilho Furioso", tipo: "combate",
    texto: "Dispara dois tiros de revólver com uma só Ação de Combate, gastando também um Movimento. Com mais Ações e Movimentos, segue atirando até o revólver esvaziar. Recarregar gasta Ações de Combate." },

  { id: "livramento", nome: "Livramento", tipo: "combate",
    texto: "Quando todos os Pontos de Vida acabam, cai no chão mas recupera 2 Pontos de Vida e continua vivo. Funciona uma vez por combate: se cair de novo, segue a regra normal de morte do livro." },

  { id: "marretada", nome: "Marretada", tipo: "combate",
    texto: "Ataques desarmados causam +1 de Dano de Dor para cada ponto de Físico." },

  { id: "parrudeza", nome: "Parrudeza", tipo: "combate", repetir: true, vida: 2,
    texto: "+2 Pontos de Vida (já somados na barra de Vida). Pode ser escolhida várias vezes." },

  { id: "punhos-do-oriente", nome: "Punhos do Oriente", tipo: "combate",
    texto: "Pode usar Movimentos para fazer ataques desarmados." },

  { id: "quebra-ossos", nome: "Quebra-Ossos", tipo: "combate",
    texto: "Gastando um Movimento e uma Ação de Combate, aplica agarrão, arremesso ou suplex. Escolha: deixa o oponente preso (imobilizado) ou causa o dano da tabela.",
    niveis: [[1, "1 Dano Letal + 1 Dano de Dor"], [3, "1 Dano Letal + 2 Dano de Dor"], [6, "2 Dano Letal + 3 Dano de Dor"]] },

  { id: "sorte-dos-covardes", nome: "Sorte dos Covardes", tipo: "combate",
    texto: "No começo do combate, puxa uma carta e ganha até o fim dele: ♣ +2 Ações de Combate · ♥ +2 de Vida · ♠ +2 Movimentos · ♦ +1 em Violência. Só funciona com no máximo 1 em Intelecto e 2 em Violência." },

  { id: "valei-me", nome: "Valei-me", tipo: "combate",
    texto: "Improvisa explosivos com sucata (pano, garrafa, bebida, parafuso…) se passar num Teste de Tradição. Em combate, cada explosivo custa 2 Ações de Combate e 1 Movimento. O dano do explosivo está na tabela.",
    niveis: [[1, "2 Dano Letal"], [3, "3 Dano Letal"], [6, "4 Dano Letal"]] },

  { id: "zoi-de-gaviao", nome: "Zói de Gavião", tipo: "combate",
    texto: "+1 nos Testes de Violência com fuzil ou arco longo. Em posição vantajosa (no alto, escondido ou com o alvo exposto, o mestre decide), os disparos causam Dano Letal extra.",
    niveis: [[1, "+1 Dano Letal"], [3, "+2 Dano Letal"], [6, "+3 Dano Letal"]] },

  // ---------------- PROFISSÃO ----------------
  { id: "as-na-manga", nome: "Às na Manga", tipo: "profissao",
    texto: "Em testes de jogos de cartas, rola 2 dados e usa o maior." },

  { id: "boca-na-botija", nome: "Boca na Botija", tipo: "profissao",
    texto: "Testes de Atenção: rola 2 dados e usa o maior. Não perde Defesa por ser pego de surpresa." },

  { id: "cancao-da-emocao", nome: "Canção da Emoção", tipo: "profissao",
    texto: "Toca um modão pra animar a gangue. Uma vez por sessão, gasta 2 Ações de Combate por aliado pra dar a eles um bônus da tabela (só os do seu nível ou abaixo). Cada bônus a mais custa outras 2 Ações por aliado.",
    niveis: [[1, "+1 Movimento"], [3, "+1 Ação de Combate"], [4, "+1 em Violência"], [6, "+3 Vida temporária"]] },

  { id: "chamego", nome: "Chamego", tipo: "profissao",
    texto: "Testes pra laçar: rola 2 dados e usa o maior. Quem tenta se soltar do seu laço tem −1." },

  { id: "cuspe-e-cola", nome: "Cuspe e Cola", tipo: "profissao",
    texto: "Única forma de curar alguém no meio do combate: colado no aliado, gasta 2 Ações de Combate pra cada Ponto de Vida curado. Os usos por combate estão na tabela.",
    niveis: [[1, "1 uso por combate"], [3, "2 usos por combate"], [6, "4 usos por combate"]] },

  { id: "fogo-no-ceu", nome: "Fogo no Céu", tipo: "profissao",
    texto: "Testes com explosivos: rola 2 dados e usa o maior. Se tirar falha crítica com explosivo, não explode a si mesmo." },

  { id: "fumaca-na-agua", nome: "Fumaça na Água", tipo: "profissao",
    texto: "Testes de Roubo pra afanar, se esconder ou andar em silêncio: rola 2 dados e usa o maior." },

  { id: "galope-certeiro", nome: "Galope Certeiro", tipo: "profissao",
    texto: "Testes de Montaria no seu próprio cavalo: rola 2 dados e usa o maior. Sem penalidade em montarias desconhecidas." },

  { id: "nao-vai-doer-nadinha", nome: "Não Vai Doer Nadinha", tipo: "profissao",
    texto: "Testes de Medicina: rola 2 dados e usa o maior. Quando cura alguém, ele recupera os Pontos de Vida extras da tabela.",
    niveis: [[1, "+1 Ponto de Vida curado"], [3, "+2 Pontos de Vida curados"], [6, "+4 Pontos de Vida curados"]] },

  { id: "natural-da-natureza", nome: "Natural da Natureza", tipo: "profissao",
    texto: "Testes de Suor: rola 2 dados e usa o maior. Acha plantas, ervas e abrigo na natureza sem precisar de teste." },

  { id: "sabia-imperatriz", nome: "Sabiá Imperatriz", tipo: "profissao",
    texto: "Testes de Negócios: rola 2 dados e usa o maior." },

  { id: "sabugos-e-peconhas", nome: "Sabugos e Peçonhas", tipo: "profissao",
    texto: "Faz venenos que causam 1 de Dano de Dor a cada ação do alvo, até ser curado, resistido ou o alvo desmaiar." },

  { id: "salve-se-quem-puder", nome: "Salve-se Quem Puder", tipo: "profissao",
    texto: "Testes pra escapar ou fugir: rola 2 dados e usa o maior. Na fuga, +1 Movimento só pra correr. Não vale em duelo." },

  { id: "sorrisao", nome: "Sorrisão, Chapéu na Mão", tipo: "profissao",
    texto: "Compra itens comuns com 25% de desconto e vende 25% mais caro que o preço da tabela. Não vale pra itens especiais ou raros." },

  { id: "zoi-de-coruja", nome: "Zói de Coruja", tipo: "profissao",
    texto: "Testes de Tradição pra lembrar de algum conhecimento: rola 2 dados e usa o maior." },
];
