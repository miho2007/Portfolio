/**
 * <mini-me-widget> — drop-in animated pet + chat widget for Mini-Me.
 *
 * Usage:
 *   <script src="mini-me-widget.js"></script>
 *   <mini-me-widget api-base="https://mini-me-backend-ue1z.onrender.com"></mini-me-widget>
 *
 * Place the tag anywhere in your page (e.g. right before </body>). It renders
 * as a fixed full-viewport overlay internally, so one instance is enough for
 * a whole page. Works in plain HTML, React, Vue, Next.js, etc. — it's a
 * standard custom element, no framework required.
 *
 * Optional attributes:
 *   api-base   — backend URL (defaults to the value below)
 */
(() => {
  const DEFAULT_API_BASE = "https://mini-me-backend-ue1z.onrender.com";

  const TEMPLATE = /* html */ `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .mm-root { font-family: 'VT323', monospace; color: #eaeaea; }

      #pet-canvas {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        z-index: 2147483000;
      }
      #pet-hit {
        position: fixed;
        pointer-events: auto;
        cursor: pointer;
        z-index: 2147483001;
        background: transparent;
        border: none;
        padding: 0;
      }
      #pet-hint {
        position: fixed;
        pointer-events: none;
        z-index: 2147483001;
        background: #14151a;
        border: 3px solid #2e2e38;
        border-radius: 4px;
        padding: 6px 10px;
        font-size: 16px;
        color: #9fe3a8;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: 'VT323', monospace;
      }
      #pet-hint.show { opacity: 1; }
      #pet-hint::after {
        content: "";
        position: absolute;
        bottom: -8px;
        left: 22px;
        border: 6px solid transparent;
        border-top-color: #2e2e38;
      }

      #chat-panel {
        position: fixed;
        width: min(320px, 92vw);
        max-height: 380px;
        background: #14151a;
        border: 3px solid #2e2e38;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483002;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        opacity: 0;
        transform: translateY(8px) scale(0.98);
        transition: opacity 0.16s ease, transform 0.16s ease;
      }
      #chat-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
      #chat-panel:not(.open) { pointer-events: none; }
      #chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #1a1b21;
        border-bottom: 3px solid #2e2e38;
      }
      #chat-header span {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #9fe3a8;
      }
      #chat-close {
        background: none;
        border: none;
        color: #8a8f98;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 0 4px;
      }
      #chat-close:hover { color: #e07a7a; }
      #chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 80px;
        max-height: 260px;
      }
      .msg { max-width: 85%; font-size: 18px; line-height: 1.3; padding: 7px 10px; border-radius: 4px; word-wrap: break-word; }
      .msg.user { align-self: flex-end; background: #26262b; color: #eaeaea; }
      .msg.bot { align-self: flex-start; background: #16241a; color: #b9f0c2; border: 1px solid #24402a; }
      .msg.error { align-self: flex-start; background: #2a1a1a; color: #e07a7a; border: 1px solid #4a2a2a; }
      .msg.typing { align-self: flex-start; background: #16241a; border: 1px solid #24402a; color: #9fe3a8; display: flex; gap: 4px; padding: 9px 12px; }
      .msg.typing span { width: 5px; height: 5px; background: #9fe3a8; border-radius: 50%; animation: mm-bounce 1s infinite ease-in-out; }
      .msg.typing span:nth-child(2) { animation-delay: 0.15s; }
      .msg.typing span:nth-child(3) { animation-delay: 0.3s; }
      @keyframes mm-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-3px); opacity: 1; } }
      #chat-form { display: flex; gap: 6px; padding: 10px; border-top: 3px solid #2e2e38; }
      #chat-input {
        flex: 1;
        padding: 8px 10px;
        font-family: 'VT323', monospace;
        font-size: 18px;
        background: #0e0f13;
        border: 2px solid #2e2e38;
        border-radius: 4px;
        color: #eaeaea;
      }
      #chat-input:focus { outline: 2px solid #9fe3a8; }
      #chat-send {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        padding: 8px 10px;
        border: 2px solid #1a3a1e;
        border-radius: 4px;
        background: #9fe3a8;
        color: #101114;
        cursor: pointer;
      }
      #chat-send:disabled { opacity: 0.5; cursor: default; }
    </style>

    <div class="mm-root">
      <canvas id="pet-canvas"></canvas>
      <button id="pet-hit" aria-label="Chat with Mini-Me"></button>
      <div id="pet-hint">click me!</div>

      <div id="chat-panel">
        <div id="chat-header">
          <span>MINI-ME</span>
          <button id="chat-close" aria-label="Close chat">&times;</button>
        </div>
        <div id="chat-messages"></div>
        <form id="chat-form">
          <input type="text" id="chat-input" placeholder="say something..." autocomplete="off" />
          <button type="submit" id="chat-send">SEND</button>
        </form>
      </div>
    </div>
  `;

  // Paste the same base64 sprite data URI used in the standalone page here.
  // Kept as a named constant so it's easy to swap the artwork later.
  const SPRITE_SRC = window.__MINI_ME_SPRITE_SRC__ || "";

  class MiniMeWidget extends HTMLElement {
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;

      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = TEMPLATE;

      const API_BASE = this.getAttribute("api-base") || DEFAULT_API_BASE;
      this._run(API_BASE);
    }

    _run(API_BASE) {
      const root = this.shadowRoot;
      const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const canvas = root.getElementById("pet-canvas");
      const ctx = canvas.getContext("2d");
      const hitEl = root.getElementById("pet-hit");
      const hintEl = root.getElementById("pet-hint");
      const panelEl = root.getElementById("chat-panel");
      const closeBtn = root.getElementById("chat-close");
      const messagesEl = root.getElementById("chat-messages");
      const formEl = root.getElementById("chat-form");
      const inputEl = root.getElementById("chat-input");
      const sendBtn = root.getElementById("chat-send");

      if (!SPRITE_SRC) {
        console.warn(
          "[mini-me-widget] No sprite image set. Set window.__MINI_ME_SPRITE_SRC__ to your " +
          "base64 sprite data URI before this script runs, or edit SPRITE_SRC directly in mini-me-widget.js."
        );
      }

      const sprite = new Image();
      let spriteReady = false;
      sprite.onload = () => { spriteReady = true; };
      sprite.src = SPRITE_SRC;

      const SPRITE_NATIVE_W = 139;
      const SPRITE_NATIVE_H = 341;
      const DRAW_H = 150;
      const DRAW_W = Math.round(DRAW_H * (SPRITE_NATIVE_W / SPRITE_NATIVE_H));
      const SCALE = DRAW_H / SPRITE_NATIVE_H;
      const NECK_Y = 160;
      const HIP_Y = 280;
      const LEG_MID_X = 70;
      const SRC_HEAD = { sx: 0, sy: 0, sw: SPRITE_NATIVE_W, sh: NECK_Y };
      const SRC_BODY = { sx: 0, sy: NECK_Y, sw: SPRITE_NATIVE_W, sh: HIP_Y - NECK_Y };
      const SRC_LEG_L = { sx: 0, sy: HIP_Y, sw: LEG_MID_X, sh: SPRITE_NATIVE_H - HIP_Y };
      const SRC_LEG_R = { sx: LEG_MID_X, sy: HIP_Y, sw: SPRITE_NATIVE_W - LEG_MID_X, sh: SPRITE_NATIVE_H - HIP_Y };

      const GROUND_MARGIN = 18;
      const character = {
        x: 120,
        dir: 1,
        speed: REDUCED_MOTION ? 0 : 0.55,
        minX: 0,
        maxX: 0,
        engaged: false,
        thinking: false,
      };
      let FOOT_Y = 0;
      let lastDir = character.dir;
      let turnPulse = 0;
      let idleSeed = Math.random() * 1000;
      const dust = [];
      let lastStepPhase = 0;
      let mouseX = null, mouseY = null;
      let headTiltCurrent = 0;
      let newMessagePulse = 0;
      let bodyBobCurrent = 0;
      let headBobCurrent = 0;
      let nodPulse = 0;
      let lastNodAt = 0;
      let waddleCurrent = 0;
      let stretchCurrent = 0;
      let squeezeCurrent = 0;
      let headWaddleCurrent = 0;
      let flourishPulse = 0;
      let stepCounter = 0;
      const sparkles = [];

      function recomputeBounds() {
        FOOT_Y = window.innerHeight - GROUND_MARGIN;
        character.minX = DRAW_W / 2 + 12;
        character.maxX = window.innerWidth - DRAW_W / 2 - 12;
        if (character.x < character.minX) character.x = character.minX;
        if (character.x > character.maxX) character.x = character.maxX;
      }
      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
        recomputeBounds();
        if (panelEl.classList.contains("open")) positionPanel();
      }
      window.addEventListener("resize", resizeCanvas);
      window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });
      resizeCanvas();
      character.x = Math.max(character.minX, Math.min(character.maxX, 120));

      let sessionId = null;
      let sessionPromise = null;
      function ensureSession() {
        if (sessionId) return Promise.resolve(sessionId);
        if (sessionPromise) return sessionPromise;
        sessionPromise = fetch(API_BASE + "/session", { method: "POST" })
          .then((res) => res.json())
          .then((data) => { sessionId = data.session_id; return sessionId; })
          .catch(() => null);
        return sessionPromise;
      }

      const chatMessages = [];
      let hasInteracted = false;

      function addMessage(role, text) {
        const el = document.createElement("div");
        el.className = "msg " + role;
        messagesEl.appendChild(el);
        const msg = { role, text, shown: role === "bot" ? 0 : text.length, el, done: role !== "bot" };
        if (role !== "bot") el.textContent = text;
        chatMessages.push(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return msg;
      }

      function addTypingIndicator() {
        const el = document.createElement("div");
        el.className = "msg typing";
        el.innerHTML = "<span></span><span></span><span></span>";
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return el;
      }

      let typingQueue = [];
      function tickTypewriters() {
        for (let i = typingQueue.length - 1; i >= 0; i--) {
          const m = typingQueue[i];
          if (m.shown < m.text.length) {
            m.shown += 1;
            m.el.textContent = m.text.slice(0, m.shown);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          } else {
            m.done = true;
            typingQueue.splice(i, 1);
          }
        }
      }

      function positionPanel() {
        const rect = { w: Math.min(320, window.innerWidth * 0.92) };
        const headTopApprox = FOOT_Y - DRAW_H;
        let left = character.x - rect.w / 2;
        left = Math.max(10, Math.min(window.innerWidth - rect.w - 10, left));
        let bottom = window.innerHeight - headTopApprox + 14;
        bottom = Math.min(bottom, window.innerHeight - 60);
        panelEl.style.left = Math.round(left) + "px";
        panelEl.style.bottom = Math.round(bottom) + "px";
      }

      function openChat() {
        hasInteracted = true;
        hintEl.classList.remove("show");
        character.engaged = true;
        positionPanel();
        panelEl.classList.add("open");
        ensureSession();
        setTimeout(() => inputEl.focus(), 50);
      }
      function closeChat() {
        panelEl.classList.remove("open");
        character.engaged = false;
      }
      hitEl.addEventListener("click", () => {
        if (panelEl.classList.contains("open")) closeChat();
        else openChat();
      });
      closeBtn.addEventListener("click", closeChat);
      document.addEventListener("click", (e) => {
        if (!panelEl.classList.contains("open")) return;
        const path = e.composedPath ? e.composedPath() : [];
        if (path.includes(panelEl) || path.includes(hitEl)) return;
        closeChat();
      });

      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = inputEl.value.trim();
        if (!message || character.thinking) return;
        inputEl.value = "";
        sendBtn.disabled = true;
        character.thinking = true;
        addMessage("user", message);
        const typingEl = addTypingIndicator();
        try {
          await ensureSession();
          const res = await fetch(API_BASE + "/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, session_id: sessionId }),
          });
          typingEl.remove();
          if (!res.ok) {
            const errText = await res.text();
            addMessage("error", "something broke: " + errText.slice(0, 120));
          } else {
            const data = await res.json();
            const msg = addMessage("bot", data.reply || "...");
            msg.el.textContent = "";
            typingQueue.push(msg);
            newMessagePulse = 1;
          }
        } catch (err) {
          typingEl.remove();
          addMessage("error", "can't reach the backend right now.");
        } finally {
          character.thinking = false;
          sendBtn.disabled = false;
          inputEl.focus();
        }
      });

      let hintTimer = setTimeout(() => {
        if (!hasInteracted) hintEl.classList.add("show");
      }, 3500);
      setInterval(() => {
        if (hasInteracted || panelEl.classList.contains("open")) return;
        hintEl.classList.toggle("show");
      }, 6000);

      function positionHitAndHint() {
        const left = Math.round(character.x - DRAW_W / 2);
        const top = Math.round(FOOT_Y - DRAW_H - 10);
        hitEl.style.left = left + "px";
        hitEl.style.top = top + "px";
        hitEl.style.width = DRAW_W + "px";
        hitEl.style.height = (DRAW_H + 18) + "px";
        hintEl.style.left = (left + DRAW_W / 2 - hintEl.offsetWidth / 2) + "px";
        hintEl.style.top = (top - 40) + "px";
      }

      function updateTurnPulse() {
        if (character.dir !== lastDir) {
          turnPulse = 1;
          lastDir = character.dir;
        }
        turnPulse *= 0.9;
        if (turnPulse < 0.01) turnPulse = 0;
      }
      function spawnDust(footX) { dust.push({ x: footX, y: FOOT_Y, life: 1 }); }
      function updateDust() {
        for (let i = dust.length - 1; i >= 0; i--) {
          const d = dust[i];
          d.life -= 0.045;
          d.y -= 0.15;
          if (d.life <= 0) dust.splice(i, 1);
        }
      }
      function drawDust() {
        for (const d of dust) {
          ctx.globalAlpha = d.life * 0.4;
          ctx.fillStyle = "#cfd6de";
          const s = 2 + (1 - d.life) * 2;
          ctx.fillRect(Math.round(d.x - s / 2), Math.round(d.y - s / 2), s, s);
        }
        ctx.globalAlpha = 1;
      }

      function spawnSparkle(x, y) {
        for (let i = 0; i < 3; i++) {
          sparkles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 10,
            life: 1,
            vy: -0.4 - Math.random() * 0.3,
            vx: (Math.random() - 0.5) * 0.6,
          });
        }
      }
      function updateSparkles() {
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const s = sparkles[i];
          s.life -= 0.03;
          s.x += s.vx;
          s.y += s.vy;
          if (s.life <= 0) sparkles.splice(i, 1);
        }
      }
      function drawSparkles() {
        for (const s of sparkles) {
          ctx.globalAlpha = Math.max(0, s.life);
          ctx.fillStyle = "#f5e17a";
          const sz = 2 + Math.sin(s.life * Math.PI) * 2;
          ctx.fillRect(Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, sz);
        }
        ctx.globalAlpha = 1;
      }

      function drawCharacter(t) {
        const walking = character.speed > 0 && !character.engaged && !character.thinking;
        updateTurnPulse();
        if (newMessagePulse > 0) newMessagePulse *= 0.92;
        if (newMessagePulse < 0.01) newMessagePulse = 0;

        const gaitSpeed = 0.0105;
        const phase = t * gaitSpeed;
        const attentive = character.engaged || character.thinking;

        if (attentive && t - lastNodAt > 2400 + Math.sin(idleSeed) * 400) {
          lastNodAt = t;
          nodPulse = 1;
        }
        nodPulse *= 0.94;
        if (nodPulse < 0.01) nodPulse = 0;
        const nodShape = Math.sin(nodPulse * Math.PI) * nodPulse;

        flourishPulse *= 0.9;
        if (flourishPulse < 0.01) flourishPulse = 0;
        const flourishShape = Math.sin(Math.min(flourishPulse, 1) * Math.PI) * flourishPulse;

        const bodyBobTarget = walking
          ? Math.abs(Math.sin(phase)) * (4 + flourishShape * 3.5)
          : attentive
          ? Math.sin(t * 0.0025 + idleSeed) * 1 + nodShape * 1.2
          : Math.sin(t * 0.0035 + idleSeed) * 1.2;
        bodyBobCurrent += (bodyBobTarget - bodyBobCurrent) * (walking ? 0.3 : 0.08);
        const bodyBob = bodyBobCurrent;

        const waddleTarget = walking ? Math.sin(phase) * (0.11 + flourishShape * 0.05) : 0;
        waddleCurrent += (waddleTarget - waddleCurrent) * 0.3;

        const stretchTarget = walking ? Math.sin(phase * 2 + 0.3) * (0.06 + flourishShape * 0.03) : 0;
        stretchCurrent += (stretchTarget - stretchCurrent) * 0.3;

        const edgeMargin = 14;
        const approachingEdge = walking && (
          (character.dir === 1 && character.x > character.maxX - edgeMargin) ||
          (character.dir === -1 && character.x < character.minX + edgeMargin)
        );
        const squeezeTarget = approachingEdge ? 1 : 0;
        squeezeCurrent += (squeezeTarget - squeezeCurrent) * 0.35;

        const squashPulse = Math.sin(turnPulse * Math.PI) * turnPulse;
        const scaleY = 1 + stretchCurrent - squeezeCurrent * 0.14 + squashPulse * 0.1;
        const scaleX = 1 - stretchCurrent * 0.7 + squeezeCurrent * 0.1 - squashPulse * 0.06;

        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(character.x, FOOT_Y + 4, 26 + squashPulse * 6 + squeezeCurrent * 4, 6 - squashPulse * 2 + squeezeCurrent * 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.globalAlpha = 1;

        if (!spriteReady) return;

        ctx.save();
        ctx.translate(character.x, FOOT_Y);
        if (character.dir === -1) ctx.scale(-1, 1);
        ctx.rotate(waddleCurrent);
        ctx.scale(scaleX, scaleY);

        const drawX = -DRAW_W / 2;
        const bodyTopY = -DRAW_H - bodyBob;

        const legDestW_L = SRC_LEG_L.sw * SCALE;
        const legDestW_R = SRC_LEG_R.sw * SCALE;
        const legFullH = (SPRITE_NATIVE_H - HIP_Y) * SCALE;
        const hipY = bodyTopY + HIP_Y * SCALE;

        if (walking) {
          const stepL = 0.68 + 0.32 * Math.max(0, Math.sin(phase));
          const stepR = 0.68 + 0.32 * Math.max(0, Math.sin(phase + Math.PI));
          const shiftL = Math.sin(phase) * 2.5;
          const shiftR = Math.sin(phase + Math.PI) * 2.5;
          ctx.drawImage(sprite, SRC_LEG_L.sx, SRC_LEG_L.sy, SRC_LEG_L.sw, SRC_LEG_L.sh,
            drawX + shiftL, hipY, legDestW_L, legFullH * stepL);
          ctx.drawImage(sprite, SRC_LEG_R.sx, SRC_LEG_R.sy, SRC_LEG_R.sw, SRC_LEG_R.sh,
            drawX + legDestW_L + shiftR, hipY, legDestW_R, legFullH * stepR);
          const stepPhaseNow = Math.floor(phase / Math.PI);
          if (stepPhaseNow !== lastStepPhase) {
            lastStepPhase = stepPhaseNow;
            stepCounter += 1;
            const footX = character.x + (character.dir === -1 ? 12 : -12) * (stepPhaseNow % 2 === 0 ? 1 : -1);
            spawnDust(footX);
            if (Math.random() < 0.16) {
              flourishPulse = 1;
              spawnSparkle(character.x, FOOT_Y - DRAW_H - 6);
            }
          }
        } else {
          const idleShift = attentive ? 0 : Math.sin(t * 0.0015 + idleSeed) * 0.6;
          ctx.drawImage(sprite, SRC_LEG_L.sx, SRC_LEG_L.sy, SRC_LEG_L.sw, SRC_LEG_L.sh,
            drawX + idleShift, hipY, legDestW_L, legFullH);
          ctx.drawImage(sprite, SRC_LEG_R.sx, SRC_LEG_R.sy, SRC_LEG_R.sw, SRC_LEG_R.sh,
            drawX + legDestW_L - idleShift, hipY, legDestW_R, legFullH);
        }

        const bodyDestW = SRC_BODY.sw * SCALE;
        const bodyDestH_base = (HIP_Y - NECK_Y) * SCALE;
        const breathe = attentive ? 1 : 1 + (walking ? 0 : Math.sin(t * 0.003 + idleSeed) * 0.015);
        const bodyDestH = bodyDestH_base * breathe + newMessagePulse * 2;
        const neckY = bodyTopY + NECK_Y * SCALE;
        ctx.drawImage(sprite, SRC_BODY.sx, SRC_BODY.sy, SRC_BODY.sw, SRC_BODY.sh,
          drawX, neckY - (bodyDestH - bodyDestH_base), bodyDestW, bodyDestH);

        const headDestW = SRC_HEAD.sw * SCALE;
        const headDestH = NECK_Y * SCALE;
        const headBobTarget = attentive
          ? nodShape * 2.2 + newMessagePulse * 2.5
          : walking
          ? Math.sin(phase + 0.4) * (1.5 + flourishShape * 1.5)
          : 0;
        headBobCurrent += (headBobTarget - headBobCurrent) * (walking ? 0.3 : 0.15);
        const headExtraBob = headBobCurrent;
        const idleLookTarget = (!walking && !attentive && mouseX !== null)
          ? Math.max(-1, Math.min(1, (mouseX - character.x) / 320)) * 0.12
          : Math.sin(t * 0.0012 + idleSeed) * 0.05;
        headTiltCurrent += (idleLookTarget - headTiltCurrent) * 0.04;

        const headWaddleTarget = walking ? waddleCurrent * -1.6 : 0;
        headWaddleCurrent += (headWaddleTarget - headWaddleCurrent) * 0.18;

        const headY = neckY - headDestH - headExtraBob;
        const pivotX = drawX + headDestW / 2;
        const pivotY = headY + headDestH;
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(headTiltCurrent + headWaddleCurrent);
        ctx.translate(-pivotX, -pivotY);
        ctx.drawImage(sprite, SRC_HEAD.sx, SRC_HEAD.sy, SRC_HEAD.sw, SRC_HEAD.sh,
          drawX, headY, headDestW, headDestH);
        ctx.restore();

        ctx.restore();
      }

      const tick = (t) => {
        const walking = character.speed > 0 && !character.engaged && !character.thinking;
        if (walking) {
          character.x += character.speed * character.dir;
          if (character.x > character.maxX) { character.x = character.maxX; character.dir = -1; }
          if (character.x < character.minX) { character.x = character.minX; character.dir = 1; }
        }
        tickTypewriters();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const glow = ctx.createRadialGradient(character.x, FOOT_Y - 60, 10, character.x, FOOT_Y - 60, 130);
        glow.addColorStop(0, "rgba(159,227,168,0.10)");
        glow.addColorStop(1, "rgba(159,227,168,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        updateDust();
        drawDust();
        updateSparkles();
        drawSparkles();
        drawCharacter(t);
        positionHitAndHint();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  if (!customElements.get("mini-me-widget")) {
    customElements.define("mini-me-widget", MiniMeWidget);
  }
})();
