// ============================================================
// NUVEM — liga a ficha ao Firebase (Cloud Firestore)
// Este arquivo é um "módulo": ele carrega a biblioteca do Firebase
// e entrega pro resto da ficha três funções: salvar, ouvir e ouvirTodas.
// As fichas ficam na coleção "fichas", uma por documento.
// ============================================================

const VERSAO_FIREBASE = "12.19.0";
const app = window.FichaApp;

// Lê a configuração. Se o arquivo faltar ou tiver erro, avisa em vez de travar.
let firebaseConfig = null;
let erroConfig = "";
try {
  ({ firebaseConfig } = await import("./firebase-config.js"));
} catch (erro) {
  console.error("Problema no firebase-config.js:", erro);
  erroConfig = "Não consegui ler o firebase-config.js. Confira se ele está no site e se começa com \"export const firebaseConfig\".";
}

const configurado = Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLE_AQUI" && firebaseConfig.projectId);

if (!app) {
  console.warn("nuvem.js carregou antes da ficha.");
} else if (erroConfig) {
  app.nuvemIndisponivel(erroConfig);
} else if (!configurado) {
  app.nuvemIndisponivel("Salvando só neste aparelho. A nuvem ainda não foi configurada.");
} else {
  try {
    const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${VERSAO_FIREBASE}/firebase-app.js`);
    const { getFirestore, doc, setDoc, onSnapshot, collection } =
      await import(`https://www.gstatic.com/firebasejs/${VERSAO_FIREBASE}/firebase-firestore.js`);

    const db = getFirestore(initializeApp(firebaseConfig));

    app.conectarNuvem({
      // grava a ficha inteira no documento fichas/{id}
      salvar: (id, dados) => setDoc(doc(db, "fichas", id), dados),

      // avisa toda vez que a ficha {id} mudar (em qualquer aparelho)
      ouvir: (id, aoMudar, aoFalhar) =>
        onSnapshot(doc(db, "fichas", id),
          snap => aoMudar(snap.exists() ? snap.data() : null, snap.metadata.hasPendingWrites),
          aoFalhar),

      // avisa toda vez que QUALQUER ficha mudar (tela do mestre)
      ouvirTodas: (aoMudar, aoFalhar) =>
        onSnapshot(collection(db, "fichas"),
          snap => aoMudar(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          aoFalhar),
    });
  } catch (erro) {
    console.error(erro);
    app.nuvemIndisponivel("Não deu pra conectar na nuvem. Salvando só neste aparelho.");
  }
}