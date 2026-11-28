/* ============================================================
   ARMAS EQUIPADAS — cards, tela de nova arma e detalhes
   Carregado depois do script.js (usa ficha, salvar, esc, $ e desenharColdres).
   As armas ficam em ficha.coldres (3 vagas). Uma vaga está em uso quando tem "tipo".

   Campos de cada arma:
     tipo, nome, dano (valor principal), dano2 (só escopeta), espaco,
     capacidade (máx. da arma), municao (na arma agora), reserva (estoque da munição normal),
     tipoMun (tipo de munição carregada), estoqueEsp (estoque de cada munição especial), detalhes
   ============================================================ */

const Armas = (() => {
  // letal: 1 ou 2 campos de Dano Letal | dor: Dano de Dor | municao: tem capacidade e estoque?
  const TIPOS = [
    { id: "revolver", nome: "Revólver", dano: "letal", campos: 1, municao: true },
    { id: "pistola", nome: "Pistola", dano: "letal", campos: 1, municao: true },
    { id: "rifle", nome: "Rifle", dano: "letal", campos: 1, municao: true },
    { id: "fuzil", nome: "Fuzil", dano: "letal", campos: 1, municao: true },
    { id: "escopeta", nome: "Escopeta", dano: "letal", campos: 2, municao: true },
    { id: "arco", nome: "Arco e flecha", dano: "letal", campos: 1, municao: true },
    { id: "branca", nome: "Arma branca", dano: "letal", campos: 1, municao: false },
    { id: "corpo", nome: "Corpo a corpo", dano: "dor", campos: 1, municao: false },
    { id: "outra", nome: "Outra (improvisada)", dano: "letal", campos: 1, municao: true },
  ];
  /* Munições: "normal" serve em qualquer arma de fogo. As especiais só servem nas armas listadas
     (regra do livro): Dum-Dum, Express e Envenenada = revólver, pistola e rifle;
     Balote e Incendiária = escopeta; Ponta Vermelha e Explosiva = fuzil.
     Arco, arma branca e "Outra (improvisada)" só usam a normal. */
  const ARMAS_PEQUENAS = ["revolver", "pistola", "rifle"];
  const MUNICOES = [
    { id: "normal", nome: "Normal", efeito: "Munição comum." },
    { id: "dumdum", nome: "Dum-Dum", armas: ARMAS_PEQUENAS, efeito: "Dano da arma +1 de Dor." },
    { id: "express", nome: "Express", armas: ARMAS_PEQUENAS, efeito: "Remove a penalidade de disparos à distância." },
    { id: "envenenada", nome: "Envenenada", armas: ARMAS_PEQUENAS, efeito: "1 de Dor por turno durante 3 turnos." },
    { id: "balote", nome: "Balote", armas: ["escopeta"], efeito: "Remove a penalidade de disparos à longa distância." },
    { id: "incendiaria", nome: "Incendiária", armas: ["escopeta"], efeito: "Dano da arma +1 de Dor por turno durante 3 turnos." },
    { id: "ponta-vermelha", nome: "Ponta Vermelha", armas: ["fuzil"], efeito: "Sangramento: 1 de Vida por turno até o fim do combate." },
    { id: "explosiva", nome: "Explosiva", armas: ["fuzil"], efeito: "−2 no Teste de Violência; o dano do fuzil vira 7 de Vida." },
  ];
  const munDe = id => MUNICOES.find(m => m.id === id) || MUNICOES[0];
  const permitidas = tipoArma => MUNICOES.filter(m => !m.armas || m.armas.includes(tipoArma));
  const iconeMun = (id, classe) => `<img class="${classe}" src="icones/municoes/${id}.png" alt="">`;
  // O estoque "normal" fica no campo reserva; o das especiais em estoqueEsp[id]
  const estoqueDe = (c, id) => id === "normal" ? n(c.reserva) : n((c.estoqueEsp || {})[id]);
  const poeEstoque = (c, id, v) => {
    if (id === "normal") c.reserva = n(v);
    else { if (!c.estoqueEsp) c.estoqueEsp = {}; c.estoqueEsp[id] = n(v); }
  };
  const tipoMunDe = c => permitidas(c.tipo).some(m => m.id === c.tipoMun) ? c.tipoMun : "normal";
  // Troca o tipo carregado: as balas que sobraram na arma voltam pro estoque do tipo antigo.
  // Devolve quantas balas voltaram.
  function trocarMunicao(c, novo, velho = tipoMunDe(c)) {
    if (velho === novo) { c.tipoMun = novo; return 0; }
    const volta = n(c.municao);
    if (volta) poeEstoque(c, velho, estoqueDe(c, velho) + volta);
    c.municao = 0;
    c.tipoMun = novo;
    return volta;
  }
  const avisoVolta = (volta, velho) => { if (volta > 0) avisoFicha(`${volta} ${volta === 1 ? "bala voltou" : "balas voltaram"} pro estoque de munição ${munDe(velho).nome}.`, true); };

  const tipoDe = id => TIPOS.find(t => t.id === id) || TIPOS[TIPOS.length - 1];
  const n = v => Math.max(0, Number(v) || 0);
  const emUso = c => !!c.tipo;

  // Os ícones são arquivos em icones/armas/<tipo>.png. Enquanto não existir o .png,
  // usa o .svg provisório da mesma pasta.
  const icone = (id, classe) => `<img class="${classe}" src="icones/armas/${id}.png" alt="" onerror="this.onerror=null;this.src='icones/armas/${id}.svg'">`;

  function danoTexto(c) {
    const t = tipoDe(c.tipo);
    const a = String(c.dano ?? "").trim(), b = String(c.dano2 ?? "").trim();
    if (!a && !b) return "–";
    return t.campos === 2 && b ? `${a || "–"} / ${b}` : a || "–";
  }

  /* ---------------- cards na ficha ---------------- */
  function cardHtml(c, i) {
    const t = tipoDe(c.tipo);
    const tm = tipoMunDe(c), mun = munDe(tm);
    const cap = n(c.capacidade), atual = n(c.municao), est = estoqueDe(c, tm);
    const trocar = permitidas(c.tipo).length > 1 ? `
        <button class="arma-mun-tipo ${tm !== "normal" ? "especial" : ""}" data-arma-tipo="${i}" title="${esc(mun.nome)} · ${esc(mun.efeito)} Toque para trocar a munição.">${iconeMun(tm, "arma-mun-icone")}<span>${esc(mun.nome)}</span></button>` : "";
    const municao = t.municao ? `
      <div class="arma-municao">
        <button class="mini" data-arma-mun="${i}" data-passo="-1" ${atual <= 0 ? "disabled" : ""} aria-label="Gastar 1 munição">−</button>
        <span class="arma-atual" title="Munição atual / capacidade"><b>${atual}</b> / ${cap}</span>
        <button class="mini" data-arma-mun="${i}" data-passo="1" ${atual >= cap || est <= 0 ? "disabled" : ""} aria-label="Recarregar 1 munição do estoque">+</button>
        ${trocar}
        <span class="arma-estoque" title="Estoque de munição ${esc(mun.nome)}">Estoque ${est}</span>
      </div>` : "";
    return `
    <article class="arma-card" data-arma="${i}" tabindex="0" role="button" aria-label="Detalhes de ${esc(c.nome || t.nome)}">
      ${icone(t.id, "arma-icone")}
      <div class="arma-corpo">
        <div class="arma-linha">
          <h3 class="arma-nome">${esc(c.nome || t.nome)}</h3>
          <span class="arma-dano arma-dano-${t.dano}" title="${t.dano === "dor" ? "Dano de Dor" : "Dano Letal"}">${esc(danoTexto(c))}</span>
        </div>
        <span class="arma-tipo">${esc(t.nome)} · espaço ${esc(c.espaco || 0)}</span>
        ${municao}
      </div>
    </article>`;
  }

  function desenhar() {
    const usadas = ficha.coldres.map((c, i) => ({ c, i })).filter(x => emUso(x.c));
    const cheio = usadas.length >= ficha.coldres.length;
    $("coldres").innerHTML = (usadas.length ? usadas.map(x => cardHtml(x.c, x.i)).join("") : '<p class="arma-vazio">Nenhum equipamento. Adicione sua primeira arma.</p>') + `
      <button class="botao botao-claro arma-add" data-arma-add ${cheio ? "disabled" : ""}>+ Adicionar equipamento</button>
      ${cheio ? '<p class="dica arma-limite">Limite de 3 equipamentos. Remova um pra adicionar outro.</p>' : ""}`;
  }

  /* ---------------- formulário (usado na criação e nos detalhes) ---------------- */
  function campo(rotulo, html, dica) { return `<label class="af-campo"><span>${rotulo}</span>${html}${dica ? `<small>${dica}</small>` : ""}</label>`; }

  function formHtml(c, detalhes) {
    const t = tipoDe(c.tipo), perm = permitidas(c.tipo);
    const dano = t.dano === "dor"
      ? campo("Dano de Dor", `<input data-f="dano" type="text" inputmode="numeric" value="${esc(c.dano)}" placeholder="ex.: 2">`)
      : t.campos === 2
        ? campo("Dano Letal 1", `<input data-f="dano" type="text" inputmode="numeric" value="${esc(c.dano)}" placeholder="ex.: 3">`) +
          campo("Dano Letal 2", `<input data-f="dano2" type="text" inputmode="numeric" value="${esc(c.dano2)}" placeholder="opcional">`, "Deixe vazio se a arma só tem um dano.")
        : campo("Dano Letal", `<input data-f="dano" type="text" inputmode="numeric" value="${esc(c.dano)}" placeholder="ex.: 2">`);
    const mun = t.municao ? `
      ${campo("Capacidade máxima", `<input data-f="capacidade" type="number" min="0" value="${n(c.capacidade)}">`, "Quantas balas cabem na arma.")}
      ${detalhes ? campo("Munição na arma agora", `<input data-f="municao" type="number" min="0" value="${n(c.municao)}">`) : ""}
      ${detalhes && perm.length > 1 ? campo("Tipo de munição carregada", `<select data-f="tipoMun">${perm.map(m => `<option value="${m.id}" ${m.id === tipoMunDe(c) ? "selected" : ""}>${m.nome}</option>`).join("")}</select>`, "Ao trocar, as balas que estão na arma voltam pro estoque.") : ""}
      <fieldset class="af-estoques">
        <legend>Munição em estoque (o que você carrega fora da arma)</legend>
        ${perm.map(m => `<label class="af-campo"><span>${m.nome}</span><input ${m.id === "normal" ? 'data-f="reserva"' : `data-est="${m.id}"`} type="number" min="0" value="${estoqueDe(c, m.id)}"></label>`).join("")}
      </fieldset>` : "";
    const tipoSel = detalhes ? campo("Tipo", `<select data-f="tipo">${TIPOS.map(x => `<option value="${x.id}" ${x.id === c.tipo ? "selected" : ""}>${x.nome}</option>`).join("")}</select>`) : "";
    return `
      <div class="af-grade">
        ${campo("Nome", `<input data-f="nome" type="text" value="${esc(c.nome)}" placeholder="ex.: Colt Ação Dupla">`)}
        ${tipoSel}
        ${dano}
        ${campo("Tamanho (espaço)", `<input data-f="espaco" type="number" min="0" step="0.5" value="${esc(c.espaco)}" placeholder="0">`)}
        ${mun}
      </div>
      ${campo("Detalhes e bônus especiais", `<textarea data-f="detalhes" rows="3" placeholder="ex.: 2 ações pra recarregar; dispara 2 tiros por turno…">${esc(c.detalhes)}</textarea>`)}`;
  }

  /* ---------------- janela ---------------- */
  let fundo = null, modo = null, rascunho = null, idx = -1, confirmaRemover = false;

  function garantirJanela() {
    if (!fundo) {
      fundo = document.createElement("div");
      fundo.className = "janela-fundo";
      fundo.hidden = true;
      fundo.innerHTML = '<div class="janela janela-arma" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(fundo);
      fundo.addEventListener("click", aoClicarJanela);
      fundo.addEventListener("input", aoDigitar);
      fundo.addEventListener("change", aoDigitar);
    }
  }
  function abrirJanela() {
    garantirJanela();
    fundo.hidden = false;
    document.body.classList.add("sem-rolagem");
  }
  function fechar() {
    if (!fundo || fundo.hidden) return;
    fundo.hidden = true;
    document.body.classList.remove("sem-rolagem");
    modo = null; rascunho = null; idx = -1; confirmaRemover = false;
    desenhar(); atualizarResumo();
  }
  const caixa = () => { garantirJanela(); return fundo.querySelector(".janela"); };

  function topo(titulo) {
    return `<div class="janela-topo"><h2>${esc(titulo)}</h2><button class="mini" data-a="fechar" aria-label="Fechar">×</button></div>`;
  }

  function telaTipos() {
    modo = "tipo";
    caixa().innerHTML = `${topo("Novo equipamento")}
      <div class="janela-corpo">
        <p class="dica">Escolha o tipo de arma.</p>
        <div class="arma-tipos">
          ${TIPOS.map(t => `<button class="arma-tipo-btn" data-a="tipo" data-id="${t.id}">${icone(t.id, "arma-tipo-icone")}<span>${t.nome}</span></button>`).join("")}
        </div>
      </div>`;
    abrirJanela();
  }

  function telaNova(tipoId) {
    modo = "nova";
    rascunho = { tipo: tipoId, nome: "", dano: "", dano2: "", espaco: "", capacidade: 0, municao: 0, reserva: 0, tipoMun: "normal", estoqueEsp: {}, detalhes: "" };
    desenharNova();
  }
  function desenharNova() {
    const t = tipoDe(rascunho.tipo);
    caixa().innerHTML = `${topo("Novo equipamento")}
      <div class="janela-corpo">
        <div class="arma-cabeca">${icone(t.id, "arma-icone-grande")}<div><b>${t.nome}</b><br><small>${t.dano === "dor" ? "Dano de Dor" : "Dano Letal"}${t.municao ? "" : " · sem munição"}</small></div></div>
        ${formHtml(rascunho, false)}
        <div class="arma-rodape">
          <button class="botao botao-claro" data-a="voltar">Voltar</button>
          <button class="botao" data-a="confirmar" ${rascunho.nome.trim() ? "" : "disabled"}>Adicionar</button>
        </div>
      </div>`;
    abrirJanela();
    const el = caixa().querySelector('[data-f="nome"]'); if (el) el.focus();
  }

  function telaDetalhes(i) {
    modo = "detalhes"; idx = i; confirmaRemover = false;
    const c = ficha.coldres[i], t = tipoDe(c.tipo);
    caixa().innerHTML = `${topo(c.nome || t.nome)}
      <div class="janela-corpo">
        <div class="arma-cabeca">${icone(t.id, "arma-icone-grande")}<div><b>${t.nome}</b><br><small>${t.dano === "dor" ? "Dano de Dor" : "Dano Letal"} ${esc(danoTexto(c))}</small></div></div>
        <p class="dica">Tudo aqui pode ser editado a qualquer momento, e já fica salvo.</p>
        ${formHtml(c, true)}
        <div class="arma-rodape">
          <button class="botao botao-claro dbtn-perigo" data-a="remover">${confirmaRemover ? "Confirmar remoção?" : "Remover arma"}</button>
          ${t.municao ? '<button class="botao botao-claro" data-a="recarregar">Recarregar tudo</button>' : ""}
          <button class="botao" data-a="fechar">Fechar</button>
        </div>
      </div>`;
    abrirJanela();
  }

  function telaMunicao(i) {
    modo = "munTipo"; idx = i;
    const c = ficha.coldres[i], t = tipoDe(c.tipo), atual = tipoMunDe(c);
    caixa().innerHTML = `${topo("Munição · " + (c.nome || t.nome))}
      <div class="janela-corpo">
        <p class="dica">Escolha qual munição está na arma. As balas que ainda estão na arma voltam pro estoque do tipo anterior.</p>
        <div class="mun-opcoes">
          ${permitidas(c.tipo).map(m => `
            <button class="mun-opcao ${m.id === atual ? "ativa" : ""}" data-a="mun" data-id="${m.id}">
              ${iconeMun(m.id, "mun-opcao-icone")}
              <span class="mun-opcao-texto"><b>${m.nome}</b><small>${m.efeito}</small></span>
              <span class="mun-opcao-est">${m.id === atual ? "Carregada · " : ""}Estoque ${estoqueDe(c, m.id)}</span>
            </button>`).join("")}
        </div>
        <div class="arma-rodape"><button class="botao" data-a="fechar">Fechar</button></div>
      </div>`;
    abrirJanela();
  }

  function aoClicarJanela(e) {
    if (e.target === fundo) return fechar();
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const a = b.dataset.a;
    if (a === "fechar") fechar();
    else if (a === "tipo") telaNova(b.dataset.id);
    else if (a === "mun") {
      const c = ficha.coldres[idx], velho = tipoMunDe(c);
      const volta = trocarMunicao(c, b.dataset.id, velho);
      salvar(); fechar(); avisoVolta(volta, velho);
    }
    else if (a === "voltar") telaTipos();
    else if (a === "confirmar") {
      const livre = ficha.coldres.findIndex(c => !emUso(c));
      if (livre < 0 || !rascunho.nome.trim()) return;
      ficha.coldres[livre] = Object.assign(coldreVazio(), rascunho, { nome: rascunho.nome.trim() });
      salvar(); fechar();
    } else if (a === "recarregar") {
      const c = ficha.coldres[idx];
      const falta = Math.max(0, n(c.capacidade) - n(c.municao));
      const tm = tipoMunDe(c), pega = Math.min(falta, estoqueDe(c, tm));
      c.tipoMun = tm; c.municao = n(c.municao) + pega; poeEstoque(c, tm, estoqueDe(c, tm) - pega);
      salvar(); telaDetalhes(idx);
    } else if (a === "remover") {
      if (!confirmaRemover) { confirmaRemover = true; b.textContent = "Confirmar remoção?"; setTimeout(() => { confirmaRemover = false; if (b.isConnected) b.textContent = "Remover arma"; }, 3500); return; }
      ficha.coldres[idx] = coldreVazio();
      salvar(); fechar();
    }
  }

  function aoDigitar(e) {
    const el = e.target, f = el.dataset.f, est = el.dataset.est;
    if (!f && !est) return;
    const alvo = modo === "nova" ? rascunho : modo === "detalhes" ? ficha.coldres[idx] : null;
    if (!alvo) return;
    if (est) {                                // estoque de uma munição especial
      poeEstoque(alvo, est, el.value);
      if (modo === "detalhes") { salvar(); desenhar(); }
      return;
    }
    if (f === "tipo") {                       // muda o tipo: refaz o formulário com os campos do novo tipo
      if (e.type !== "change") return;
      const velho = alvo.tipoMun || "normal";
      alvo.tipo = el.value;
      let volta = 0;
      if (!permitidas(alvo.tipo).some(m => m.id === velho)) volta = trocarMunicao(alvo, "normal", velho);   // a munição especial não serve na arma nova
      salvar(); telaDetalhes(idx); avisoVolta(volta, velho); return;
    }
    if (f === "tipoMun") {                    // troca a munição carregada
      if (e.type !== "change") return;
      const velho = tipoMunDe(alvo), volta = trocarMunicao(alvo, el.value, velho);
      salvar(); telaDetalhes(idx); avisoVolta(volta, velho); return;
    }
    const numerico = ["capacidade", "municao", "reserva"].includes(f);
    alvo[f] = numerico ? n(el.value) : el.value;
    if (modo === "nova") {
      const ok = caixa().querySelector('[data-a="confirmar"]');
      if (ok) ok.disabled = !rascunho.nome.trim();
    } else {
      const c = ficha.coldres[idx];
      if (n(c.municao) > n(c.capacidade) && tipoDe(c.tipo).municao && f !== "municao") c.municao = n(c.capacidade);
      salvar(); desenhar(); atualizarResumo();
    }
  }

  /* ---------------- cliques nos cards ---------------- */
  $("coldres").addEventListener("click", e => {
    if (e.target.closest("[data-arma-add]")) { telaTipos(); return; }
    const trocar = e.target.closest("[data-arma-tipo]");
    if (trocar) { telaMunicao(Number(trocar.dataset.armaTipo)); return; }
    const mun = e.target.closest("[data-arma-mun]");
    if (mun) {
      const c = ficha.coldres[Number(mun.dataset.armaMun)];
      const passo = Number(mun.dataset.passo), tm = tipoMunDe(c);
      if (passo < 0 && n(c.municao) > 0) c.municao = n(c.municao) - 1;                                  // disparo: só gasta
      if (passo > 0 && n(c.municao) < n(c.capacidade) && estoqueDe(c, tm) > 0) { c.tipoMun = tm; c.municao = n(c.municao) + 1; poeEstoque(c, tm, estoqueDe(c, tm) - 1); }   // recarga: tira do estoque do tipo carregado
      salvar(); desenhar(); return;
    }
    const card = e.target.closest("[data-arma]");
    if (card) telaDetalhes(Number(card.dataset.arma));
  });
  $("coldres").addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".arma-card")) { e.preventDefault(); telaDetalhes(Number(e.target.dataset.arma)); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") fechar(); });

  return { desenhar, TIPOS, MUNICOES };
})();

desenharColdres();
