const NAME_STORAGE_KEY = "class-lottery-names";
const MAX_NUMBER_RANGE = 100000;

let app;
let confetti = [];
let confettiUntil = 0;
let audioContext;

function setup() {
  createCanvas(windowWidth, windowHeight);
  const canvas = document.querySelector("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.classList.add("confetti-canvas");

  app = document.createElement("main");
  app.className = "app-shell";
  document.body.appendChild(app);

  let savedNames = "";
  try {
    savedNames = localStorage.getItem(NAME_STORAGE_KEY) || "";
  } catch (error) {
    console.warn("無法讀取瀏覽器儲存的名單。", error);
  }

  app.innerHTML = `
    <header class="page-header">
      <div class="brand-mark" aria-hidden="true">✦</div>
      <div>
        <p class="eyebrow">CLASSROOM PICKER</p>
        <h1>今天，換誰回答？</h1>
        <p class="subtitle">公平抽選每一位同學，讓課堂多一點驚喜。</p>
      </div>
      <div class="header-badge"><span class="live-dot"></span> 課堂抽籤中</div>
    </header>

    <div class="main-grid">
      <section class="panel setup-panel" aria-labelledby="setup-title">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">SETUP</p>
            <h2 id="setup-title">抽籤設定</h2>
          </div>
          <span class="step-mark">01</span>
        </div>

        <div class="mode-switch" role="group" aria-label="抽籤模式">
          <button type="button" class="mode-button is-active" data-mode="number" aria-pressed="true">數字模式</button>
          <button type="button" class="mode-button" data-mode="name" aria-pressed="false">姓名模式</button>
        </div>

        <div class="mode-fields number-fields">
          <div class="number-inputs">
            <label class="field-label">起始號碼
              <input id="range-start" type="number" value="1" step="1" inputmode="numeric">
            </label>
            <span class="range-separator" aria-hidden="true">～</span>
            <label class="field-label">結束號碼
              <input id="range-end" type="number" value="30" step="1" inputmode="numeric">
            </label>
          </div>
          <p class="field-hint">包含起始與結束號碼</p>
        </div>

        <div class="mode-fields name-fields" hidden>
          <label class="field-label" for="name-list">班級名單 <span class="label-note">一行一位同學</span></label>
          <textarea id="name-list" rows="6" placeholder="王小明&#10;陳怡君&#10;林同學">${escapeHtml(savedNames)}</textarea>
          <p class="field-hint">名單會自動儲存在這台裝置的瀏覽器。</p>
        </div>

        <div class="field-block">
          <label class="field-label" for="exclude-list">排除對象 <span class="label-note">選填</span></label>
          <input id="exclude-list" type="text" placeholder="例如：5, 12" autocomplete="off">
          <p class="field-hint exclude-hint">輸入不參加的號碼，以逗號分隔。</p>
        </div>

        <div class="field-block">
          <label class="field-label" for="draw-count">本次抽出人數</label>
          <div class="count-control">
            <button type="button" class="count-step" id="count-minus" aria-label="減少抽出人數">−</button>
            <input id="draw-count" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="本次抽出人數">
            <button type="button" class="count-step" id="count-plus" aria-label="增加抽出人數">＋</button>
            <span class="count-unit">位</span>
          </div>
        </div>

        <div class="repeat-setting">
          <div>
            <label class="field-label" for="no-repeat">不重複抽籤</label>
            <p class="field-hint">抽過的同學不會再次出現</p>
          </div>
          <label class="toggle" aria-label="不重複抽籤">
            <input id="no-repeat" type="checkbox" checked>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="available-count" id="available-count" aria-live="polite">
          <span class="available-icon" aria-hidden="true">✓</span>
          <span>剩餘可抽人數 <strong id="remaining-number">30</strong></span>
        </div>

        <p class="error-message" id="error-message" role="alert" hidden></p>
      </section>

      <section class="panel draw-panel" aria-labelledby="draw-title">
        <div class="panel-heading draw-heading">
          <div>
            <p class="eyebrow">LET'S PICK</p>
            <h2 id="draw-title">準備好了嗎？</h2>
          </div>
          <span class="step-mark">02</span>
        </div>

        <div class="result-stage" id="result-stage" aria-live="polite" aria-atomic="true">
          <div class="result-decoration decoration-one" aria-hidden="true">✦</div>
          <div class="result-decoration decoration-two" aria-hidden="true">✧</div>
          <p class="result-label" id="result-label">幸運得主即將揭曉</p>
          <div class="result-values" id="result-values">
            <span class="result-placeholder">?</span>
          </div>
          <p class="result-caption" id="result-caption">按下按鈕，看看今天的幸運同學是誰！</p>
        </div>

        <button type="button" class="draw-button" id="draw-button">
          <span class="draw-button-icon" aria-hidden="true">✦</span>
          <span id="draw-button-text">開始抽籤</span>
          <span class="draw-button-arrow" aria-hidden="true">→</span>
        </button>

        <p class="draw-note"><span aria-hidden="true">✦</span> 每位同學都有被選中的機會</p>
      </section>
    </div>

    <section class="panel history-panel" aria-labelledby="history-title">
      <div class="history-heading">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">HISTORY</p>
            <h2 id="history-title">抽籤紀錄 <span class="history-total" id="history-total">0</span></h2>
          </div>
        </div>
        <button type="button" class="reset-button" id="reset-button"><span aria-hidden="true">↺</span> 重置抽籤</button>
      </div>
      <div class="history-list" id="history-list">
        <div class="empty-history">
          <span class="empty-history-icon" aria-hidden="true">☷</span>
          <p>還沒有抽籤紀錄</p>
          <span>抽出第一位幸運同學後，紀錄會顯示在這裡。</span>
        </div>
      </div>
    </section>

    <footer class="page-footer">讓每一次舉手，都有一點小小的期待 <span aria-hidden="true">✦</span></footer>
  `;

  initializeApp();
}

function draw() {
  clear();
  if (millis() < confettiUntil) {
    for (let index = confetti.length - 1; index >= 0; index -= 1) {
      const piece = confetti[index];
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.09;
      piece.rotation += piece.rotationSpeed;
      piece.life -= 1;
      push();
      translate(piece.x, piece.y);
      rotate(piece.rotation);
      noStroke();
      fill(piece.color);
      rectMode(CENTER);
      rect(0, 0, piece.size, piece.size * 0.58, 1);
      pop();
      if (piece.life <= 0 || piece.y > height + 20) {
        confetti.splice(index, 1);
      }
    }
  } else if (confetti.length) {
    confetti = [];
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function initializeApp() {
  const startInput = document.getElementById("range-start");
  const endInput = document.getElementById("range-end");
  const nameInput = document.getElementById("name-list");
  const excludeInput = document.getElementById("exclude-list");
  const drawCountInput = document.getElementById("draw-count");
  const noRepeatInput = document.getElementById("no-repeat");
  const errorBox = document.getElementById("error-message");
  const drawButton = document.getElementById("draw-button");
  const drawButtonText = document.getElementById("draw-button-text");
  const remainingNumber = document.getElementById("remaining-number");
  const availableCount = document.getElementById("available-count");
  const historyList = document.getElementById("history-list");
  const historyTotal = document.getElementById("history-total");
  const resultValues = document.getElementById("result-values");
  const resultLabel = document.getElementById("result-label");
  const resultCaption = document.getElementById("result-caption");
  const drawTitle = document.getElementById("draw-title");
  const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
  let mode = "number";
  let alreadyDrawn = new Set();
  let history = [];
  let drawing = false;

  function resetDrawnPool() {
    alreadyDrawn = new Set();
    updateAvailability();
  }

  function getPool() {
    if (mode === "number") {
      const startText = startInput.value.trim();
      const endText = endInput.value.trim();
      if (!/^-?\d+$/.test(startText) || !/^-?\d+$/.test(endText)) {
        return { error: "請輸入有效的起始與結束整數號碼。" };
      }
      const start = Number(startText);
      const end = Number(endText);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        return { error: "號碼超出可使用範圍，請輸入安全整數。" };
      }
      if (end < start) {
        return { error: "結束號碼必須大於或等於起始號碼。" };
      }
      if (end - start + 1 > MAX_NUMBER_RANGE) {
        return { error: `號碼範圍最多為 ${MAX_NUMBER_RANGE.toLocaleString()} 位，請縮小範圍。` };
      }
      const excluded = new Set(
        excludeInput.value
          .split(/[,\uFF0C\u3001;\uFF1B\s]+/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => String(Number(value)))
      );
      const items = [];
      for (let number = start; number <= end; number += 1) {
        const label = String(number);
        items.push({ id: `number:${label}`, label, excluded: excluded.has(label) });
      }
      return { items };
    }

    const items = nameInput.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((label, index) => ({ id: `name:${index}:${label}`, label, excluded: false }));
    const excludedNames = new Set(
      excludeInput.value
        .split(/\r?\n|[,，、;；]/)
        .map((value) => value.trim())
        .filter(Boolean)
    );
    items.forEach((item) => {
      item.excluded = excludedNames.has(item.label);
    });
    return { items };
  }

  function getAvailableItems(pool, useNoRepeat) {
    return pool.items.filter((item) => !item.excluded && (!useNoRepeat || !alreadyDrawn.has(item.id)));
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function updateAvailability() {
    const pool = getPool();
    if (pool.error) {
      remainingNumber.textContent = "—";
      availableCount.classList.add("has-error");
      return;
    }
    availableCount.classList.remove("has-error");
    remainingNumber.textContent = getAvailableItems(pool, noRepeatInput.checked).length.toLocaleString();
  }

  function parseDrawCount() {
    const countText = drawCountInput.value.trim();
    if (!/^\d+$/.test(countText)) {
      return { error: "請輸入有效的抽出人數。" };
    }
    const count = Number(countText);
    if (!Number.isSafeInteger(count) || count < 1) {
      return { error: "抽出人數至少要為 1 位。" };
    }
    return { count };
  }

  function selectRandomItems(items, count) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled.slice(0, count);
  }

  function renderResults(items, animated) {
    resultValues.replaceChildren();
    items.forEach((item, index) => {
      const value = document.createElement("span");
      value.className = `result-value${animated ? " result-value-enter" : ""}`;
      value.textContent = item.label;
      value.style.setProperty("--item-index", String(index));
      resultValues.appendChild(value);
    });
    resultLabel.textContent = items.length > 1 ? "本次抽中的幸運同學" : "本次抽中的幸運同學是";
    resultCaption.textContent = items.length > 1
      ? `恭喜這 ${items.length} 位同學，準備好接受挑戰了嗎？`
      : "恭喜你！準備好接受今天的挑戰了嗎？";
    drawTitle.textContent = "幸運得主揭曉！";
    document.getElementById("result-stage").classList.add("has-result");
  }

  function renderHistory() {
    historyTotal.textContent = String(history.length);
    historyList.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "empty-history";
      empty.innerHTML = '<span class="empty-history-icon" aria-hidden="true">☷</span><p>還沒有抽籤紀錄</p><span>抽出第一位幸運同學後，紀錄會顯示在這裡。</span>';
      historyList.appendChild(empty);
      return;
    }

    history.forEach((record, index) => {
      const row = document.createElement("article");
      row.className = "history-row";
      const number = document.createElement("span");
      number.className = "history-index";
      number.textContent = String(history.length - index).padStart(2, "0");
      const winners = document.createElement("div");
      winners.className = "history-winners";
      record.labels.forEach((label) => {
        const chip = document.createElement("span");
        chip.className = "history-chip";
        chip.textContent = label;
        winners.appendChild(chip);
      });
      const time = document.createElement("time");
      time.className = "history-time";
      time.dateTime = record.date.toISOString();
      time.textContent = record.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      row.append(number, winners, time);
      historyList.appendChild(row);
    });
  }

  function startConfetti() {
    const colors = ["#f6c453", "#ff7a59", "#8ee3cf", "#a78bfa", "#ff91b8", "#73c8f2"];
    confetti = Array.from({ length: 150 }, () => ({
      x: random(width),
      y: random(-height * 0.35, height * 0.45),
      vx: random(-2.8, 2.8),
      vy: random(1.4, 5.2),
      size: random(5, 11),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.12, 0.12),
      life: random(130, 220),
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    confettiUntil = millis() + 4500;
  }

  function playRevealSound() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      audioContext = new AudioContextClass();
    }
    const startTone = () => {
      const now = audioContext.currentTime;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.025 + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + index * 0.07);
        oscillator.stop(now + 0.7);
      });
    };
    if (audioContext.state === "suspended") {
      audioContext.resume().then(startTone).catch((error) => {
        console.warn("無法播放抽籤音效。", error);
      });
    } else {
      startTone();
    }
  }

  function animateDraw(winners) {
    const pool = getPool();
    const previewPool = getAvailableItems(pool, false);
    const startedAt = Date.now();
    drawButton.disabled = true;
    drawButtonText.textContent = "幸運轉動中…";
    drawTitle.textContent = "正在抽出幸運得主…";
    document.getElementById("result-stage").classList.remove("has-result");
    resultLabel.textContent = "大家屏住呼吸";
    resultCaption.textContent = "幸運名字即將揭曉，準備好歡呼了嗎？";
    const interval = window.setInterval(() => {
      if (Date.now() - startedAt >= 2000) {
        window.clearInterval(interval);
        alreadyDrawn = new Set([...alreadyDrawn, ...winners.map((item) => item.id)]);
        renderResults(winners, true);
        history.unshift({ labels: winners.map((item) => item.label), date: new Date() });
        renderHistory();
        updateAvailability();
        startConfetti();
        playRevealSound();
        drawButton.disabled = false;
        drawButtonText.textContent = "再抽一次";
        drawing = false;
        return;
      }
      const preview = selectRandomItems(previewPool, winners.length);
      renderResults(preview, false);
      resultLabel.textContent = "大家屏住呼吸";
      resultCaption.textContent = "幸運名字即將揭曉，準備好歡呼了嗎？";
      drawTitle.textContent = "正在抽出幸運得主…";
    }, 85);
  }

  function drawWinners() {
    if (drawing) {
      return;
    }
    clearError();
    const pool = getPool();
    if (pool.error) {
      showError(pool.error);
      updateAvailability();
      return;
    }
    const requested = parseDrawCount();
    if (requested.error) {
      showError(requested.error);
      return;
    }
    const candidates = getAvailableItems(pool, noRepeatInput.checked);
    if (candidates.length === 0) {
      showError(noRepeatInput.checked
        ? "目前沒有可抽的人了，請重置紀錄、關閉不重複抽籤，或調整排除名單。"
        : "目前沒有可抽的人，請檢查名單或排除對象。");
      return;
    }
    if (requested.count > candidates.length) {
      showError(`人數不足：本次要抽 ${requested.count} 位，但目前只有 ${candidates.length} 位可抽。`);
      return;
    }
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch((error) => console.warn("無法啟用音效。", error));
    }
    drawing = true;
    animateDraw(selectRandomItems(candidates, requested.count));
  }

  function switchMode(nextMode) {
    if (drawing || mode === nextMode) {
      return;
    }
    mode = nextMode;
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelector(".number-fields").hidden = mode !== "number";
    document.querySelector(".name-fields").hidden = mode !== "name";
    document.querySelector(".exclude-hint").textContent = mode === "number"
      ? "輸入不參加的號碼，以逗號分隔。"
      : "輸入不參加的姓名，每行一位或以逗號分隔。";
    drawCountInput.value = "1";
    clearError();
    resetDrawnPool();
  }

  modeButtons.forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
  [startInput, endInput, nameInput].forEach((input) => {
    input.addEventListener("input", () => {
      clearError();
      resetDrawnPool();
      if (input === nameInput) {
        try {
          localStorage.setItem(NAME_STORAGE_KEY, nameInput.value);
        } catch (error) {
          console.warn("無法儲存名單至瀏覽器。", error);
        }
      }
    });
  });
  excludeInput.addEventListener("input", () => {
    clearError();
    updateAvailability();
  });
  noRepeatInput.addEventListener("change", () => {
    clearError();
    updateAvailability();
  });
  drawCountInput.addEventListener("input", clearError);
  document.getElementById("count-minus").addEventListener("click", () => {
    const count = Number(drawCountInput.value) || 1;
    drawCountInput.value = String(Math.max(1, count - 1));
    clearError();
  });
  document.getElementById("count-plus").addEventListener("click", () => {
    const count = Number(drawCountInput.value) || 1;
    drawCountInput.value = String(count + 1);
    clearError();
  });
  drawButton.addEventListener("click", drawWinners);
  document.getElementById("reset-button").addEventListener("click", () => {
    if (drawing) {
      return;
    }
    history = [];
    alreadyDrawn = new Set();
    clearError();
    renderHistory();
    updateAvailability();
    resultValues.innerHTML = '<span class="result-placeholder">?</span>';
    resultLabel.textContent = "幸運得主即將揭曉";
    resultCaption.textContent = "按下按鈕，看看今天的幸運同學是誰！";
    drawTitle.textContent = "準備好了嗎？";
    document.getElementById("result-stage").classList.remove("has-result");
    drawButtonText.textContent = "開始抽籤";
  });

  renderHistory();
  updateAvailability();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
