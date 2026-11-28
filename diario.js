/* ============================================================
   DIÁRIO — livro de páginas desenhadas (imagens)
   Usado pela ficha (o jogador sobe as páginas) e pela mesa do mestre (só leitura).

   Como funciona:
   - A ficha guarda só a LISTA de páginas: ficha.diario = ["id1", "id2", ...] (a ordem do livro).
   - Cada imagem fica num documento próprio na nuvem: diarios/{fichaId}/paginas/{id}
     (assim o documento da ficha não estoura o limite de 1 MB do Firebase).
   - As imagens são carregadas só quando a página é aberta.
   - O jogador desenha no Krita em PAG_LARG x PAG_ALT (proporção 3:4); a ficha só reduz.
   ============================================================ */

const Diario = (() => {
  const MAX_PAGINAS = 50;
  // Tamanho recomendado pra desenhar (e o tamanho em que a ficha guarda)
  const DESENHO_LARG = 1200, DESENHO_ALT = 1600;
  const PAG_LARG = 1050, PAG_ALT = 1400;
  const MAX_CARACTERES = 800000;          // limite de segurança da imagem em texto (base64)
  const COR_PAPEL = "#efe3c6";
  const cache = new Map();                // "fichaId/paginaId" -> dataURL

  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Lê o arquivo, encaixa em 3:4 sem distorcer e comprime pra caber no Firebase
  function prepararImagem(arquivo, encaixe) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const tela = document.createElement("canvas");
          let w = PAG_LARG, h = PAG_ALT;
          for (let tentativa = 0; tentativa < 6; tentativa++) {
            tela.width = w; tela.height = h;
            const c = tela.getContext("2d");
            c.fillStyle = COR_PAPEL; c.fillRect(0, 0, w, h);      // fundo transparente vira papel
            c.imageSmoothingQuality = "high";
            const escala = encaixe === "ajustar" ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
            const dw = img.width * escala, dh = img.height * escala;
            c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);   // centralizado, mesma escala nos dois lados
            for (const q of [0.88, 0.8, 0.7, 0.6]) {
              const data = tela.toDataURL("image/jpeg", q);
              if (data.length <= MAX_CARACTERES) return resolve(data);
            }
            w = Math.round(w * 0.85); h = Math.round(h * 0.85);      // ainda grande: reduz e tenta de novo
          }
          reject(new Error("A imagem ficou grande demais mesmo depois de comprimir."));
        } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não consegui abrir essa imagem.")); };
      img.src = url;
    });
  }

  /*
    Diario.criar({ raiz, lista, fichaId, api, salvarLista, leitura })
      raiz        elemento onde o diário é desenhado
      lista()     devolve o array de ids de páginas da ficha
      fichaId()   id da ficha
      api()       devolve as funções da nuvem (diarioLer / diarioSalvar / diarioApagar) ou null
      salvarLista() chamada depois de mudar a lista (a ficha salva e sincroniza)
      leitura     true na mesa do mestre (sem botões de editar)
  */
  function criar(op) {
    const { raiz, lista, fichaId, api, salvarLista, leitura } = op;
    const duas = window.matchMedia("(min-width: 861px)");
    let ini = 0;                 // primeira página visível (par quando são duas)
    let aviso = "";
    let ocupado = false;
    let confirmando = null;      // índice da página esperando confirmar remoção
    let timerConfirma;
    let sentido = "";            // "proxima" | "anterior" (animação)

    const passo = () => (duas.matches ? 2 : 1);
    const chave = pid => `${fichaId()}/${pid}`;
    const encaixeAtual = () => { try { return localStorage.getItem("diario-encaixe") || "cortar"; } catch (e) { return "cortar"; } };

    function ajustarIni() {
      const n = lista().length, p = passo();
      ini = Math.max(0, Math.min(ini, Math.max(0, n - 1)));
      if (p === 2) ini -= ini % 2;
    }

    function carregarImagem(pid, img, carregando) {
      const k = chave(pid);
      if (cache.has(k)) { img.src = cache.get(k); img.hidden = false; carregando.hidden = true; return; }
      const nuvem = api();
      if (!nuvem || !nuvem.diarioLer) { carregando.textContent = "Sem conexão com a nuvem."; return; }
      nuvem.diarioLer(fichaId(), pid).then(dados => {
        if (!dados || !dados.imagem) { carregando.textContent = "Página não encontrada."; return; }
        cache.set(k, dados.imagem);
        if (!img.isConnected) return;
        img.src = dados.imagem; img.hidden = false; carregando.hidden = true;
      }).catch(e => { console.error(e); carregando.textContent = "Não consegui carregar essa página."; });
    }

    function paginaHtml(i, lado) {
      const l = lista();
      if (i >= l.length) {
        return `<div class="dpag dpag-${lado} dpag-branca" aria-hidden="true"></div>`;
      }
      const acoes = leitura ? "" : `
        <div class="dpag-acoes">
          <button class="dbtn" data-d="mover" data-i="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Mover página pra trás" title="Mover pra trás">«</button>
          <button class="dbtn" data-d="trocar" data-i="${i}">Trocar imagem</button>
          <button class="dbtn dbtn-perigo" data-d="remover" data-i="${i}">${confirmando === i ? "Confirmar?" : "Remover"}</button>
          <button class="dbtn" data-d="mover" data-i="${i}" data-dir="1" ${i >= l.length - 1 ? "disabled" : ""} aria-label="Mover página pra frente" title="Mover pra frente">»</button>
        </div>`;
      return `<div class="dpag dpag-${lado}">
        <button class="dpag-img" data-d="zoom" data-i="${i}" aria-label="Ampliar página ${i + 1}">
          <span class="dpag-carregando">Carregando…</span><img alt="Página ${i + 1} do diário" hidden>
        </button>
        <span class="dpag-num">${i + 1}</span>
        ${acoes}
      </div>`;
    }

    function desenhar() {
      ajustarIni();
      const l = lista(), n = l.length, p = passo();
      const nuvem = api();
      const encaixe = encaixeAtual();
      const fim = Math.min(n, ini + p);
      const rotulo = n === 0 ? "Diário vazio"
        : p === 2 && ini + 1 < n ? `Páginas ${ini + 1}–${ini + 2} de ${n}`
        : `Página ${ini + 1} de ${n}`;

      const editor = leitura ? "" : `
        <div class="diario-barra">
          <button class="botao" data-d="adicionar" ${n >= MAX_PAGINAS || ocupado || !(nuvem && nuvem.diarioSalvar) ? "disabled" : ""}>+ Adicionar página</button>
          <div class="diario-encaixe" role="group" aria-label="Como encaixar a imagem">
            <span>Encaixe:</span>
            <button class="dbtn ${encaixe === "cortar" ? "ativo" : ""}" data-d="encaixe" data-v="cortar" title="Preenche a página e corta o que passar, no centro">Cortar</button>
            <button class="dbtn ${encaixe === "ajustar" ? "ativo" : ""}" data-d="encaixe" data-v="ajustar" title="Mostra a imagem inteira, com margem de papel nas sobras">Ajustar</button>
          </div>
          <span class="diario-limite">${n} / ${MAX_PAGINAS} páginas</span>
        </div>
        <p class="dica diario-dica">Desenhe no Krita em <b>${DESENHO_LARG} × ${DESENHO_ALT} px</b> (página em pé, proporção 3:4) e exporte em PNG ou JPG. A ficha reduz sozinha pra ${PAG_LARG} × ${PAG_ALT}, sem distorcer.</p>`;

      const semNuvem = !(nuvem && nuvem.diarioLer) ? '<p class="diario-aviso">O diário precisa da nuvem ligada. Agora a ficha está salvando só neste aparelho.</p>' : "";

      raiz.innerHTML = `
        ${editor}
        ${semNuvem}
        <p class="diario-aviso" ${aviso ? "" : "hidden"} role="status">${esc(aviso)}</p>
        <div class="diario-capa">
          <div class="diario-livro ${sentido ? "virando-" + sentido : ""}">
            ${n === 0
              ? `<div class="dpag dpag-esq dpag-branca dpag-vazia"><p>${leitura ? "Este diário está vazio." : "Seu diário está vazio. Adicione a primeira página."}</p></div>${p === 2 ? '<div class="dpag dpag-dir dpag-branca" aria-hidden="true"></div>' : ""}`
              : paginaHtml(ini, "esq") + (p === 2 ? paginaHtml(ini + 1, "dir") : "")}
            <span class="diario-fita" aria-hidden="true"></span>
          </div>
        </div>
        <div class="diario-nav">
          <button class="botao botao-claro" data-d="anterior" ${ini <= 0 ? "disabled" : ""} aria-label="Página anterior">◀</button>
          <span class="diario-rotulo">${rotulo}</span>
          <button class="botao botao-claro" data-d="proxima" ${ini + p >= n ? "disabled" : ""} aria-label="Próxima página">▶</button>
        </div>
        <input type="file" accept="image/*" hidden data-d="arquivo">`;
      sentido = "";

      // carrega as imagens das páginas visíveis (e adianta a próxima)
      raiz.querySelectorAll(".dpag-img").forEach(b => {
        carregarImagem(l[Number(b.dataset.i)], b.querySelector("img"), b.querySelector(".dpag-carregando"));
      });
      for (let k = fim; k < Math.min(n, fim + p); k++) {
        const nuvemApi = api();
        if (nuvemApi && nuvemApi.diarioLer && !cache.has(chave(l[k]))) nuvemApi.diarioLer(fichaId(), l[k]).then(d => { if (d && d.imagem) cache.set(chave(l[k]), d.imagem); }).catch(() => {});
      }
    }

    function mostrarAviso(t) { aviso = t || ""; const el = raiz.querySelector(".diario-aviso[role=status]"); if (el) { el.textContent = aviso; el.hidden = !aviso; } }

    function ampliar(i) {
      const pid = lista()[i];
      const src = cache.get(chave(pid));
      if (!src) return;
      const z = document.createElement("div");
      z.className = "diario-zoom";
      z.innerHTML = `<button class="mini diario-zoom-fechar" aria-label="Fechar">×</button><div class="diario-zoom-rolagem"><img src="${src}" alt="Página ${i + 1} ampliada"></div>`;
      const fechar = () => { z.remove(); document.removeEventListener("keydown", tecla); };
      const tecla = e => { if (e.key === "Escape") fechar(); };
      z.addEventListener("click", e => { if (e.target === z || e.target.closest(".diario-zoom-fechar")) fechar(); });
      document.addEventListener("keydown", tecla);
      document.body.appendChild(z);
    }

    async function gravar(pid, arquivo) {
      const nuvem = api();
      if (!nuvem || !nuvem.diarioSalvar) throw new Error("O diário precisa da nuvem ligada.");
      const imagem = await prepararImagem(arquivo, encaixeAtual());
      await nuvem.diarioSalvar(fichaId(), pid, { imagem, atualizadoEm: Date.now() });
      cache.set(chave(pid), imagem);
    }

    let alvoArquivo = null;   // { tipo: "nova" | "trocar", i }
    function escolherArquivo(alvo) {
      alvoArquivo = alvo;
      const inp = raiz.querySelector('input[data-d="arquivo"]');
      inp.value = ""; inp.click();
    }

    async function aoEscolherArquivo(arquivo) {
      if (!arquivo || !alvoArquivo) return;
      const alvo = alvoArquivo; alvoArquivo = null;
      if (!arquivo.type.startsWith("image/")) return mostrarAviso("Escolha um arquivo de imagem (PNG ou JPG).");
      ocupado = true; mostrarAviso("Enviando a página…");
      try {
        if (alvo.tipo === "nova") {
          if (lista().length >= MAX_PAGINAS) throw new Error(`O diário já tem ${MAX_PAGINAS} páginas.`);
          const pid = novoId();
          await gravar(pid, arquivo);
          lista().push(pid);
          salvarLista();
          ini = lista().length - 1; sentido = "proxima";
        } else {
          await gravar(lista()[alvo.i], arquivo);
        }
        aviso = "";
      } catch (e) {
        console.error(e);
        aviso = e && e.message ? e.message : "Não deu pra enviar a página.";
      } finally { ocupado = false; desenhar(); }
    }

    async function remover(i) {
      const pid = lista()[i];
      const nuvem = api();
      ocupado = true;
      try {
        if (nuvem && nuvem.diarioApagar) await nuvem.diarioApagar(fichaId(), pid);
        lista().splice(i, 1);
        cache.delete(chave(pid));
        salvarLista();
        aviso = "";
      } catch (e) {
        console.error(e); aviso = "Não deu pra remover a página. Nada foi apagado.";
      } finally { ocupado = false; confirmando = null; desenhar(); }
    }

    raiz.addEventListener("click", e => {
      const b = e.target.closest("[data-d]");
      if (!b || b.tagName === "INPUT") return;
      const a = b.dataset.d, i = Number(b.dataset.i);
      if (a === "anterior") { ini = Math.max(0, ini - passo()); sentido = "anterior"; desenhar(); }
      else if (a === "proxima") { ini += passo(); sentido = "proxima"; desenhar(); }
      else if (a === "zoom") ampliar(i);
      else if (leitura) return;
      else if (a === "adicionar") escolherArquivo({ tipo: "nova" });
      else if (a === "mover") {
        const j = i + Number(b.dataset.dir), l = lista();
        if (j < 0 || j >= l.length) return;
        [l[i], l[j]] = [l[j], l[i]];
        salvarLista(); ini = Math.max(0, j - (passo() === 2 && j % 2 ? 1 : 0)); desenhar();
      }
      else if (a === "trocar") escolherArquivo({ tipo: "trocar", i });
      else if (a === "encaixe") { try { localStorage.setItem("diario-encaixe", b.dataset.v); } catch (x) { /* ignora */ } desenhar(); }
      else if (a === "remover") {
        if (confirmando === i) { clearTimeout(timerConfirma); remover(i); }
        else { confirmando = i; desenhar(); clearTimeout(timerConfirma); timerConfirma = setTimeout(() => { confirmando = null; desenhar(); }, 3500); }
      }
    });
    raiz.addEventListener("change", e => { if (e.target.matches('input[data-d="arquivo"]')) aoEscolherArquivo(e.target.files[0]); });
    // setas do teclado viram a página
    raiz.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowLeft") { ini = Math.max(0, ini - passo()); sentido = "anterior"; desenhar(); }
      if (e.key === "ArrowRight" && ini + passo() < lista().length) { ini += passo(); sentido = "proxima"; desenhar(); }
    });
    duas.addEventListener("change", () => desenhar());

    return { desenhar };
  }

  return { criar, MAX_PAGINAS, DESENHO_LARG, DESENHO_ALT };
})();
