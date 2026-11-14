<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Xadrez PHP</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <div class="game-container">
        <h1>Xadrez em PHP</h1>

        <section class="account-bar" aria-label="Conta do usuário">
            <span id="account-user-label"></span>
            <a id="account-link" href="auth.php">Entrar ou criar conta</a>
            <button id="logout-btn" type="button" hidden>Sair</button>
        </section>

        <div class="controls">
            <label>
                Modo:
                <select id="mode-select">
                    <option value="player-vs-ai">Jogador vs. IA</option>
                    <option value="ai-vs-ai">IA vs. IA</option>
                </select>
            </label>

            <label>
                Dificuldade da IA:
                <select id="difficulty-select">
                    <option value="random">Aleatória</option>
                    <option value="greedy">Gulosa (prioriza capturas)</option>
                </select>
            </label>

            <button id="new-game-btn">Nova partida</button>
        </div>

        <div id="status" class="status">Clique em "Nova partida" para começar.</div>

        <div id="board" class="board"></div>
        <button id="claim-draw-btn" class="claim-draw-btn" type="button" hidden>
            Reivindicar empate
        </button>
    </div>

    <dialog id="promotion-dialog" class="promotion-dialog">
        <form method="dialog">
            <h2>Escolha a peça da promoção</h2>
            <div class="promotion-choices">
                <button type="submit" value="Q" aria-label="Promover a dama">♕</button>
                <button type="submit" value="R" aria-label="Promover a torre">♖</button>
                <button type="submit" value="B" aria-label="Promover a bispo">♗</button>
                <button type="submit" value="N" aria-label="Promover a cavalo">♘</button>
            </div>
        </form>
    </dialog>

    <script src="js/api.js"></script>
    <script src="js/board.js"></script>
    <script src="js/ui.js"></script>
</body>
</html>