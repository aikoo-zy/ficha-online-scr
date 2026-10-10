/* ============================================================
   MESA DO MESTRE — lógica
   O nuvem.js chama FichaApp.conectarNuvem() e aqui a gente pede
   pra ouvir TODAS as fichas. Cada mudança redesenha os cards.
   ============================================================ */

const $ = id => document.getElementById(id);

function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function status(estado, texto) {
  const el = $("status-nuvem");
  el.dataset.estado = estado;
  el.textContent = texto;
}

// Barra igual à da ficha, só pra leitura
function barra(classe, max, riscados) {
  const resta = Math.max(0, max - riscados);
  const razao = max ? resta / max : 0;
  const vel = razao > 0.6 ? "2.6s" : razao > 0.3 ? "1.6s" : "0.9s";
  return `
    <div class="barra ${classe} ${resta > 0 && razao <= 0.3 ? "perigo" : ""}"
      style="--pct:${razao * 100}%; --segmentos:${Math.max(1, max)}; --vel:${vel}; cursor:default">
      <div class="barra-cheia"><span class="barra-pulso"></span></div>
    </div>
    <span class="mestre-numero">${resta}/${max}</span>`;
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

function card({ id, ficha: f, atualizadoEm }) {
  if (!f) return "";
  const at = f.atributos || {};
  const vidaMax = 6 + (at.fisico || 0) + (Number(f.vidaBonus) || 0);
  const defesa = 5 + (Number(f.defesaBonus) || 0);
  const m = f.montaria || {};
  const montariaVidaMax = 6 + (m.resistencia || 0);
  const armas = (f.coldres || []).filter(c => c.nome);

  return `
  <article class="card-mestre">
    <div class="card-mestre-topo">
      <div class="card-mestre-foto">${f.foto ? `<img src="${esc(f.foto)}" alt="">` : ""}</div>
      <div class="card-mestre-id">
        <h2>${esc(f.nome || "Personagem sem nome")}</h2>
        <span class="dica">Atualizada ${quandoFoi(atualizadoEm)}</span>
      </div>
    </div>

    <div class="mestre-linha"><span class="mestre-rotulo">Vida</span>${barra("barra-vida", vidaMax, f.vidaRiscada || 0)}</div>
    <div class="mestre-linha"><span class="mestre-rotulo">Dor</span>${barra("barra-dor", 6, f.dor || 0)}</div>

    <dl class="mestre-numeros">
      <div><dt>Defesa</dt><dd>${defesa}</dd></div>
      <div><dt>Movimentos</dt><dd>${1 + (at.velocidade || 0)}</dd></div>
      <div><dt>Ações</dt><dd>${1 + (at.coragem || 0)}</dd></div>
      <div><dt>Iniciativa</dt><dd>${esc(f.iniciativa) || "–"}</dd></div>
    </dl>

    ${armas.length ? `
    <ul class="mestre-armas">
      ${armas.map(c => `<li><span>${esc(c.nome)}</span><span>${Number(c.municao) || 0} / ${Number(c.reserva) || 0}</span></li>`).join("")}
    </ul>` : ""}

    ${m.nome ? `<div class="mestre-linha"><span class="mestre-rotulo">${esc(m.nome)}</span>${barra("barra-vida", montariaVidaMax, m.vidaRiscada || 0)}</div>` : ""}

    <a class="botao-ficha" href="index.html?ficha=${encodeURIComponent(id)}">Abrir ficha</a>
  </article>`;
}

window.FichaApp = {
  conectarNuvem(api) {
    status("conectando", "Conectando na nuvem…");
    api.ouvirTodas(lista => {
      lista.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
      $("grade-mestre").innerHTML = lista.length
        ? lista.map(card).join("")
        : '<p class="dica">Nenhuma ficha na nuvem ainda. Quando os jogadores abrirem a ficha pelo site, elas aparecem aqui.</p>';
      status("salvo", `Ao vivo · ${lista.length} ${lista.length === 1 ? "ficha" : "fichas"}`);
    }, erro => {
      console.error(erro);
      status("erro", "Não deu pra ler as fichas. Confira as Regras do Firestore.");
    });
  },
  nuvemIndisponivel(mensagem) {
    status("local", "A nuvem ainda não foi configurada. Preencha o firebase-config.js.");
  },
};