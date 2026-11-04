/* ============================================================
   MESA DO MESTRE — lógica
   O nuvem.js chama FichaApp.conectarNuvem() e aqui a gente pede
   pra ouvir TODAS as fichas. Cada mudança redesenha os cards.
   ============================================================ */

const $ = id => document.getElementById(id);
const CHAVE_FILTRO = "mestre-mostrar-vazias";
let ultimaLista = [];

function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function status(estado, texto) {
  const el = $("status-nuvem");
  el.dataset.estado = estado;
  el.textContent = texto;
}

// Barra só de leitura, igual à da ficha: preenchimento contínuo e "atual / total" dentro
function barra(classe, max, riscados, rotulo) {
  const resta = Math.max(0, max - riscados);
  const pct = max ? (resta / max) * 100 : 0;
  const alerta = resta > 0 && pct <= 30 ? " perigo" : "";
  return `
    <div class="mbarra ${classe}${alerta}" role="meter" aria-label="${esc(rotulo)}"
      aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${resta}">
      <div class="mbarra-cheia" style="width:${pct}%"></div>
      <span class="mbarra-numero">${resta} / ${max}</span>
    </div>`;
}

function quandoFoi(ms) {
  if (!ms) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

// Ficha "tem conteúdo" quando alguém já preencheu algo nela
function temConteudo(f) {
  if (!f) return false;
  const at = f.atributos || {};
  return !!(
    f.nome || f.foto ||
    (f.habilidadesLista || []).length ||
    Object.values(at).some(v => Number(v)) ||
    f.vidaRiscada || f.dor ||
    (f.coldres || []).some(c => c.nome) ||
    (f.itens || []).some(i => i.nome) ||
    (f.montaria && f.montaria.nome)
  );
}

function card({ id, ficha: f, atualizadoEm }) {
  if (!f) return "";
  const at = f.atributos || {};
  const habs = (f.habilidadesLista || []).map(id => HABILIDADES.find(h => h.id === id)).filter(Boolean);
  const vidaMax = 6 + (at.fisico || 0) + (Number(f.vidaBonus) || 0) + habs.reduce((s, h) => s + (h.vida || 0), 0);
  const vidaResta = Math.max(0, vidaMax - (f.vidaRiscada || 0));
  const dorResta = Math.max(0, 6 - (f.dor || 0));
  const defesa = 5 + (Number(f.defesaBonus) || 0);
  const m = f.montaria || {};
  const montariaVidaMax = 6 + (m.resistencia || 0);
  const armas = (f.coldres || []).filter(c => c.nome);
  const iniciativa = f.iniciativa ? esc(f.iniciativa) : "–";

  // Selos automáticos, só com os dados que já existem na ficha
  const selo = vidaResta <= 0 ? { texto: "Caído", classe: "perigo" }
    : vidaResta === 1 ? { texto: "Crítica", classe: "alerta" }
    : dorResta === 0 ? { texto: "Dor zerada", classe: "alerta" }
    : null;

  return `
  <article class="card-mestre">
    <header class="card-mestre-topo">
      <div class="card-mestre-foto">${f.foto ? `<img src="${esc(f.foto)}" alt="">` : ""}</div>
      <div class="card-mestre-id">
        <h2>${esc(f.nome || "Personagem sem nome")}</h2>
        <span class="dica">Nível ${Number(f.nivel) || 1} · atualizada ${quandoFoi(atualizadoEm)}</span>
        ${selo ? `<span class="selo selo-${selo.classe}">${selo.texto}</span>` : ""}
      </div>
    </header>

    <div class="mestre-linha"><span class="mestre-rotulo">Vida</span>${barra("mbarra-vida", vidaMax, f.vidaRiscada || 0, "Pontos de Vida")}</div>
    <div class="mestre-linha"><span class="mestre-rotulo">Dor</span>${barra("mbarra-dor", 6, f.dor || 0, "Pontos de Dor")}</div>

    <dl class="mestre-numeros">
      <div><dt>Defesa</dt><dd>${defesa}</dd></div>
      <div><dt>Movimentos</dt><dd>${1 + (at.velocidade || 0)}</dd></div>
      <div><dt>Ações</dt><dd>${1 + (at.coragem || 0)}</dd></div>
      <div><dt>Iniciativa</dt><dd class="${iniciativa.length > 3 ? "texto-curto" : ""}">${iniciativa}</dd></div>
    </dl>

    ${habs.length ? `<p class="mestre-habs">${habs.map(h => esc(h.nome)).join(" · ")}</p>` : ""}

    ${armas.length ? `
    <ul class="mestre-armas">
      ${armas.map(c => `<li><span class="nome">${esc(c.nome)}</span><span class="municao">${Number(c.municao) || 0} / ${Number(c.reserva) || 0}</span></li>`).join("")}
    </ul>` : ""}

    ${m.nome ? `<div class="mestre-linha"><span class="mestre-rotulo">${esc(m.nome)}</span>${barra("mbarra-vida", montariaVidaMax, m.vidaRiscada || 0, "Pontos de Vida da montaria")}</div>` : ""}

    <a class="botao-ficha mestre-abrir" href="index.html?ficha=${encodeURIComponent(id)}">Abrir ficha</a>
  </article>`;
}

// Desenha a grade respeitando o filtro de fichas vazias
function desenhar() {
  const mostrarVazias = $("mostrar-vazias").checked;
  const visiveis = ultimaLista.filter(x => mostrarVazias || temConteudo(x.ficha));
  const ocultas = ultimaLista.length - visiveis.length;

  $("grade-mestre").innerHTML = visiveis.length
    ? visiveis.map(card).join("")
    : '<p class="dica">Nenhuma ficha com dados ainda. Quando os jogadores preencherem a ficha, ela aparece aqui.</p>';

  const total = visiveis.length;
  const sufixo = !mostrarVazias && ocultas ? ` · ${ocultas} vazia${ocultas === 1 ? "" : "s"} oculta${ocultas === 1 ? "" : "s"}` : "";
  status("salvo", `Ao vivo · ${total} ${total === 1 ? "ficha" : "fichas"}${sufixo}`);
}

// Preferência do filtro, lembrada neste navegador
try { $("mostrar-vazias").checked = localStorage.getItem(CHAVE_FILTRO) === "1"; } catch (e) { /* sem armazenamento: começa escondendo */ }
$("mostrar-vazias").addEventListener("change", e => {
  try { localStorage.setItem(CHAVE_FILTRO, e.target.checked ? "1" : "0"); } catch (err) { /* ignora */ }
  desenhar();
});

let nuvemRespondeu = false;
setTimeout(() => {
  if (!nuvemRespondeu) status("erro", "A nuvem não carregou. Confira se nuvem.js e firebase-config.js estão no site.");
}, 8000);

window.FichaApp = {
  conectarNuvem(api) {
    nuvemRespondeu = true;
    status("conectando", "Conectando na nuvem…");
    api.ouvirTodas(lista => {
      lista.sort((a, b) => String(a.ficha?.nome || "").localeCompare(String(b.ficha?.nome || ""), "pt-BR"));
      ultimaLista = lista;
      desenhar();
    }, erro => {
      console.error(erro);
      status("erro", "Não deu pra ler as fichas. Confira as Regras do Firestore.");
    });
  },
  nuvemIndisponivel(mensagem) {
    nuvemRespondeu = true;
    status("local", mensagem);
  },
};
