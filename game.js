// Wrap game logic in an object
const KnifeNinjaGame = (() => {

    // --- Images ---
    const KNIFE_IMAGE_SRC = 'images/center_knife.png';
    const APPLE_IMAGE_SRC = 'images/apple.png'; // Make sure this file exists

    // --- DOM Elements ---
    let log, levelCompletePopup, gameOverPopup, claimDiamondButton, retryLevelButton;
    let gameLevelStageDisplay, gameScoreDisplay, knifeIconsDisplay, gameLogContainer, gameReadyKnifeImg, touchArea;
    let popupScoreDisplay, adMessage, bossFightIndicator;

    // --- Game State ---
    let currentLevel = 1; // Hamesha 1 se shuru hoga
    let currentStage = 1;
    let stagesPerLevel = 1; // Har level 1 stage ka (testing ke liye)
    let currentScore = 0;
    let totalDiamonds = 0;
    let knivesPerStage = 7; // Usually overridden by config
    let knivesLeft = knivesPerStage;
    let knivesOnLog = [];
    let applesOnLog = [];
    let logSpeed = 1.0; // Easier speed
    let currentLogAngle = 0;
    let isGameOver = false;
    let isThrowing = false;
    let isBossStage = false; // Level 1 boss nahi hoga
    let animationFrameId;
    let onGameEndCallback = null;
    let onGameOverCallback = null;

    // --- Initialization ---
    function init(initialDiamonds, gameEndCallback, gameOverCallback) {
        console.log("Initializing Knife Ninja Game (Combined - ALWAYS LEVEL 1 TEST)..."); // Log updated
        totalDiamonds = initialDiamonds;
        onGameEndCallback = gameEndCallback;
        onGameOverCallback = gameOverCallback;

        try {
            log = document.getElementById('game-log');
            levelCompletePopup = document.getElementById('level-complete-popup');
            gameOverPopup = document.getElementById('game-over-popup');
            claimDiamondButton = document.getElementById('claim-diamond-button');
            retryLevelButton = document.getElementById('retry-level-button');
            gameLevelStageDisplay = document.getElementById('game-level-stage-display');
            gameScoreDisplay = document.getElementById('game-score-display');
            knifeIconsDisplay = document.getElementById('knife-icons-display');
            gameLogContainer = document.getElementById('game-log-container');
            const readyKnifeDiv = document.getElementById('game-ready-knife');
            if (readyKnifeDiv) {
                gameReadyKnifeImg = readyKnifeDiv.querySelector('img');
                 if(!gameReadyKnifeImg) console.error("CRITICAL: img tag inside #game-ready-knife NOT FOUND!");
            } else {
                console.error("CRITICAL: #game-ready-knife div NOT FOUND!");
                gameReadyKnifeImg = null;
            }
            touchArea = document.getElementById('touch-area');
            popupScoreDisplay = document.getElementById('popup-score');
            adMessage = document.getElementById('ad-message');
            bossFightIndicator = document.getElementById('boss-fight-indicator');

            if (!log || !gameReadyKnifeImg || !touchArea || !knifeIconsDisplay) {
                console.error("One or more essential game elements not found! Check game.html", {log, gameReadyKnifeImg, touchArea, knifeIconsDisplay});
                alert("Game essential elements failed to load. Check game.html.");
                return;
            }

            // Hamesha Level 1 set karo, saved level ko ignore karo
            currentLevel = 1;
            currentStage = 1;
            console.log("Testing Mode: Forcing Level 1.");


            isGameOver = false;
            isThrowing = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            touchArea.removeEventListener('click', handleThrow);
            touchArea.addEventListener('click', handleThrow);
            claimDiamondButton.removeEventListener('click', handleClaimDiamond);
            claimDiamondButton.addEventListener('click', handleClaimDiamond);
            retryLevelButton.removeEventListener('click', handleRetry);
            retryLevelButton.addEventListener('click', handleRetry);

            console.log("Init complete. Starting stage...");
            startStage();

        } catch (error) {
            console.error("Error during init:", error);
            alert("Error initializing game: " + error.message);
        }
    }

    function startStage() {
        try {
            // currentLevel hamesha 1 rahega
            console.log(`Starting Level ${currentLevel} - Stage ${currentStage} (Always Level 1, 1 Stage total in test)`);
            isGameOver = false;
            isThrowing = false;
            knivesOnLog = [];
            applesOnLog = [];
            currentLogAngle = 0;
            currentScore = 0;

            isBossStage = false; // Level 1 kabhi boss nahi hoga

            configureStage(); // Yeh hamesha Level 1, 1 Stage ke liye config karega

            log.innerHTML = '';
            let occupiedAngles = [];

            // Add initial knives
            for (let i = 0; i < config.initialKnives; i++) {
                let angle;
                do { angle = Math.random() * 360; }
                while (isAngleOccupied(angle, occupiedAngles, config.knifeSpacing));
                occupiedAngles.push(angle);
                const knifeEl = createKnifeOnLog(angle);
                knivesOnLog.push({ element: knifeEl, angle: angle });
            }

            // Add apples
            for (let i = 0; i < config.numApples; i++) {
                 let angle;
                 do { angle = Math.random() * 360; }
                 while (isAngleOccupied(angle, occupiedAngles, config.appleSpacing));
                 occupiedAngles.push(angle);
                 const appleEl = createAppleOnLog(angle);
                 applesOnLog.push({ element: appleEl, angle: angle, hit: false });
            }


            logSpeed = config.logSpeed * (config.reverseDirection ? -1 : 1);

            updateGameUI();

            if (gameReadyKnifeImg) {
                gameReadyKnifeImg.parentElement.style.visibility = 'visible';
            } else {
                console.error("startStage: gameReadyKnifeImg is null!");
            }

            levelCompletePopup.classList.add('hidden');
            gameOverPopup.classList.add('hidden');

            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            console.log("Starting gameLoop...");
            gameLoop();

        } catch (error) {
            console.error("Error during startStage:", error);
            alert("Error loading stage: " + error.message);
        }
    }

    // --- Stage Configuration (ALWAYS LEVEL 1, 1 STAGE) ---
    let config = {};
    function configureStage() {
         stagesPerLevel = 1; // Hamesha 1 stage
         isBossStage = false; // Hamesha normal stage

         // Normal stage configuration for Level 1 (Easier Difficulty)
         config = {
             knivesPerStage: 5 + 1 + 1, // 5 + currentLevel + currentStage = 7
             initialKnives: Math.min(Math.floor(1 / 4), 3), // = 0 initial knives
             numApples: 1 + Math.floor(1 / 5), // = 1 apple
             logSpeed: 1.0 + (1 * 0.08) + (1 * 0.04), // = 1.12 speed
             reverseDirection: false,
             knifeSpacing: 22 - Math.floor(1 / 6), // = 22 spacing
             appleSpacing: 35
         };

         knivesLeft = config.knivesPerStage;
         console.log(`Stage Configured (TEST - Always Level 1): Knives: ${knivesLeft}, Speed: ${config.logSpeed}`);
    }


    function isAngleOccupied(angle, occupiedAngles, threshold) {
        for (const occupied of occupiedAngles) {
            let diff = Math.abs(angle - occupied); if (diff > 180) diff = 360 - diff;
            if (diff < threshold) return true;
        }
        return false;
    }

    // --- Game Loop ---
    function gameLoop() {
        if (isGameOver) return;
        currentLogAngle = (currentLogAngle + logSpeed) % 360;
        if (log) log.style.transform = `translate(-50%, -50%) rotate(${currentLogAngle}deg)`;
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function updateGameUI() {
         // Hamesha "Level 1" dikhayega
         if (gameLevelStageDisplay) gameLevelStageDisplay.textContent = `Level ${currentLevel}`; // Sirf level dikhao

        if (gameScoreDisplay) gameScoreDisplay.textContent = `SCORE : ${currentScore}`;
        if (knifeIconsDisplay) {
             knifeIconsDisplay.innerHTML = '';
             for (let i = 0; i < knivesLeft; i++) {
                 const icon = document.createElement('div');
                 icon.className = 'knife-icon';
                 knifeIconsDisplay.appendChild(icon);
             }
        } else { console.warn("updateGameUI: knifeIconsDisplay is null!"); }
    }

    // --- Create Objects ---
    function createKnifeOnLog(angle) {
        const knife = document.createElement('div');
        knife.className = 'knife-on-log';
        knife.style.transform = `rotate(${angle}deg) translateY(-100px)`;
        const img = document.createElement('img');
        img.src = KNIFE_IMAGE_SRC;
        img.style.width = '100%'; img.style.height = 'auto';
        knife.appendChild(img);
        log.appendChild(knife);
        return knife;
    }
    function createAppleOnLog(angle) {
        const apple = document.createElement('div');
        apple.className = 'apple-on-log';
        apple.style.transform = `rotate(${angle}deg) translateY(-70px)`;
        const img = document.createElement('img');
        img.src = APPLE_IMAGE_SRC;
        img.style.width = '100%'; img.style.height = '100%';
        apple.appendChild(img);
        log.appendChild(apple);
        return apple;
    }

    // --- Game Logic ---
    function handleThrow() {
        if (isThrowing || knivesLeft === 0 || isGameOver || !gameReadyKnifeImg) return;
        isThrowing = true;
        knivesLeft--;
        updateGameUI();
        gameReadyKnifeImg.parentElement.classList.add('knife-throw-game-animation');
        gameReadyKnifeImg.parentElement.style.visibility = 'hidden';

        setTimeout(() => {
            const hitAngle = (180 - currentLogAngle + 360) % 360;
            checkCollision(hitAngle);
            gameReadyKnifeImg.parentElement.classList.remove('knife-throw-game-animation');
            isThrowing = false;
            if (!isGameOver) {
                 if (knivesLeft > 0) {
                      gameReadyKnifeImg.parentElement.style.visibility = 'visible';
                 } else { setTimeout(completeStage, 400); }
            } else { gameReadyKnifeImg.parentElement.style.visibility = 'hidden'; }
        }, 80);
    }

    function checkCollision(hitAngle) {
        // Apple collision
        const appleHitThreshold = 15;
        for (let i = applesOnLog.length - 1; i >= 0; i--) {
            const apple = applesOnLog[i];
            if (apple.hit) continue;
            let diff = Math.abs(hitAngle - apple.angle); if (diff > 180) diff = 360 - diff;
            if (diff < appleHitThreshold) {
                currentScore++; apple.hit = true;
                if(apple.element) apple.element.classList.add('hidden');
                applesOnLog.splice(i, 1); updateGameUI();
            }
        }
        // Knife collision
        const knifeHitThreshold = 9; // Normal level collision
        let didCollide = false;
        for (const knife of knivesOnLog) {
            let diff = Math.abs(hitAngle - knife.angle); if (diff > 180) diff = 360 - diff;
            if (diff < knifeHitThreshold) { didCollide = true; break; }
        }
        if (didCollide) {
            gameOver();
        } else {
            const knifeEl = createKnifeOnLog(hitAngle);
            knivesOnLog.push({ element: knifeEl, angle: hitAngle });
        }
    }

    // --- Popups & Progression ---
    function gameOver() {
        isGameOver = true;
        cancelAnimationFrame(animationFrameId);
        gameOverPopup.classList.remove('hidden');
    }

    // Stage complete hone par seedha Level Complete hoga
    function completeStage() {
        if (isGameOver) return;
        console.log("Stage complete (Level Complete).");
        completeLevel();
    }

    function completeLevel() {
         console.log("Level complete!");
         cancelAnimationFrame(animationFrameId);
         popupScoreDisplay.textContent = currentScore;
         adMessage.textContent = "Loading Ad...";
         claimDiamondButton.disabled = true;
         levelCompletePopup.classList.remove('hidden');
         setTimeout(() => {
              adMessage.textContent = "";
              claimDiamondButton.disabled = false;
         }, 1500);
    }

    function handleClaimDiamond() {
        totalDiamonds++;
        // ===========================================
        // | --- YAHAN CHANGE KIYA GAYA HAI (TEST) ---
        // ===========================================
        // Level ko mat badhao
        // currentLevel++;
        // localStorage.setItem(`currentLevel_${localStorage.getItem('loggedInUserId')}`, currentLevel);
        console.log("Level won, but staying on Level 1 for testing.");
        // ===========================================

        currentStage = 1; // Stage reset karo (kyunki hum stage complete hone par level complete kar rahe hain)

        levelCompletePopup.classList.add('hidden');
        if (onGameEndCallback) { onGameEndCallback(totalDiamonds); }
    }

    function handleRetry() {
         gameOverPopup.classList.add('hidden');
         if(onGameOverCallback) { onGameOverCallback(); }
    }


// ==============================================================
// | --- YAHAN game_page.js KA CODE ADD KIYA GAYA HAI ---      |
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {

    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        console.log("User not logged in. Redirecting to index.html");
        window.location.href = 'index.html'; return;
    }
    const savedDiamonds = parseInt(localStorage.getItem(`diamonds_${userId}`) || '0');
    console.log("User logged in:", userId, "Saved Diamonds:", savedDiamonds);

    const gameScreen = document.getElementById('game-screen');
    if (gameScreen && !gameScreen.classList.contains('active')) {
         console.warn("Game screen not active, forcing active.");
         gameScreen.classList.add('active');
    } else if (!gameScreen) {
        console.error("Game screen element not found! Cannot start game.");
        alert("Game screen load nahi hua. Redirecting...");
        window.location.href = 'index.html'; return;
    }

    // Check karo ki init function मौजूद hai (jo upar define kiya gaya hai)
    if (typeof init === 'function') {
        console.log("init function found. Initializing...");
        init( // Direct call init()
            savedDiamonds,
            (newDiamonds) => { // On Game End
                console.log("Game ended successfully. New diamond count:", newDiamonds);
                localStorage.setItem(`diamonds_${userId}`, newDiamonds);
                window.location.href = 'index.html'; // Go back home
            },
            () => { // On Game Over
                console.log("Game over. Redirecting to home screen.");
                window.location.href = 'index.html'; // Go back home
            }
        );
    } else {
        console.error("CRITICAL: init function not found! Check game.js for syntax errors.");
        alert("Game load hone mein serious error! Redirecting...");
        window.location.href = 'index.html';
    }
});
// ==============================================================
// | --- game_page.js KA CODE YAHAN KHATAM HOTA HAI ---        |
// ==============================================================

})(); // <<< IIFE (KnifeNinjaGame) yahan band hoga
