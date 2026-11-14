/**
 * ui.js — conecta o tabuleiro à API e atualiza o estado da interface.
 */

const statusEl = document.getElementById('status');
const newGameBtn = document.getElementById('new-game-btn');
const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const claimDrawBtn = document.getElementById('claim-draw-btn');
const promotionDialog = document.getElementById('promotion-dialog');

let currentMode = 'player-vs-ai';
let selectedSquare = null;
let legalMoves = [];
let aiVsAiTimer = null;
let isBusy = false;
let gameVersion = 0;

const HUMAN_COLOR = 'white';
const AI_THINKING_TIME = 1000;

function setStatus(text, state = '') {
    statusEl.textContent = text;
    statusEl.dataset.state = state;
}

function waitForAi() {
    return new Promise(resolve => {
        aiVsAiTimer = setTimeout(resolve, AI_THINKING_TIME);
    });
}

function stopAiVsAiLoop() {
    if (aiVsAiTimer !== null) {
        clearTimeout(aiVsAiTimer);
        aiVsAiTimer = null;
    }
}

/**
 * Atualiza o tabuleiro e a mensagem da vez a partir da resposta da API.
 */
async function updateFromResponse(data, move = null) {
    window.lastDrawClaims = data.drawClaims || {
        threefoldRepetition: false,
        fiftyMoveRule: false,
    };
    if (data.captured) {
        Board.playCaptureSound();
    }
    legalMoves = [];
    await Board.render(data.board, selectedSquare, legalMoves, move, Boolean(data.captured));

    claimDrawBtn.hidden = data.status !== null || !data.drawClaims
        || (!data.drawClaims.threefoldRepetition && !data.drawClaims.fiftyMoveRule);

    if (data.status === 'checkmate') {
        setStatus(`Xeque-mate! Vencedor: ${data.winner === 'white' ? 'Brancas' : 'Pretas'}`, 'finished');
        stopAiVsAiLoop();
    } else if (data.status === 'stalemate') {
        setStatus('Empate por afogamento (stalemate).', 'finished');
        stopAiVsAiLoop();
    } else if (data.status) {
        const drawMessages = {
            'draw-insufficient-material': 'Empate por material insuficiente.',
            'draw-fivefold-repetition': 'Empate automático por repetição quíntupla.',
            'draw-seventy-five-move': 'Empate automático pela regra dos 75 lances.',
            'draw-repetition': 'Empate reivindicado por repetição tripla.',
            'draw-fifty-move': 'Empate reivindicado pela regra dos 50 lances.',
        };
        setStatus(drawMessages[data.status] || 'A partida terminou empatada.', 'finished');
        stopAiVsAiLoop();
    } else {
        const turnLabel = data.turn === 'white' ? 'Brancas' : 'Pretas';
        setStatus(data.inCheck ? `${turnLabel} em xeque! Vez de ${turnLabel}.` : `Vez de: ${turnLabel}`);
    }
}

function choosePromotion() {
    return new Promise(resolve => {
        promotionDialog.addEventListener('close', () => {
            resolve(promotionDialog.returnValue || 'Q');
        }, { once: true });
        promotionDialog.showModal();
    });
}

/**
 * No modo IA vs. IA, cada jogada começa após um segundo de espera.
 */
async function playAiVsAiTurn(version) {
    if (currentMode !== 'ai-vs-ai' || version !== gameVersion) {
        return;
    }

    setStatus('IA pensando...', 'thinking');
    await waitForAi();
    aiVsAiTimer = null;

    if (currentMode !== 'ai-vs-ai' || version !== gameVersion) {
        return;
    }

    try {
        const data = await API.aiMove();
        if (!data.success) {
            throw new Error(data.error || 'Não foi possível obter a jogada da IA.');
        }

        await updateFromResponse(data, data.move);
        if (data.status === null && version === gameVersion) {
            playAiVsAiTurn(version);
        }
    } catch (error) {
        if (version === gameVersion) {
            setStatus(`Erro ao jogar: ${error.message}`, 'error');
        }
    }
}

Board.onSquareClick = async (row, col) => {
    if (currentMode !== 'player-vs-ai' || isBusy) {
        return;
    }

    Board.prepareAudio();

    if (selectedSquare === null) {
        const piece = window.lastBoardState?.[row]?.[col];
        if (!piece || piece.color !== HUMAN_COLOR) {
            return;
        }

        selectedSquare = [row, col];
        isBusy = true;
        newGameBtn.disabled = true;
        try {
            const data = await API.legalMoves(row, col);
            if (!data.success) {
                throw new Error(data.error || 'Não foi possível carregar as jogadas legais.');
            }
            legalMoves = data.moves;
            await Board.render(window.lastBoardState, selectedSquare, legalMoves);
        } catch (error) {
            selectedSquare = null;
            legalMoves = [];
            setStatus(`Erro ao selecionar a peça: ${error.message}`, 'error');
        } finally {
            isBusy = false;
            newGameBtn.disabled = false;
        }
        return;
    }

    const [fromRow, fromCol] = selectedSquare;
    if (row === fromRow && col === fromCol) {
        selectedSquare = null;
        legalMoves = [];
        await Board.render(window.lastBoardState);
        return;
    }

    const clickedPiece = window.lastBoardState?.[row]?.[col];
    if (clickedPiece?.color === HUMAN_COLOR) {
        selectedSquare = null;
        legalMoves = [];
        await Board.render(window.lastBoardState);
        Board.onSquareClick(row, col);
        return;
    }

    if (!legalMoves.some(([moveRow, moveCol]) => moveRow === row && moveCol === col)) {
        return;
    }

    selectedSquare = null;
    legalMoves = [];
    isBusy = true;
    newGameBtn.disabled = true;

    try {
        const pawn = window.lastBoardState[fromRow][fromCol];
        const promotes = pawn?.type === 'P' && (row === 0 || row === 7);
        const promotion = promotes ? await choosePromotion() : 'Q';
        const data = await API.move(fromRow, fromCol, row, col, promotion);
        if (data.board) {
            window.lastBoardState = data.board;
        }

        if (!data.success) {
            setStatus(`Jogada inválida: ${data.error}`, 'error');
            await Board.render(window.lastBoardState);
            return;
        }

        await updateFromResponse(data, data.move);

        if (data.status === null && data.turn !== HUMAN_COLOR) {
            setStatus('IA pensando...', 'thinking');
            await new Promise(resolve => setTimeout(resolve, AI_THINKING_TIME));

            const aiData = await API.aiMove();
            if (!aiData.success) {
                throw new Error(aiData.error || 'Não foi possível obter a jogada da IA.');
            }

            window.lastBoardState = aiData.board;
            await updateFromResponse(aiData, aiData.move);
        }
    } catch (error) {
        setStatus(`Erro ao jogar: ${error.message}`, 'error');
    } finally {
        isBusy = false;
        newGameBtn.disabled = false;
    }
};

newGameBtn.addEventListener('click', async () => {
    Board.prepareAudio();
    stopAiVsAiLoop();
    gameVersion++;
    selectedSquare = null;
    isBusy = true;
    newGameBtn.disabled = true;
    currentMode = modeSelect.value;

    try {
        const data = await API.newGame(currentMode, difficultySelect.value);
        if (!data.success) {
            throw new Error(data.error || 'Não foi possível iniciar a partida.');
        }

        window.lastBoardState = data.board;
        legalMoves = [];
        window.lastDrawClaims = {
            threefoldRepetition: false,
            fiftyMoveRule: false,
        };
        claimDrawBtn.hidden = true;
        await Board.render(data.board);
        setStatus(`Partida iniciada. Vez de: Brancas${currentMode === 'ai-vs-ai' ? ' — IA vs. IA' : ''}`);

        if (currentMode === 'ai-vs-ai') {
            playAiVsAiTurn(gameVersion);
        }
    } catch (error) {
        setStatus(`Erro ao iniciar a partida: ${error.message}`, 'error');
    } finally {
        isBusy = false;
        newGameBtn.disabled = false;
    }
});

claimDrawBtn.addEventListener('click', async () => {
    if (isBusy) {
        return;
    }

    isBusy = true;
    claimDrawBtn.disabled = true;
    try {
        const reason = window.lastDrawClaims?.threefoldRepetition ? 'repetition' : 'fifty-move';
        const data = await API.claimDraw(reason);
        if (!data.success) {
            throw new Error(data.error || 'Não foi possível reivindicar o empate.');
        }
        claimDrawBtn.hidden = true;
        const message = data.status === 'draw-repetition'
            ? 'Empate reivindicado por repetição tripla.'
            : 'Empate reivindicado pela regra dos 50 lances.';
        setStatus(message, 'finished');
        stopAiVsAiLoop();
    } catch (error) {
        setStatus(`Erro ao reivindicar empate: ${error.message}`, 'error');
    } finally {
        isBusy = false;
        claimDrawBtn.disabled = false;
    }
});
