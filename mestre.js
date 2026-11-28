<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Mesa do Mestre</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rye&family=Special+Elite&family=Zilla+Slab:ital,wght@0,400;0,600;0,700;1,400&display=swap">
  <!-- O "?v=..." força o navegador a baixar a versão nova depois de cada atualização.
       Quando mudar algum arquivo, troque esse número (ex.: a data de hoje). -->
  <link rel="stylesheet" href="style.css?v=20261128a">
  <link rel="stylesheet" href="tema-botanico.css?v=20261104h">
  <link rel="stylesheet" href="diario.css?v=20261128a">
</head>
<body>
<!-- ============================================================
     MESA DO MESTRE
     Mostra todas as fichas salvas na nuvem, atualizando ao vivo.
     ============================================================ -->

<header class="topo">
  <div class="marca">Mesa do Mestre</div>
  <a class="botao-ficha link-topo" href="index.html">Abrir ficha</a>
</header>

<main class="mesa-mestre">
  <div class="mestre-cabeca-status">
    <p class="status-nuvem mestre-status" id="status-nuvem" data-estado="conectando">Conectando na nuvem…</p>
    <label class="mestre-filtro"><input type="checkbox" id="mostrar-vazias"> Mostrar fichas vazias</label>
  </div>
  <div class="grade-mestre" id="grade-mestre"></div>
</main>

<!-- Janela do diário de um jogador (só leitura) -->
<div class="janela-fundo" id="janela-diario" hidden>
  <div class="janela janela-diario" role="dialog" aria-modal="true" aria-labelledby="titulo-diario">
    <div class="janela-topo">
      <h2 id="titulo-diario">Diário</h2>
      <button class="mini" id="fechar-diario" aria-label="Fechar">×</button>
    </div>
    <div class="janela-corpo"><div class="diario" id="diario-raiz"></div></div>
  </div>
</div>

<script src="habilidades.js?v=20261104g"></script>
<script src="diario.js?v=20261128a"></script>
<script src="mestre.js?v=20261128a"></script>
<script type="module" src="nuvem.js?v=20261128b"></script>
</body>
</html>
