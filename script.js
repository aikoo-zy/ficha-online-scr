/* ============================================================
   FICHA DE SACRAMENTO — lógica
   Tudo que o jogador preenche fica no objeto "ficha" e é salvo
   no navegador (localStorage) a cada mudança.
   ============================================================ */

// ---------- 1. Regras do livro ----------

const ATRIBUTOS = [
  { id: "fisico",     nome: "Físico",     efeito: "+1 Ponto de Vida para cada ponto" },
  { id: "velocidade", nome: "Velocidade", efeito: "+1 Movimento por ponto" },
  { id: "intelecto",  nome: "Intelecto",  efeito: "+1 ponto de Antecedente por ponto" },
  { id: "coragem",    nome: "Coragem",    efeito: "+1 Ação de Combate por ponto" },
];

const ANTECEDENTES = [
  { id: "atencao",   nome: "Atenção" },
  { id: "roubo",     nome: "Roubo" },
  { id: "medicina",  nome: "Medicina" },
  { id: "suor",      nome: "Suor" },
  { id: "montaria",  nome: "Montaria" },
  { id: "tradicao",  nome: "Tradição" },
  { id: "negocios",  nome: "Negócios" },
  { id: "violencia", nome: "Violência" },
];

const TABELA_DOR = [
  ["Atordoamento",  "−1 Ação de Combate na próxima rodada."],
  ["Queda",         "Gaste um Movimento para se levantar."],
  ["Distração",     "Não pode atacar esse mesmo alvo no próximo ataque."],
  ["Sangramento",   "+1 dano na Vida por turno até o fim do combate."],
  ["Intimidação",   "Precisa se afastar do atacante na próxima rodada."],
  ["Desorientação", "−1 em Testes de Violência no próximo turno."],
];

const ACERTO_CRITICO = [
  "Mortal: +2 de dano no seu turno.",
  "Dança Maluca: o inimigo perde seu próximo turno no combate.",
  "Desarmar: o inimigo não pode mais atirar com aquela arma.",
  "Vantagem Moral: +1 nos seus Testes de Violência até o fim do combate.",
  "Vantagem Tática: +1 Movimento no seu turno até o fim do combate.",
  "Marca da Vingança: o inimigo foge, mas jura vingança contra você.",
];

const FALHA_CRITICA = [
  "Seu ataque acerta um aliado ou uma pessoa inocente.",
  "Sua arma quebra ou, em caso de porrada, o dano é anulado.",
  "Guarda aberta: +1 nos testes dos inimigos contra você até o fim do combate.",
  "Pressão: −1 no ataque contra os inimigos até o fim do combate.",
  "Você está abatido e perde seu próximo turno para se recompor.",
  "Você cai feio e perde duas ações de qualquer tipo para levantar.",
];

const FIDELIDADE = [
  "Montaria estranha: sem bônus.",
  "Atende quando chamada pelo nome.",
  "Ganha +1 ponto em um dos dois Atributos à sua escolha.",
  "Quando chamada, vai até você se estiver a até 500 m.",
  "Sem penalidades para saltar obstáculos perigosos.",
  "Ganha +1 ponto em um dos dois Atributos à sua escolha.",
];

// Condições iniciais (iguais para todo PJ)
const BASE = { vida: 6, dor: 6, acoes: 1, movimentos: 1, antecedentes: 4, atributos: 4, defesa: 5 };
const MAX_ANTECEDENTE = 5; // bolinhas na ficha

// ---------- 2. A ficha (estado) ----------

const CHAVE = "ficha-sacramento-v2";

const TOTAL_COLDRES = 4;
function coldreVazio() {
  return { nome: "", dano: "", espaco: "", municao: 0, reserva: 0 };
}

function fichaNova() {
  return {
    nome: "",
    foto: "",          // retrato salvo como imagem (texto base64)
    atributos: { fisico: 0, velocidade: 0, intelecto: 0, coragem: 0 },
    antecedentes: Object.fromEntries(ANTECEDENTES.map(a => [a.id, 0])),
    iniciativa: "",
    defesaBonus: 0,
    dor: 0,            // quantos Pontos de Dor riscados
    vidaRiscada: 0,    // quantos Pontos de Vida riscados
    vidaBonus: 0,      // vida extra vinda de habilidades
    habilidades: "",   // anotações livres
    habilidadesLista: [], // ids das habilidades do livro (ver habilidades.js)
    nivel: 1,
    capacidade: 10,
    itens: [{ nome: "", espaco: "" }],
    coldres: Array.from({ length: 4 }, coldreVazio),
    montaria: { nome: "", potencia: 0, resistencia: 0, dor: 0, vidaRiscada: 0, fidelidade: 0 },
    historico: [],
  };
}

/*
  Várias fichas no mesmo aparelho. Tudo fica num "banco" assim:
  { atual: "id-da-ficha-aberta", fichas: { "id1": {...ficha...}, "id2": {...} } }
*/
const CHAVE_ANTIGA = "ficha-sacramento-v1"; // versão que guardava uma ficha só

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Completa campos que faltam (fichas antigas ou importadas)
function normalizar(dados) {
  const f = Object.assign(fichaNova(), dados);
  f.montaria = Object.assign(fichaNova().montaria, f.montaria);
  f.atributos = Object.assign(fichaNova().atributos, f.atributos);
  f.antecedentes = Object.assign(fichaNova().antecedentes, f.antecedentes);
  // fichas antigas tinham uma lista "armas": passa as 4 primeiras pros coldres
  if (f.armas) {
    f.armas.slice(0, TOTAL_COLDRES).forEach((a, i) => Object.assign(f.coldres[i], { nome: a.nome, dano: a.dano, espaco: a.espaco }));
    delete f.armas;
  }
  while (f.coldres.length < TOTAL_COLDRES) f.coldres.push(coldreVazio());
  f.coldres = f.coldres.slice(0, TOTAL_COLDRES).map(c => Object.assign(coldreVazio(), c));
  if (!Array.isArray(f.itens)) f.itens = [];
  if (!Array.isArray(f.habilidadesLista)) f.habilidadesLista = [];
  f.nivel = Math.max(1, Number(f.nivel) || 1);
  if (!Array.isArray(f.historico)) f.historico = [];
  return f;
}

function carregarBanco() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) {
      const b = JSON.parse(salvo);
      const ids = Object.keys(b.fichas || {});
      if (ids.length) {
        ids.forEach(id => { b.fichas[id] = normalizar(b.fichas[id]); });
        if (!b.fichas[b.atual]) b.atual = ids[0];
        return b;
      }
    }
    const antiga = localStorage.getItem(CHAVE_ANTIGA);
    if (antiga) {
      const id = novoId();
      return { atual: id, fichas: { [id]: normalizar(JSON.parse(antiga)) } };
    }
  } catch (e) { /* sem acesso ao armazenamento: começa do zero */ }
  const id = novoId();
  return { atual: id, fichas: { [id]: fichaNova() } };
}

let banco = carregarBanco();

// Se a página abriu com um link de ficha (?ficha=ID), essa é a ficha da vez
const idDoLink = (() => {
  try { return new URLSearchParams(location.search).get("ficha"); } catch (e) { return null; }
})();
if (idDoLink && /^[\w-]{4,40}$/.test(idDoLink)) {
  if (!banco.fichas[idDoLink]) banco.fichas[idDoLink] = fichaNova(); // será preenchida pela nuvem
  banco.atual = idDoLink;
}
let ficha = banco.fichas[banco.atual];

// Salva no aparelho (sempre) e, se a nuvem estiver ligada, manda pra lá também
function salvarLocal() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(banco));
  } catch (e) {
    avisoFicha("Não deu pra salvar: o navegador está sem espaço. Exporte suas fichas pra não perder nada.");
  }
}
function salvar() {
  salvarLocal();
  agendarNuvem();
}

// Lê/escreve campos com caminho tipo "montaria.nome"
function lerCaminho(caminho) {
  return caminho.split(".").reduce((obj, k) => obj[k], ficha);
}
function gravarCaminho(caminho, valor) {
  const partes = caminho.split(".");
  const ultima = partes.pop();
  const alvo = partes.reduce((obj, k) => obj[k], ficha);
  alvo[ultima] = valor;
}

// ---------- 3. Contas automáticas ----------


// Vida que vem de habilidades (ex.: Parrudeza = +2 cada vez que foi escolhida)
function vidaDasHabilidades(f) {
  if (typeof HABILIDADES === "undefined") return 0;
  return (f.habilidadesLista || []).reduce((soma, id) => {
    const h = HABILIDADES.find(x => x.id === id);
    return soma + (h && h.vida ? h.vida : 0);
  }, 0);
}

function calcular() {
  const at = ficha.atributos;
  const fid = ficha.montaria.fidelidade;
  return {
    vidaMax: BASE.vida + at.fisico + ficha.vidaBonus + vidaDasHabilidades(ficha),
    movimentos: BASE.movimentos + at.velocidade,
    acoes: BASE.acoes + at.coragem,
    pontosAntecedente: BASE.antecedentes + at.intelecto,
    defesa: BASE.defesa + (Number(ficha.defesaBonus) || 0),
    pontosMontaria: 3 + (fid >= 2 ? 1 : 0) + (fid >= 5 ? 1 : 0),
    montariaVidaMax: BASE.vida + ficha.montaria.resistencia,
  };
}

// ---------- 4. Desenho da ficha ----------

const $ = id => document.getElementById(id);


function desenharAtributos() {
  const lista = $("lista-atributos");
  lista.innerHTML = ATRIBUTOS.map(a => `
    <div>
      <div class="atributo-linha">
        <button class="nome-rolavel" data-rolar-atributo="${a.id}">${a.nome}</button>
        <div class="ajuste">
          <button class="mini" data-ajuste="atributos.${a.id}" data-passo="-1" aria-label="Diminuir ${a.nome}">−</button>
          <span class="valor-grande">${ficha.atributos[a.id]}</span>
          <button class="mini" data-ajuste="atributos.${a.id}" data-passo="1" aria-label="Aumentar ${a.nome}">+</button>
        </div>
      </div>
      <div class="atributo-efeito">${a.efeito}</div>
    </div>`).join("");
}

function desenharAntecedentes() {
  const lista = $("lista-antecedentes");
  lista.innerHTML = ANTECEDENTES.map(a => {
    const valor = ficha.antecedentes[a.id];
    let pontos = "";
    for (let i = 1; i <= MAX_ANTECEDENTE; i++) {
      pontos += `<button class="ponto ${i <= valor ? "cheio" : ""}" data-antecedente="${a.id}" data-valor="${i}" aria-label="${a.nome} ${i}"></button>`;
    }
    return `
      <div class="antecedente">
        <button class="nome-rolavel" data-rolar-antecedente="${a.id}">${a.nome}</button>
        <span class="antecedente-base">1d6 + ${valor}</span>
        <div class="pontos">${pontos}</div>
      </div>`;
  }).join("");
}


function desenharTabelaDor(sorteado) {
  $("tabela-dor").innerHTML = TABELA_DOR.map(([nome, efeito], i) =>
    `<li class="${sorteado === i + 1 ? "sorteado" : ""}"><span>${i + 1}</span><span>${nome}</span><span>${efeito}</span></li>`
  ).join("");
}

function desenharItens() {
  $("corpo-itens").innerHTML = ficha.itens.map((item, i) => `
    <tr>
      <td><input type="text" value="${esc(item.nome)}" placeholder="Nome do item" data-lista="itens" data-i="${i}" data-k="nome" aria-label="Item"></td>
      <td><input type="number" min="0" step="0.5" value="${esc(item.espaco)}" placeholder="0" data-lista="itens" data-i="${i}" data-k="espaco" aria-label="Espaço"></td>
      <td><button class="remover" data-remover="itens" data-i="${i}" aria-label="Remover item">×</button></td>
    </tr>`).join("");
}

function desenharColdres() {
  $("coldres").innerHTML = ficha.coldres.map((c, i) => {
    const vazio = !c.nome && !c.dano && !c.espaco && !Number(c.municao) && !Number(c.reserva);
    return `
    <article class="coldre ${vazio ? "vazio" : ""}">
      <header class="coldre-topo">
        <span class="coldre-num">Coldre ${i + 1}</span>
        <button class="link-botao" data-limpar-coldre="${i}" ${vazio ? "hidden" : ""}>Esvaziar</button>
      </header>
      <input class="coldre-nome" type="text" placeholder="Nome da arma" value="${esc(c.nome)}"
        data-lista="coldres" data-i="${i}" data-k="nome" aria-label="Nome da arma do coldre ${i + 1}">
      <div class="coldre-dados">
        <label class="coldre-campo"><span>Dano</span>
          <input type="text" placeholder="ex.: 2" value="${esc(c.dano)}" data-lista="coldres" data-i="${i}" data-k="dano">
        </label>
        <label class="coldre-campo"><span>Espaço</span>
          <input type="number" min="0" step="0.5" placeholder="0" value="${esc(c.espaco)}" data-lista="coldres" data-i="${i}" data-k="espaco">
        </label>
      </div>
      <div class="coldre-municao">
        ${contadorMunicao(i, "municao", "Munição atual", c.municao)}
        ${contadorMunicao(i, "reserva", "Reserva", c.reserva)}
      </div>
    </article>`;
  }).join("");
}

function contadorMunicao(i, k, rotulo, valor) {
  return `
    <div class="municao">
      <span class="municao-rotulo">${rotulo}</span>
      <div class="ajuste">
        <button class="mini" data-municao="${i}" data-k="${k}" data-passo="-1" aria-label="Menos ${rotulo.toLowerCase()}">−</button>
        <input class="municao-valor" type="number" min="0" value="${Number(valor) || 0}"
          data-lista="coldres" data-i="${i}" data-k="${k}" aria-label="${rotulo} do coldre ${i + 1}">
        <button class="mini" data-municao="${i}" data-k="${k}" data-passo="1" aria-label="Mais ${rotulo.toLowerCase()}">+</button>
      </div>
    </div>`;
}

function desenharFidelidade() {
  const atual = ficha.montaria.fidelidade;
  $("fidelidade").innerHTML = FIDELIDADE.map((texto, n) => `
    <button class="nivel ${n <= atual ? "alcancado" : ""} ${n === atual ? "atual" : ""}" role="radio" aria-checked="${n === atual}" data-fidelidade="${n}">
      <span class="nivel-num">${n}</span><span>${texto}</span>
    </button>`).join("");
}

// Atualiza números e contadores (sem redesenhar listas)
function atualizarResumo() {
  const c = calcular();

  $("val-movimentos").textContent = c.movimentos;
  $("val-acoes").textContent = c.acoes;
  // Defesa: 5 fixo + bônus/penalidade digitado (mostra o total só quando muda)
  const bonus = Number(ficha.defesaBonus) || 0;
  $("defesa-bonus-valor").textContent = bonus > 0 ? `+${bonus}` : bonus < 0 ? `−${-bonus}` : "±0";
  $("defesa-bonus-valor").className = "defesa-bonus" + (bonus > 0 ? " positivo" : bonus < 0 ? " negativo" : "");
  $("val-defesa").textContent = bonus ? `Total ${c.defesa}` : "";

  const m = ficha.montaria;

  ficha.vidaRiscada = Math.min(ficha.vidaRiscada, c.vidaMax);
  ficha.dor = Math.min(ficha.dor, BASE.dor);
  desenharBarra("barra-dor", BASE.dor, ficha.dor);
  desenharBarra("barra-vida", c.vidaMax, ficha.vidaRiscada);
  m.dor = Math.min(m.dor, BASE.dor);
  m.vidaRiscada = Math.min(m.vidaRiscada, c.montariaVidaMax);
  desenharBarra("barra-montaria-dor", BASE.dor, m.dor);
  desenharBarra("barra-montaria-vida", c.montariaVidaMax, m.vidaRiscada);
  $("val-vida-bonus").textContent = ficha.vidaBonus;

  const usado = [...ficha.itens, ...ficha.coldres].reduce((s, x) => s + (parseFloat(x.espaco) || 0), 0);
  const cap = Number(ficha.capacidade) || 0;
  $("resumo-espaco").textContent = `${formatar(usado)} / ${cap} espaços`;
  $("resumo-espaco").classList.toggle("estourou", usado > cap);

  $("val-potencia").textContent = m.potencia;
  $("val-resistencia").textContent = m.resistencia;

  $("alerta-dor").hidden = ficha.dor < BASE.dor;
}

// Qual valor cada barra controla e qual o máximo dela
const BARRAS = {
  "dor":           { caminho: "dor",                  max: () => BASE.dor },
  "vida":          { caminho: "vidaRiscada",          max: () => calcular().vidaMax },
  "montaria-dor":  { caminho: "montaria.dor",         max: () => BASE.dor },
  "montaria-vida": { caminho: "montaria.vidaRiscada", max: () => calcular().montariaVidaMax },
};

// Barra de Dor/Vida: mostra quantos círculos ainda restam.
// O pulso fica mais rápido conforme a barra esvazia.
function desenharBarra(id, max, riscados) {
  const el = $(id);
  const resta = Math.max(0, max - riscados);
  const razao = max ? resta / max : 0;
  el.style.setProperty("--pct", `${razao * 100}%`);
  el.style.setProperty("--segmentos", Math.max(1, max));
  el.style.setProperty("--vel", razao > 0.6 ? "2.6s" : razao > 0.3 ? "1.6s" : "0.9s");
  el.classList.toggle("perigo", resta > 0 && razao <= 0.3);
  el.setAttribute("aria-valuemax", max);
  el.setAttribute("aria-valuenow", resta);
}

function desenharTudo() {
  const c = calcular();
  // campos de texto simples
  document.querySelectorAll("[data-campo]").forEach(el => { el.value = lerCaminho(el.dataset.campo); });
  desenharFoto();
  desenharHabilidades();
  $("val-nivel").textContent = ficha.nivel;
  desenharAtributos();
  desenharAntecedentes();
  desenharTabelaDor();
  desenharItens();
  desenharColdres();
  desenharFidelidade();
  desenharHistorico();
  atualizarResumo();
}

// ---------- 5. Dados ----------

const rolar = lados => Math.floor(Math.random() * lados) + 1;

/* ------------------------------------------------------------
   5a. ARENA 3D
   Usa a biblioteca three.js (carregada no index.html).
   Ideia: sorteamos o número ANTES, e a animação faz o dado
   rolar pela mesa e parar com aquela face virada pra cima.
   ------------------------------------------------------------ */
const Arena = (() => {
  const caixa = $("arena");
  let renderer, cena, camera, ok = false;
  const dados = {};         // dados já montados: { 6: {...}, 12: {...} }
  let atual = null;         // dado que está na mesa
  let animacao = 0;         // id pra cancelar animação antiga
  const CIMA = () => new THREE.Vector3(0, 1, 0);
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function iniciar() {
    if (!window.THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    caixa.appendChild(renderer.domElement);

    cena = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 6.6, 3.3);
    camera.lookAt(0, 0, 0.2);

    cena.add(new THREE.AmbientLight(0xffffff, 0.5));
    const luz = new THREE.DirectionalLight(0xfff0d0, 0.85);
    luz.position.set(-3, 9, 3);
    luz.castShadow = true;
    luz.shadow.mapSize.set(1024, 1024);
    Object.assign(luz.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    cena.add(luz);
    const luzQuente = new THREE.PointLight(0xffb36b, 0.35, 20);
    luzQuente.position.set(3, 4, -2);
    cena.add(luzQuente);

    // chão invisível que só recebe a sombra (o feltro é desenhado no CSS)
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.5 }));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    cena.add(chao);

    ajustarTamanho();
    if (window.ResizeObserver) new ResizeObserver(() => { ajustarTamanho(); desenhar(); }).observe(caixa);
    return true;
  }

  function ajustarTamanho() {
    const w = caixa.clientWidth || 300, h = caixa.clientHeight || 230;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const desenhar = () => { if (ok) renderer.render(cena, camera); };

  // Desenha uma face num canvas e vira textura.
  // Guarda a receita de cada face pra repintar quando a imagem do crânio terminar de carregar.
  const texturas = [];
  function textura(pintar, tam = 256) {
    const c = document.createElement("canvas");
    c.width = c.height = tam;
    pintar(c.getContext("2d"));
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    texturas.push({ c, pintar, t });
    return t;
  }

  // Imagem do crânio (caveira.png) usada no 6 do d6 e no 12 do d12
  const IMG_CAVEIRA = new Image();
  IMG_CAVEIRA.onload = () => {
    texturas.forEach(({ c, pintar, t }) => {
      const g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      pintar(g);
      t.needsUpdate = true;
    });
    desenhar();
  };
  IMG_CAVEIRA.src = "caveira.png?v=20261017e";

  // Pinta um pedaço de madeira clara com veios (cada face fica um pouco diferente)
  function pintarMadeira(g, tam, semente = Math.random() * 1000) {
    let s = semente;
    const aleatorio = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const fundo = g.createLinearGradient(0, 0, tam, tam);
    fundo.addColorStop(0, "#d9b27a");
    fundo.addColorStop(0.5, "#c99c60");
    fundo.addColorStop(1, "#b98a50");
    g.fillStyle = fundo;
    g.fillRect(0, 0, tam, tam);
    // veios
    for (let i = 0; i < Math.round(tam / 6); i++) {
      const y0 = aleatorio() * tam;
      const amp = 1 + aleatorio() * (tam / 90);
      const freq = (0.5 + aleatorio()) * (Math.PI * 2 / tam) * 1.5;
      const fase = aleatorio() * Math.PI * 2;
      g.beginPath();
      for (let x = 0; x <= tam; x += 4) {
        const y = y0 + Math.sin(x * freq + fase) * amp + Math.sin(x * freq * 3.1 + fase) * amp * 0.3;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.strokeStyle = `rgba(${90 + aleatorio() * 30 | 0}, ${55 + aleatorio() * 20 | 0}, 25, ${0.08 + aleatorio() * 0.22})`;
      g.lineWidth = 0.6 + aleatorio() * (tam / 120);
      g.stroke();
    }
    // um nó na madeira, às vezes
    if (aleatorio() < 0.5) {
      const x = aleatorio() * tam, y = aleatorio() * tam, r = tam * (0.04 + aleatorio() * 0.05);
      const no = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
      no.addColorStop(0, "rgba(80,45,18,0.55)");
      no.addColorStop(0.4, "rgba(110,65,28,0.25)");
      no.addColorStop(1, "rgba(110,65,28,0)");
      g.fillStyle = no;
      g.beginPath(); g.ellipse(x, y, r * 2.2, r * 1.2, aleatorio() * 0.6, 0, Math.PI * 2); g.fill();
    }
    // bordas mais escuras, como madeira gasta
    const borda = g.createRadialGradient(tam / 2, tam / 2, tam * 0.3, tam / 2, tam / 2, tam * 0.75);
    borda.addColorStop(0, "rgba(60,35,15,0)");
    borda.addColorStop(1, "rgba(60,35,15,0.45)");
    g.fillStyle = borda;
    g.fillRect(0, 0, tam, tam);
    // tom mais escuro e menos amarelo
    g.fillStyle = "rgba(70, 40, 15, 0.22)";
    g.fillRect(0, 0, tam, tam);
  }

  // Quinas escurecidas, como um dado gasto de cantos arredondados (só nas faces do d6)
  function pintarChanfro(g, tam) {
    const b = tam * 0.06;
    const sombra = (x0, y0, x1, y1) => {
      const l = g.createLinearGradient(x0, y0, x1, y1);
      l.addColorStop(0, "rgba(40,22,8,0.55)");
      l.addColorStop(1, "rgba(40,22,8,0)");
      return l;
    };
    g.fillStyle = sombra(0, 0, b, 0); g.fillRect(0, 0, b, tam);
    g.fillStyle = sombra(tam, 0, tam - b, 0); g.fillRect(tam - b, 0, b, tam);
    g.fillStyle = sombra(0, 0, 0, b); g.fillRect(0, 0, tam, b);
    g.fillStyle = sombra(0, tam, 0, tam - b); g.fillRect(0, tam - b, tam, b);
  }

  // Medalhão: círculo preto com o crânio vazado, mostrando a madeira por baixo.
  // A imagem caveira.png é só o formato do crânio (silhueta); ela "fura" o círculo.
  function pintarMedalhao(g, cx, cy, raio) {
    const tela = document.createElement("canvas");
    tela.width = tela.height = g.canvas.width;
    const m = tela.getContext("2d");
    m.beginPath(); m.arc(cx, cy, raio, 0, Math.PI * 2);
    m.fillStyle = "#160f08"; m.fill();
    m.globalCompositeOperation = "destination-out"; // tudo que for desenhado agora vira buraco
    const tamanho = raio * 1.5;
    if (IMG_CAVEIRA.complete && IMG_CAVEIRA.naturalWidth) {
      const r = IMG_CAVEIRA.naturalWidth / IMG_CAVEIRA.naturalHeight;
      const w = r > 1 ? tamanho : tamanho * r, h = r > 1 ? tamanho / r : tamanho;
      m.drawImage(IMG_CAVEIRA, cx - w / 2, cy - h / 2, w, h);
    } else {
      caveiraDesenhada(m, cx, cy, tamanho); // reserva, se a imagem não carregar
    }
    g.drawImage(tela, 0, 0);
  }

  // Desenho simples do crânio (reserva, caso a imagem não carregue).
  // Desenhado em uma grade de 256 × 256 e redimensionado pro tamanho pedido.
  function caveiraDesenhada(g, cx, cy, tamanho) {
    const esc = tamanho / 230;
    g.save();
    g.translate(cx, cy);
    g.scale(esc, esc);
    g.translate(-128, -122);
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = "#2a180b"; g.fillStyle = "#2a180b";

    // chifres: desenha um lado e espelha pro outro
    for (const lado of [1, -1]) {
      g.save();
      if (lado === -1) { g.translate(256, 0); g.scale(-1, 1); }
      const galho = (pts, larg) => {
        g.lineWidth = larg; g.beginPath(); g.moveTo(pts[0], pts[1]);
        g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); g.stroke();
      };
      galho([108, 96, 86, 78, 46, 72, 34, 18], 11);   // haste principal
      galho([66, 76, 54, 62, 50, 50, 56, 30], 7);     // ponta do meio
      galho([46, 62, 30, 58, 20, 52, 14, 40], 6);     // ponta de fora
      galho([88, 84, 82, 72, 84, 60, 92, 48], 6);     // ponta de dentro
      galho([104, 92, 96, 86, 86, 90, 76, 96], 5);    // ponta baixa
      g.restore();
    }

    // crânio
    g.beginPath();
    g.moveTo(100, 98);
    g.quadraticCurveTo(128, 82, 156, 98);
    g.quadraticCurveTo(176, 112, 170, 134);
    g.quadraticCurveTo(162, 150, 152, 160);
    g.quadraticCurveTo(146, 196, 140, 222);
    g.quadraticCurveTo(128, 236, 116, 222);
    g.quadraticCurveTo(110, 196, 104, 160);
    g.quadraticCurveTo(94, 150, 86, 134);
    g.quadraticCurveTo(80, 112, 100, 98);
    g.fill();

    // detalhes escuros (órbitas, furos, nariz e a linha do meio)
    g.fillStyle = "#c99c60"; g.strokeStyle = "#c99c60";
    const elipse = (x, y, rx, ry, rot) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
    elipse(103, 128, 8, 12, -0.5);
    elipse(153, 128, 8, 12, 0.5);
    elipse(116, 110, 3.5, 6, 0.3);
    elipse(140, 110, 3.5, 6, -0.3);
    elipse(122, 214, 3.5, 8, 0.1);
    elipse(134, 214, 3.5, 8, -0.1);
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(128, 92); g.lineTo(128, 204); g.stroke();
    g.restore();
  }

  // ---- d6: cubo de madeira com bolinhas pretas ----
  const PIPS6 = { 1: [[.5,.5]], 2: [[.27,.27],[.73,.73]], 3: [[.27,.27],[.5,.5],[.73,.73]],
    4: [[.27,.27],[.73,.27],[.27,.73],[.73,.73]], 5: [[.27,.27],[.73,.27],[.5,.5],[.27,.73],[.73,.73]],
    6: [[.27,.25],[.73,.25],[.27,.5],[.73,.5],[.27,.75],[.73,.75]] };

  function montarD6() {
    // ordem das faces no three.js: +x, -x, +y, -y, +z, -z (opostos somam 7)
    const valores = [3, 4, 5, 2, 1, 6];
    const normais = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    const materiais = valores.map((v, i) => new THREE.MeshStandardMaterial({
      roughness: 0.75,
      metalness: 0,
      map: textura(g => {
        pintarMadeira(g, 256, 17 + i * 31);
        pintarChanfro(g, 256);
        if (v === 6) return pintarMedalhao(g, 128, 128, 100);
        PIPS6[v].forEach(([x, y]) => {
          const px = x * 256, py = y * 256, r = v === 1 ? 26 : 21;
          g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2);
          g.fillStyle = "#160f08"; g.fill();
          g.beginPath(); g.arc(px - r * 0.25, py - r * 0.25, r * 0.3, 0, Math.PI * 2);
          g.fillStyle = "rgba(255, 240, 220, 0.08)"; g.fill(); // brilho de furo entalhado
        });
      }),
    }));
    const malha = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materiais);
    malha.castShadow = true;
    const faces = {};
    valores.forEach((v, i) => { faces[v] = new THREE.Vector3(...normais[i]); });
    return { malha, faces, altura: 0.5 };
  }

  // ---- d12: dodecaedro de madeira com números pretos ----
  function montarD12() {
    const raio = 0.78;
    const geo = new THREE.DodecahedronGeometry(raio, 0);
    const malha = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: textura(g => pintarMadeira(g, 512, 91), 512),
      roughness: 0.75, metalness: 0, flatShading: true,
    }));
    malha.castShadow = true;

    // descobre as 12 faces juntando triângulos com a mesma normal
    const pos = geo.attributes.position;
    const normais = [];
    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if (n.dot(a) < 0) n.negate(); // garante que a normal aponta pra fora
      if (!normais.some(m => m.n.distanceTo(n) < 0.01)) normais.push({ n, d: n.dot(a) });
    }
    // números em faces opostas somam 13
    const faces = {};
    let prox = 1;
    normais.forEach(f => {
      if (Object.values(faces).some(x => x.distanceTo(f.n) < 0.01)) return;
      const oposta = normais.find(o => o.n.distanceTo(f.n.clone().negate()) < 0.01);
      faces[prox] = f.n; faces[13 - prox] = oposta.n; prox++;
    });

    // um "adesivo" com o número em cada face
    Object.entries(faces).forEach(([num, n]) => {
      const tex = textura(g => {
        g.clearRect(0, 0, 256, 256);
        if (num === "12") return pintarMedalhao(g, 128, 128, 100);
        g.fillStyle = "#1a1109";
        g.font = "bold 150px Rye, Georgia, serif";
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(num, 128, 140);
        if (num === "6" || num === "9") { g.fillRect(88, 210, 80, 10); }
      });
      const adesivo = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.62),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, metalness: 0 })
      );
      const d = normais.find(x => x.n === n).d;
      adesivo.position.copy(n.clone().multiplyScalar(d + 0.003));
      adesivo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      malha.add(adesivo);
    });
    return { malha, faces, altura: normais[0].d };
  }

  function pegarDado(lados) {
    if (!dados[lados]) dados[lados] = lados === 12 ? montarD12() : montarD6();
    const d = dados[lados];
    if (atual !== d) {
      if (atual) cena.remove(atual.malha);
      cena.add(d.malha);
      atual = d;
    }
    return d;
  }

  // Rola o dado até parar mostrando "valor". Devolve uma Promise.
  function rolarAte(lados, valor) {
    if (!ok) return Promise.resolve();
    const d = pegarDado(lados);
    const id = ++animacao;

    // rotação final: face "valor" virada pra cima, girada num ângulo qualquer
    const qBase = new THREE.Quaternion().setFromUnitVectors(d.faces[valor].clone(), CIMA());
    const qGiro = new THREE.Quaternion().setFromAxisAngle(CIMA(), Math.random() * Math.PI * 2);
    const qFinal = qGiro.multiply(qBase);

    const eixo = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const voltas = Math.PI * (6 + Math.random() * 3);
    const lado = Math.random() < 0.5 ? -1 : 1;
    const inicio = new THREE.Vector3(lado * 3.6, 0, (Math.random() - 0.5) * 2);
    const fim = new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 0.8);
    const duracao = semMovimento ? 0 : 1500;
    const t0 = performance.now();

    return new Promise(resolve => {
      function quadro(agora) {
        if (id !== animacao) return resolve();
        const t = duracao ? Math.min(1, (agora - t0) / duracao) : 1;
        const desliza = 1 - Math.pow(1 - t, 3);
        const gira = 1 - Math.pow(1 - t, 4);
        d.malha.position.lerpVectors(inicio, fim, desliza);
        // quiques que vão diminuindo
        d.malha.position.y = d.altura + Math.abs(Math.sin(t * Math.PI * 3.2)) * 1.6 * Math.pow(1 - t, 2);
        const qVoltas = new THREE.Quaternion().setFromAxisAngle(eixo, voltas * (1 - gira));
        d.malha.quaternion.copy(qVoltas.multiply(qFinal));
        desenhar();
        if (t < 1) requestAnimationFrame(quadro); else resolve();
      }
      requestAnimationFrame(quadro);
    });
  }

  ok = iniciar();
  if (ok) {
    // dado parado na mesa ao abrir a ficha
    const d = pegarDado(6);
    d.malha.position.set(0, d.altura, 0);
    d.malha.quaternion.setFromUnitVectors(d.faces[6].clone(), CIMA())
      .premultiply(new THREE.Quaternion().setFromAxisAngle(CIMA(), 0.6));
    desenhar();
  } else {
    caixa.innerHTML = '<div class="reserva"><div class="dado" id="dado-reserva">6</div></div>';
  }
  return {
    rolarAte,
    get ok() { return ok; },
    reserva(valor) { const r = $("dado-reserva"); if (r) r.textContent = valor; },
  };
})();

let ultimaRolagem = null; // pra "Rolar de novo"

/*
  Uma rolagem é descrita assim:
  { rotulo: "Suor", lados: 6, bonus: 2, partes: "Suor 2", violencia: false, sorte: false }
*/
async function fazerRolagem(r) {
  ultimaRolagem = r;
  const valor = rolar(r.lados);
  const total = valor + r.bonus;

  let extra = null;
  // Crítico de Violência: tirou 6 (ou 1), rola de novo; se sair 6 ou 1, confirma o crítico
  if (r.violencia) {
    if (valor === 6) {
      const conf = rolar(6);
      if (conf === 6 || conf === 1) { // regra da mesa: na confirmação, 6 ou 1 confirma
        const efeito = rolar(6);
        extra = { bom: true, texto: `Acerto crítico! (6 e depois ${conf}) · Efeito ${efeito}: ${ACERTO_CRITICO[efeito - 1]}` };
      } else extra = { bom: true, texto: `Tirou 6, rolou de novo e saiu ${conf}: sem crítico.` };
    } else if (valor === 1) {
      const conf = rolar(6);
      if (conf === 1 || conf === 6) { // regra da mesa: na confirmação, 1 ou 6 confirma
        const efeito = rolar(6);
        extra = { bom: false, texto: `Falha crítica! (1 e depois ${conf}) · Efeito ${efeito}: ${FALHA_CRITICA[efeito - 1]}` };
      } else extra = { bom: true, texto: `Tirou 1, rolou de novo e saiu ${conf}: sem falha crítica.` };
    }
  }

  // Teste de Sorte: par = SIM, ímpar = NÃO
  const textoTotal = r.sorte ? (valor % 2 === 0 ? "SIM" : "NÃO") : String(total);
  let conta;
  if (r.sorte) conta = `Saiu ${valor} (${valor % 2 === 0 ? "par" : "ímpar"})`;
  else {
    conta = `1d${r.lados}: ${valor}`;
    if (r.bonus) conta += ` ${r.bonus > 0 ? "+" : "−"} ${Math.abs(r.bonus)}`;
    if (r.partes) conta += ` (${r.partes})`;
  }

  // Guarda no histórico na hora (últimas 30)
  ficha.historico.unshift({ rotulo: r.rotulo, total: textoTotal, conta, extra: extra ? extra.texto : "", hora: horaAgora() });
  ficha.historico = ficha.historico.slice(0, 30);
  salvar();
  avisarNoCelular(r.rotulo, textoTotal);

  // Enquanto o dado rola, o placar fica em suspense
  $("resultado-rotulo").textContent = r.rotulo;
  $("resultado-total").textContent = "…";
  $("resultado-total").classList.add("rolando");
  $("resultado-conta").textContent = "Rolando…";
  $("resultado-extra").hidden = true;
  $("rolar-de-novo").hidden = true;

  const minhaVez = ++vezDoPlacar;
  await Arena.rolarAte(r.lados, valor);
  if (minhaVez !== vezDoPlacar) return; // outra rolagem começou no meio
  Arena.reserva(valor);

  $("resultado-total").textContent = textoTotal;
  $("resultado-total").classList.remove("rolando");
  $("resultado-conta").textContent = conta;
  $("resultado-extra").hidden = !extra;
  if (extra) {
    $("resultado-extra").textContent = extra.texto;
    $("resultado-extra").classList.toggle("bom", extra.bom);
  }
  $("rolar-de-novo").hidden = false;
  desenharHistorico();
}
let vezDoPlacar = 0;

function desenharHistorico() {
  const h = ficha.historico;
  // mostra só as 5 últimas pra mesa caber na tela sem barra de rolagem própria
  $("historico").innerHTML = h.length
    ? h.slice(0, 5).map(x => `
        <li>
          <span>${esc(x.rotulo)} <small>· ${x.hora}</small></span>
          <span class="h-total">${esc(x.total)}</span>
          <span class="h-detalhe">${esc(x.conta)}${x.extra ? " · " + esc(x.extra) : ""}</span>
        </li>`).join("")
    : '<li class="historico-vazio">Nenhuma rolagem ainda.</li>';
}

// No celular a mesa fica em outra aba, então mostra um aviso rápido
let timerAviso;
function avisarNoCelular(rotulo, total) {
  if (!window.matchMedia("(max-width: 860px)").matches) return;
  if (document.body.classList.contains("ver-dados")) return;
  let aviso = document.querySelector(".aviso-rolagem");
  if (!aviso) {
    aviso = document.createElement("button");
    aviso.className = "aviso-rolagem";
    aviso.addEventListener("click", () => { trocarAba("dados"); aviso.hidden = true; });
    document.body.appendChild(aviso);
  }
  aviso.innerHTML = `<span>${esc(rotulo)}<br><small>Toque pra ver os detalhes</small></span><strong>${esc(total)}</strong>`;
  aviso.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { aviso.hidden = true; }, 4000);
}

// ---------- 6. Abas ----------

function trocarAba(nome) {
  document.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === nome));
  document.querySelectorAll(".aba").forEach(b => b.setAttribute("aria-selected", b.dataset.aba === nome));
  document.body.classList.toggle("ver-dados", nome === "dados");
  if (nome !== "dados") {
    document.querySelectorAll(".painel").forEach(p => p.classList.toggle("ativo", p.dataset.painel === nome));
  }
}

// ---------- 7. Cliques e digitação ----------

document.addEventListener("click", e => {
  const el = e.target.closest("button");
  if (!el) return;
  const d = el.dataset;

  if (d.aba) return trocarAba(d.aba);

  // Botões + e −
  if (d.ajuste) {
    const novo = Math.max(d.ajuste === "nivel" ? 1 : 0, lerCaminho(d.ajuste) + Number(d.passo));
    gravarCaminho(d.ajuste, d.ajuste === "defesaBonus" ? lerCaminho(d.ajuste) + Number(d.passo) : novo);
    salvar();
    return desenharTudo();
  }

  // Bolinhas dos Antecedentes (clicar na última cheia esvazia ela)
  if (d.antecedente) {
    const v = Number(d.valor);
    ficha.antecedentes[d.antecedente] = ficha.antecedentes[d.antecedente] === v ? v - 1 : v;
    salvar();
    desenharAntecedentes();
    return atualizarResumo();
  }

  // Botões − e + das barras (− risca um círculo, + recupera)
  if (d.barra) {
    const { caminho } = BARRAS[d.barra];
    const max = BARRAS[d.barra].max();
    gravarCaminho(caminho, Math.min(max, Math.max(0, lerCaminho(caminho) - Number(d.passo))));
    salvar();
    atualizarResumo();
    return verificarDorMontaria();
  }

  if (d.fidelidade) {
    ficha.montaria.fidelidade = Number(d.fidelidade);
    salvar();
    return desenharTudo();
  }

  // Munição: − e +
  if (d.municao) {
    const c = ficha.coldres[Number(d.municao)];
    c[d.k] = Math.max(0, (Number(c[d.k]) || 0) + Number(d.passo));
    salvar();
    return desenharColdres();
  }
  if (d.limparColdre) {
    ficha.coldres[Number(d.limparColdre)] = coldreVazio();
    salvar();
    desenharColdres();
    return atualizarResumo();
  }

  if (d.remover) {
    ficha[d.remover].splice(Number(d.i), 1);
    salvar();
    desenharItens();
    return atualizarResumo();
  }

  // Rolagens da ficha
  if (d.rolarAtributo) {
    const a = ATRIBUTOS.find(x => x.id === d.rolarAtributo);
    const v = ficha.atributos[a.id];
    return fazerRolagem({ rotulo: `Resistência · ${a.nome}`, lados: 6, bonus: v, partes: `${a.nome} ${v}` });
  }
  if (d.rolarAntecedente) {
    const a = ANTECEDENTES.find(x => x.id === d.rolarAntecedente);
    const v = ficha.antecedentes[a.id];
    return fazerRolagem({ rotulo: a.nome, lados: 6, bonus: v, partes: `${a.nome} ${v}`, violencia: a.id === "violencia" });
  }

  // Os três botões da mesa
  if (d.atalho === "1d6") return fazerRolagem({ rotulo: "1d6", lados: 6, bonus: 0 });
  if (d.atalho === "1d12") return fazerRolagem({ rotulo: "1d12", lados: 12, bonus: 0 });
  if (d.atalho === "sorte") return fazerRolagem({ rotulo: "Teste de Sorte", lados: 6, bonus: 0, sorte: true });
});

// Clique direto na barra: marca até o círculo clicado
document.querySelectorAll("[data-barra-clique]").forEach(barra => {
  barra.addEventListener("click", e => {
    const { caminho } = BARRAS[barra.dataset.barraClique];
    const max = BARRAS[barra.dataset.barraClique].max();
    const caixa = barra.getBoundingClientRect();
    let resta = Math.ceil(((e.clientX - caixa.left) / caixa.width) * max);
    resta = Math.min(max, Math.max(1, resta));
    if (max - lerCaminho(caminho) === resta) resta -= 1; // clicar no último cheio esvazia ele
    gravarCaminho(caminho, max - resta);
    salvar();
    atualizarResumo();
    verificarDorMontaria();
  });
});

// Montaria: quando os 6 Pontos de Dor acabam, ela perde 1 Ponto de Vida e a Dor volta cheia.
// Espera um instante pra dar tempo de ver a barra esvaziar.
let timerDorMontaria;
function verificarDorMontaria() {
  if (ficha.montaria.dor < BASE.dor) return;
  clearTimeout(timerDorMontaria);
  timerDorMontaria = setTimeout(() => {
    const m = ficha.montaria; // pega a ficha atual (ela pode ter sido recarregada da nuvem)
    if (m.dor < BASE.dor) return;
    m.dor = 0;
    m.vidaRiscada = Math.min(m.vidaRiscada + 1, calcular().montariaVidaMax);
    const nome = m.nome || "A montaria";
    ficha.historico.unshift({ rotulo: "Dor da montaria", total: "−1", conta: `${nome} perdeu 1 Ponto de Vida`, extra: "Pontos de Dor zerados", hora: horaAgora() });
    ficha.historico = ficha.historico.slice(0, 30);
    salvar();
    atualizarResumo();
    desenharHistorico();
    avisoFicha(`${nome} chegou ao limite de dor: perdeu 1 Ponto de Vida e a Dor foi zerada.`);
  }, 700);
}

$("rolar-potencia").addEventListener("click", () => {
  const p = ficha.montaria.potencia, m = ficha.antecedentes.montaria;
  fazerRolagem({ rotulo: `Montaria · ${ficha.montaria.nome || "Potência"}`, lados: 6, bonus: p + m, partes: `Potência ${p} + Montaria ${m}` });
});

$("rolar-de-novo").addEventListener("click", () => { if (ultimaRolagem) fazerRolagem(ultimaRolagem); });

$("limpar-historico").addEventListener("click", () => {
  ficha.historico = [];
  salvar();
  desenharHistorico();
});

// Seis Pontos de Dor: rola a penalidade, risca 1 Vida e zera a Dor
$("botao-penalidade").addEventListener("click", () => {
  const n = rolar(6);
  const [nome, efeito] = TABELA_DOR[n - 1];
  ficha.dor = 0;
  ficha.vidaRiscada = Math.min(ficha.vidaRiscada + 1, calcular().vidaMax);
  ficha.historico.unshift({ rotulo: "Penalidade de Dor", total: String(n), conta: `${nome}: ${efeito}`, extra: "1 Ponto de Vida riscado", hora: horaAgora() });
  salvar();
  desenharTudo();
  desenharTabelaDor(n);
  avisarNoCelular(`Dor: ${nome}`, String(n));
});

$("add-item").addEventListener("click", () => { ficha.itens.push({ nome: "", espaco: "" }); salvar(); desenharItens(); });


// Digitação em qualquer campo
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.campo) {
    gravarCaminho(el.dataset.campo, el.type === "number" ? Number(el.value) : el.value);
  } else if (el.dataset.lista) {
    ficha[el.dataset.lista][Number(el.dataset.i)][el.dataset.k] = el.value;
  } else return;
  salvar();
  atualizarResumo();
});

// ---------- 8. Retrato do personagem ----------

// Padrão da ficha: retrato 3:4, salvo em 600 × 800 px.
// Qualquer foto enviada é cortada no centro e reduzida pra esse tamanho,
// assim todas as fichas ficam iguais e a imagem não pesa no navegador.
const FOTO_LARGURA = 600;
const FOTO_ALTURA = 800;

function desenharFoto() {
  const tem = Boolean(ficha.foto);
  $("foto").hidden = !tem;
  if (tem) $("foto").src = ficha.foto;
  $("retrato-vazio").hidden = tem;
  $("foto-acoes").hidden = !tem;
}

function avisoFoto(texto) {
  $("aviso-foto").textContent = texto;
  $("aviso-foto").hidden = !texto;
}

$("input-foto").addEventListener("change", e => {
  const arquivo = e.target.files[0];
  e.target.value = ""; // permite escolher a mesma foto de novo depois
  if (!arquivo) return;
  if (!arquivo.type.startsWith("image/")) return avisoFoto("Escolha um arquivo de imagem (JPG, PNG ou WEBP).");

  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = () => {
      // corta no centro mantendo 3:4 e redimensiona
      const proporcao = FOTO_LARGURA / FOTO_ALTURA;
      let sw = img.width, sh = img.height;
      if (sw / sh > proporcao) sw = sh * proporcao; else sh = sw / proporcao;
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
      const tela = document.createElement("canvas");
      tela.width = FOTO_LARGURA; tela.height = FOTO_ALTURA;
      tela.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, FOTO_LARGURA, FOTO_ALTURA);
      ficha.foto = tela.toDataURL("image/jpeg", 0.85);
      avisoFoto(img.width < 300 || img.height < 400 ? "A foto é pequena e pode ficar borrada. O ideal é 600 × 800 px." : "");
      salvar();
      desenharFoto();
    };
    img.onerror = () => avisoFoto("Não deu pra abrir essa imagem. Tente outra.");
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
});

$("remover-foto").addEventListener("click", () => {
  ficha.foto = "";
  avisoFoto("");
  salvar();
  desenharFoto();
});

// ---------- 8b. Habilidades em cartas ----------

const NOME_TIPO = { combate: "Combate", profissao: "Profissão" };

// Quebra o texto da habilidade em frases curtas (uma por linha)
// e destaca números, tipos de dano e a regra dos 2 dados.
function regrasHtml(texto) {
  const frases = texto.split(/(?<=[.!])\s+(?=[A-ZÀ-Ú+−♣])/);
  const destacar = f => esc(f)
    .replace(/(\+?\d+ (?:de )?Dano Letal|Dano Letal extra|Dano Letal)/g, '<span class="dano-letal">$1</span>')
    .replace(/(\+?\d+ de Dano de Dor|Dano de Dor)/g, '<span class="dano-dor">$1</span>')
    .replace(/(rola 2 dados e usa o maior)/g, "<b>$1</b>")
    .replace(/(^|[\s(])([+−]\d+(?:%)?)(?![^<]*<\/span>)/g, "$1<b>$2</b>");
  return `<ul class="regras">${frases.map(f => `<li>${destacar(f)}</li>`).join("")}</ul>`;
}

function tabelaNiveis(h) {
  if (!h.niveis) return "";
  // a linha "atual" é o maior nível da tabela que o personagem já alcançou
  const alcancados = h.niveis.filter(([n]) => n <= ficha.nivel);
  const atual = alcancados.length ? alcancados[alcancados.length - 1][0] : null;
  return `
    <table class="carta-niveis">
      <thead><tr><th>Nível</th><th>Efeito</th></tr></thead>
      <tbody>${h.niveis.map(([n, efeito]) =>
        `<tr class="${n === atual ? "atual" : ""}"><td>${n}</td><td>${esc(efeito)}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

function desenharHabilidades() {
  const lista = ficha.habilidadesLista;
  if (!lista.length) {
    $("cartas-habilidades").innerHTML = `
      <p class="cartas-vazio">Nenhuma habilidade ainda. No nível 1, o livro manda escolher duas.</p>`;
    return;
  }
  if (typeof HABILIDADES === "undefined") {
    $("cartas-habilidades").innerHTML = '<p class="cartas-vazio">A lista de habilidades não carregou (falta o habilidades.js no site).</p>';
    return;
  }
  $("cartas-habilidades").innerHTML = lista.map((id, i) => {
    const h = HABILIDADES.find(x => x.id === id);
    if (!h) return "";
    return `
      <article class="carta carta-${h.tipo}">
        <header class="carta-topo">
          <span class="carta-tipo">${NOME_TIPO[h.tipo]}</span>
          <button class="carta-remover" data-remover-hab="${i}" aria-label="Remover ${esc(h.nome)}">×</button>
        </header>
        <h3 class="carta-nome">${esc(h.nome)}</h3>
        ${regrasHtml(h.texto)}
        ${tabelaNiveis(h)}
      </article>`;
  }).join("");
}

$("cartas-habilidades").addEventListener("click", e => {
  const botao = e.target.closest("[data-remover-hab]");
  if (!botao) return;
  const i = Number(botao.dataset.removerHab);
  const h = HABILIDADES.find(x => x.id === ficha.habilidadesLista[i]);
  ficha.habilidadesLista.splice(i, 1);
  salvar();
  desenharTudo();
  if (h) avisoFicha(`${h.nome} saiu da ficha.`, true);
});

// Janela de escolher habilidade
const semAcento = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function desenharOpcoes() {
  if (typeof HABILIDADES === "undefined") {
    $("lista-habilidades").innerHTML = '<p class="cartas-vazio">Não consegui carregar a lista de habilidades. Confira se o arquivo habilidades.js está no site, com esse nome em minúsculas.</p>';
    return;
  }
  const busca = semAcento($("busca-habilidade").value.trim());
  const secoes = ["combate", "profissao"].map(tipo => {
    const opcoes = HABILIDADES
      .filter(h => h.tipo === tipo)
      .filter(h => !busca || semAcento(h.nome + " " + h.texto).includes(busca))
      .map(h => {
        const vezes = ficha.habilidadesLista.filter(id => id === h.id).length;
        const bloqueada = vezes > 0 && !h.repetir;
        return `
          <div class="opcao-hab carta-${h.tipo}" role="button" tabindex="${bloqueada ? -1 : 0}" data-add-hab="${h.id}" aria-disabled="${bloqueada}">
            <span class="opcao-nome">${esc(h.nome)}${vezes && h.repetir ? ` <small>(tem ${vezes})</small>` : ""}</span>
            ${regrasHtml(h.texto)}
            ${h.niveis ? `<span class="opcao-niveis">${h.niveis.map(([n, e]) => `<span class="nv">Nível ${n}</span><span>${esc(e)}</span>`).join("")}</span>` : ""}
            ${bloqueada ? '<span class="opcao-tem">Já está na ficha</span>' : ""}
          </div>`;
      }).join("");
    return opcoes ? `<h3 class="janela-secao">${NOME_TIPO[tipo]}</h3><div class="opcoes">${opcoes}</div>` : "";
  }).join("");
  $("lista-habilidades").innerHTML = secoes || '<p class="cartas-vazio">Nenhuma habilidade com esse nome.</p>';
}

function janelaHabilidades(abrir) {
  $("janela-habilidades").hidden = !abrir;
  document.body.classList.toggle("sem-rolagem", abrir);
  if (abrir) {
    $("busca-habilidade").value = "";
    desenharOpcoes();
    $("busca-habilidade").focus();
  } else {
    $("abrir-habilidades").focus();
  }
}

$("abrir-habilidades").addEventListener("click", () => janelaHabilidades(true));
$("fechar-habilidades").addEventListener("click", () => janelaHabilidades(false));
$("janela-habilidades").addEventListener("click", e => {
  if (e.target.id === "janela-habilidades") janelaHabilidades(false); // clicou fora da janela
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("janela-habilidades").hidden) janelaHabilidades(false);
});
$("busca-habilidade").addEventListener("input", desenharOpcoes);
function escolherHabilidade(e) {
  const botao = e.target.closest("[data-add-hab]");
  if (!botao || botao.getAttribute("aria-disabled") === "true") return;
  const h = HABILIDADES.find(x => x.id === botao.dataset.addHab);
  ficha.habilidadesLista.push(h.id);
  salvar();
  desenharTudo();
  janelaHabilidades(false);
  avisoFicha(`${h.nome} entrou na ficha.`, true);
}
$("lista-habilidades").addEventListener("click", escolherHabilidade);
$("lista-habilidades").addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolherHabilidade(e); }
});

// ---------- 8c. Guia Rápido do Jogador ----------
function janelaGuia(abrir) {
  $("janela-guia").hidden = !abrir;
  document.body.classList.toggle("sem-rolagem", abrir);
  if (abrir) { $("guia-corpo").scrollTop = 0; $("fechar-guia").focus(); }
  else $("abrir-guia").focus();
}
$("abrir-guia").addEventListener("click", () => janelaGuia(true));
$("fechar-guia").addEventListener("click", () => janelaGuia(false));
$("janela-guia").addEventListener("click", e => {
  if (e.target.id === "janela-guia") janelaGuia(false);
  // links do índice: rola até a parte certa sem mudar o endereço da página
  const link = e.target.closest(".guia-indice a");
  if (link) {
    e.preventDefault();
    document.querySelector(link.getAttribute("href")).scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("janela-guia").hidden) janelaGuia(false);
});

// ---------- 9. Tela inicial e troca de fichas ----------
/*
  Sem "?ficha=" no endereço, a página mostra a TELA INICIAL:
  a lista de fichas (da nuvem, ou deste aparelho se a nuvem estiver desligada)
  e o botão de criar ficha. Clicar numa ficha abre index.html?ficha=ID.
*/
const naInicio = !idDoLink;
document.body.classList.toggle("na-inicio", naInicio);
$("tela-inicio").hidden = !naInicio;
$("tela-ficha").hidden = naInicio;

function nomeDaFicha(f) { return (f.nome || "").trim() || "Personagem sem nome"; }
function irParaFicha(id) { location.href = `index.html?ficha=${encodeURIComponent(id)}`; }

function quandoFoi(ms) {
  if (!ms) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

// lista = [{ id, ficha, atualizadoEm }]
function desenharInicio(lista) {
  lista = lista.filter(x => x.ficha).sort((a, b) => nomeDaFicha(a.ficha).localeCompare(nomeDaFicha(b.ficha), "pt-BR"));
  const cards = lista.map(({ id, ficha: f, atualizadoEm }) => {
    const vidaMax = BASE.vida + ((f.atributos || {}).fisico || 0) + (Number(f.vidaBonus) || 0) + vidaDasHabilidades(f);
    const resta = Math.max(0, vidaMax - (f.vidaRiscada || 0));
    return `
      <button class="card-inicio" data-abrir="${esc(id)}">
        <span class="card-inicio-foto">${f.foto ? `<img src="${esc(f.foto)}" alt="">` : ""}</span>
        <span class="card-inicio-nome">${esc(nomeDaFicha(f))}</span>
        <span class="card-inicio-info">Vida ${resta}/${vidaMax}${atualizadoEm ? ` · ${quandoFoi(atualizadoEm)}` : ""}</span>
      </button>`;
  }).join("");
  $("lista-inicio").innerHTML = `
    <button class="card-inicio card-nova" id="criar-ficha">
      <span class="card-nova-mais">+</span>
      <span class="card-inicio-nome">Criar nova ficha</span>
    </button>` + cards;
}

function listaLocal() {
  return Object.entries(banco.fichas)
    .filter(([, f]) => temConteudo(f))
    .map(([id, f]) => ({ id, ficha: f }));
}

// Uma ficha "tem conteúdo" quando alguém já mexeu nela
function temConteudo(f) {
  const { historico, ...resto } = f;
  const { historico: h0, ...vazia } = fichaNova();
  return JSON.stringify(resto) !== JSON.stringify(vazia);
}

$("lista-inicio").addEventListener("click", e => {
  const card = e.target.closest("button");
  if (!card) return;
  if (card.id === "criar-ficha") return irParaFicha(novoId());
  if (card.dataset.abrir) irParaFicha(card.dataset.abrir);
});

let timerAvisoFicha;
function avisoFicha(texto, bom = false) {
  const el = $("aviso-ficha");
  el.textContent = texto;
  el.classList.toggle("bom", bom);
  el.hidden = !texto;
  clearTimeout(timerAvisoFicha);
  if (texto) timerAvisoFicha = setTimeout(() => { el.hidden = true; }, 6000);
}

// Exportar: baixa a ficha aberta como um arquivo .json
$("exportar-ficha").addEventListener("click", () => {
  const arquivo = new Blob([JSON.stringify({ tipo: "ficha-sacramento", versao: 2, ficha }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const nomeArquivo = nomeDaFicha(ficha).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "-").toLowerCase();
  link.href = URL.createObjectURL(arquivo);
  link.download = `ficha-${nomeArquivo || "personagem"}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  avisoFicha("Arquivo da ficha baixado. Guarde ele num lugar seguro.", true);
});

// Importar (tela inicial): lê um .json exportado e abre como ficha nova
$("importar-ficha").addEventListener("change", e => {
  const arquivo = e.target.files[0];
  e.target.value = "";
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const dados = JSON.parse(leitor.result);
      const f = dados.ficha || dados;
      if (!f || typeof f !== "object" || !f.atributos) throw new Error("formato");
      const id = novoId();
      banco.fichas[id] = normalizar(f);
      banco.atual = id;
      salvarLocal();
      irParaFicha(id);
    } catch (erro) {
      avisoFicha("Esse arquivo não é uma ficha exportada daqui. Escolha um arquivo .json gerado pelo botão Exportar.");
    }
  };
  leitor.readAsText(arquivo);
});

// ---------- 10. Nuvem (Firebase) ----------
/*
  O arquivo nuvem.js carrega o Firebase e chama FichaApp.conectarNuvem().
  - Na tela inicial: ouve TODAS as fichas pra montar a lista.
  - Na ficha: toda mudança vai pra nuvem (meio segundo depois de parar de mexer)
    e mudanças feitas em outro aparelho chegam aqui sozinhas.
*/
let nuvem = null;              // funções do nuvem.js (null = só no aparelho)
let pararDeOuvir = null;
let esperandoNuvem = false;    // ainda não chegou a primeira resposta da nuvem
let ultimaEdicao = 0;          // hora da última mudança feita aqui
let timerNuvem;

window.FichaApp = {
  conectarNuvem(api) {
    nuvem = api;
    nuvemRespondeu = true;
    if (naInicio) {
      statusNuvem("conectando");
      api.ouvirTodas(lista => {
        desenharInicio(lista);
        statusNuvem("salvo", `Ao vivo · ${lista.length} ${lista.length === 1 ? "ficha" : "fichas"} na nuvem`);
      }, erro => {
        console.error(erro);
        statusNuvem("erro", "Não deu pra ler as fichas da nuvem. Mostrando as deste aparelho.");
      });
    } else {
      ouvirNaNuvem(banco.atual);
    }
  },
  nuvemIndisponivel(mensagem) {
    nuvemRespondeu = true;
    statusNuvem("local", mensagem);
  },
};
let nuvemRespondeu = false;

function statusNuvem(estado, texto) {
  const textos = {
    local: "Salvando só neste aparelho",
    conectando: "Conectando na nuvem…",
    salvando: "Salvando na nuvem…",
    salvo: "Salvo na nuvem",
    erro: "Sem conexão. Salvo só neste aparelho por enquanto.",
  };
  const el = $(naInicio ? "status-inicio" : "status-nuvem");
  el.textContent = texto || textos[estado];
  el.dataset.estado = estado;
}

function ouvirNaNuvem(id) {
  if (!nuvem) return;
  if (pararDeOuvir) pararDeOuvir();
  esperandoNuvem = true;
  statusNuvem("conectando");

  pararDeOuvir = nuvem.ouvir(id, (dados, ehMinhaGravacao) => {
    if (ehMinhaGravacao) return; // é o eco da gravação que acabei de fazer
    const primeira = esperandoNuvem;
    esperandoNuvem = false;

    if (!dados) {
      // ficha ainda não existe na nuvem: só sobe se já tiver algo preenchido
      if (temConteudo(ficha)) enviarNuvem();
      else statusNuvem("salvo", "Ficha nova. Ela aparece na lista assim que você preencher algo.");
      return;
    }
    // se a pessoa está mexendo agora, não atropela o que ela digita
    if (!primeira && Date.now() - ultimaEdicao < 2000) return;

    banco.fichas[id] = normalizar(dados.ficha || dados);
    ficha = banco.fichas[id];
    salvarLocal();
    desenharTudo();
    statusNuvem("salvo");
  }, erro => {
    console.error(erro);
    esperandoNuvem = false;
    statusNuvem("erro");
  });
}

function agendarNuvem() {
  if (!nuvem || naInicio) return;
  ultimaEdicao = Date.now();
  clearTimeout(timerNuvem);
  timerNuvem = setTimeout(enviarNuvem, 600);
}

async function enviarNuvem() {
  if (!nuvem || esperandoNuvem) return;
  statusNuvem("salvando");
  try {
    await nuvem.salvar(banco.atual, { ficha, nome: ficha.nome, atualizadoEm: Date.now() });
    statusNuvem("salvo");
  } catch (erro) {
    console.error(erro);
    statusNuvem("erro");
  }
}

// ---------- 11. Utilidades ----------

function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function formatar(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","); }
function horaAgora() { return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }

// ---------- Começa ----------
desenharTudo();
if (naInicio) desenharInicio(listaLocal());
statusNuvem("local");

// Se o nuvem.js nem rodar (arquivo faltando no site, por exemplo), avisa depois de 8 segundos
setTimeout(() => {
  if (!nuvemRespondeu) statusNuvem("erro", "A nuvem não carregou. Confira se nuvem.js e firebase-config.js estão no site.");
}, 8000);
