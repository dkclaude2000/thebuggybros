// One tiny game per creature — each one plays out its real signature trait.
// Canvas 2D, ~15 seconds each, one control (tap / click / space).
// Every game returns a score line that states the true fact it just taught.

const TEAL = '#38cba7', AMBER = '#f4b53f', INK = '#0d1218', PAPER = '#f7f1e0';

// ---------------------------------------------------------------- engine
export function runMiniGame(key, onDone) {
  const def = GAMES[key];
  if (!def) { onDone(null); return; }

  const wrap = document.createElement('div');
  wrap.className = 'mg-wrap';
  wrap.innerHTML = `
    <div class="mg-panel">
      <div class="mg-head">
        <div><b>${def.title}</b><i>${def.rule}</i></div>
        <button class="mg-x" aria-label="Close">✕</button>
      </div>
      <canvas class="mg-canvas"></canvas>
      <div class="mg-foot"><span class="mg-score"></span><span class="mg-fact">${def.fact}</span></div>
    </div>`;
  document.body.appendChild(wrap);

  const canvas = wrap.querySelector('.mg-canvas');
  const scoreEl = wrap.querySelector('.mg-score');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  function size() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  addEventListener('resize', size);

  const state = {
    t: 0, score: 0, done: false, best: 0,
    down: false, justPressed: false, pointer: { x: W / 2, y: H / 2 },
    W: () => W, H: () => H,
  };
  def.init(state, W, H);

  const press = (e) => {
    if (e.type === 'keydown') {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.repeat) return;
    }
    e.preventDefault?.();
    state.down = true; state.justPressed = true;
  };
  const release = (e) => {
    if (e.type === 'keyup' && e.code !== 'Space' && e.code !== 'Enter') return;
    state.down = false;
  };
  const move = (e) => {
    const r = canvas.getBoundingClientRect();
    state.pointer.x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    state.pointer.y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  };
  canvas.addEventListener('pointerdown', (e) => { move(e); press(e); });
  addEventListener('pointerup', release);
  canvas.addEventListener('pointermove', move);
  addEventListener('keydown', press);
  addEventListener('keyup', release);

  let raf = 0, last = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    def.update(state, dt, W, H);
    ctx.clearRect(0, 0, W, H);
    def.draw(ctx, state, W, H);
    scoreEl.textContent = def.scoreText(state);
    state.justPressed = false;
    if (state.done) finish();
  }
  raf = requestAnimationFrame(loop);

  function finish() {
    cancelAnimationFrame(raf);
    const result = { key, score: state.score, line: def.result(state) };
    const done = document.createElement('div');
    done.className = 'mg-done';
    done.innerHTML = `
      <b>${def.resultTitle ? def.resultTitle(state) : 'Nice!'}</b>
      <p>${result.line}</p>
      <div class="mg-btns">
        <button class="mg-again">Play again</button>
        <button class="mg-back">Back to the meadow</button>
      </div>`;
    wrap.querySelector('.mg-panel').appendChild(done);
    done.querySelector('.mg-again').onclick = () => { close(); runMiniGame(key, onDone); };
    done.querySelector('.mg-back').onclick = () => { close(); onDone(result); };
  }
  function close() {
    cancelAnimationFrame(raf);
    removeEventListener('resize', size);
    removeEventListener('keydown', press);
    removeEventListener('keyup', release);
    removeEventListener('pointerup', release);
    wrap.remove();
  }
  wrap.querySelector('.mg-x').onclick = () => { close(); onDone(null); };
}

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function bg(ctx, W, H, top = '#bfe3f5', bot = '#7cbf4e') {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function timeBar(ctx, state, W, limit) {
  const k = clamp(state.t / limit, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, W, 6);
  ctx.fillStyle = AMBER; ctx.fillRect(0, 0, W * (1 - k), 6);
}
// simple bug body helper
function bugBody(ctx, x, y, r, color, legs = 6, t = 0) {
  ctx.strokeStyle = 'rgba(30,25,20,.85)'; ctx.lineWidth = 2;
  for (let i = 0; i < legs; i++) {
    const a = Math.PI * (0.25 + (i % (legs / 2)) * 0.5 / (legs / 2 - 1 || 1)) * (i < legs / 2 ? 1 : -1);
    const wig = Math.sin(t * 10 + i) * 0.15;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a + wig) * r * 1.7, y + Math.sin(a + wig) * r * 1.3);
    ctx.stroke();
  }
  circle(ctx, x, y, r, color);
}

// ---------------------------------------------------------------- the games
const GAMES = {

  // 🐞 ladybug — eats 5,000 aphids
  ladybug: {
    title: '🐞 Aphid Feast',
    rule: 'Move to eat the green aphids',
    fact: 'One ladybug eats about 5,000 aphids in its life.',
    init(s, W, H) {
      s.x = W / 2; s.y = H / 2;
      s.aphids = Array.from({ length: 14 }, (_, i) => ({
        x: 40 + ((i * 97) % (W - 80)), y: 40 + ((i * 61) % (H - 80)),
        vx: (i % 3 - 1) * 22, vy: (i % 5 - 2) * 18, alive: true,
      }));
      s.limit = 18;
    },
    update(s, dt, W, H) {
      const dx = s.pointer.x - s.x, dy = s.pointer.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) { s.x += dx / d * Math.min(d, 300 * dt); s.y += dy / d * Math.min(d, 300 * dt); }
      for (const a of s.aphids) {
        if (!a.alive) continue;
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < 16 || a.x > W - 16) a.vx *= -1;
        if (a.y < 16 || a.y > H - 16) a.vy *= -1;
        if (Math.hypot(a.x - s.x, a.y - s.y) < 26) { a.alive = false; s.score++; }
      }
      if (s.aphids.every(a => !a.alive)) {
        for (const a of s.aphids) { a.alive = true; a.x = 30 + Math.abs((a.x * 7 + s.t * 130) % (W - 60)); }
      }
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#dff0d0', '#8fce5f');
      for (const a of s.aphids) if (a.alive) {
        circle(ctx, a.x, a.y, 7, '#9ee37d');
        circle(ctx, a.x + 2, a.y - 2, 2, '#e9ffe0');
      }
      bugBody(ctx, s.x, s.y, 15, '#d6382c', 6, s.t);
      circle(ctx, s.x - 6, s.y - 5, 3.2, '#241d18');
      circle(ctx, s.x + 6, s.y + 4, 3.2, '#241d18');
      circle(ctx, s.x, s.y - 12, 7, '#241d18');
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score} aphids · ${Math.max(0, (s.limit - s.t)).toFixed(0)}s`,
    resultTitle: (s) => s.score >= 24 ? 'Garden hero!' : 'Good munching!',
    result: (s) => `You ate ${s.score} aphids. A real ladybug eats about 5,000 in a lifetime — that's ${Math.max(1, Math.round(5000 / Math.max(1, s.score)))}× more than you just did.`,
  },

  // ✨ firefly — flash the right rhythm
  firefly: {
    title: '✨ Flash Back',
    rule: 'Watch the pattern, then tap it back',
    fact: 'Fireflies find each other by flashing a species-specific rhythm.',
    init(s, W, H) {
      s.round = 1; s.pattern = []; s.idx = 0; s.phase = 'show'; s.showI = 0; s.showT = 0; s.glow = 0;
      s.mk = () => { s.pattern = Array.from({ length: 1 + s.round }, (_, i) => 0.28 + ((i * 7 + s.round * 3) % 3) * 0.22); };
      s.mk();
    },
    update(s, dt, W, H) {
      s.glow = Math.max(0, s.glow - dt * 3.5);
      if (s.phase === 'show') {
        s.showT += dt;
        const gap = s.pattern[s.showI] ?? 0.3;
        if (s.showT > gap) { s.showT = 0; s.glow = 1; s.showI++; if (s.showI > s.pattern.length) { s.phase = 'play'; s.idx = 0; s.lastTap = s.t; } }
      } else if (s.phase === 'play') {
        if (s.justPressed) {
          const want = s.pattern[s.idx] ?? 0.3;
          const got = s.t - (s.lastTap ?? s.t);
          s.glow = 1; s.lastTap = s.t;
          if (s.idx === 0 || Math.abs(got - want) < 0.24) {
            s.idx++;
            if (s.idx > s.pattern.length) { s.score = s.round; s.round++; s.mk(); s.phase = 'show'; s.showI = 0; s.showT = 0; }
          } else { s.done = true; }
        }
        if (s.t - (s.lastTap ?? 0) > 2.4 && s.idx > 0) s.done = true;
      }
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#2b2a4a', '#14203a');
      for (let i = 0; i < 26; i++) circle(ctx, (i * 83) % W, (i * 47) % H, 1.2, 'rgba(255,255,255,.35)');
      const cx = W / 2, cy = H / 2;
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
      g.addColorStop(0, `rgba(255,240,180,${0.9 * s.glow})`);
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 100, cy - 100, 200, 200);
      ctx.restore();
      circle(ctx, cx, cy, 16, '#35302a');
      circle(ctx, cx, cy + 14, 9, `rgba(255,225,130,${0.35 + 0.65 * s.glow})`);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '600 15px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.phase === 'show' ? 'watch…' : 'tap it back', cx, H - 26);
    },
    scoreText: (s) => `pattern ${s.round} · ${s.pattern.length} flashes`,
    resultTitle: (s) => s.score >= 3 ? 'Perfect signal!' : 'Nice try!',
    result: (s) => `You matched ${s.score} pattern${s.score === 1 ? '' : 's'}. Real fireflies must flash their exact species rhythm — get it wrong and nobody answers.`,
  },

  // 🪁 dragonfly — catches 95% of what it chases
  dragonfly: {
    title: '🪁 Ace Hunter',
    rule: 'Steer to catch the midges',
    fact: 'Dragonflies catch about 95% of the prey they chase.',
    init(s, W, H) {
      s.x = W / 2; s.y = H / 2; s.vx = 0; s.vy = 0; s.tries = 0; s.limit = 20;
      s.prey = { x: W * 0.7, y: H * 0.4, vx: 90, vy: 60 };
      s.trail = [];
    },
    update(s, dt, W, H) {
      const dx = s.pointer.x - s.x, dy = s.pointer.y - s.y;
      s.vx += dx * 5.5 * dt; s.vy += dy * 5.5 * dt;
      s.vx *= 0.92; s.vy *= 0.92;
      s.x = clamp(s.x + s.vx * dt, 12, W - 12); s.y = clamp(s.y + s.vy * dt, 12, H - 12);
      s.trail.push({ x: s.x, y: s.y }); if (s.trail.length > 14) s.trail.shift();
      const p = s.prey;
      // prey jinks away
      const away = Math.atan2(p.y - s.y, p.x - s.x);
      p.vx += Math.cos(away) * 120 * dt + Math.sin(s.t * 3.1) * 40 * dt;
      p.vy += Math.sin(away) * 120 * dt + Math.cos(s.t * 2.3) * 40 * dt;
      const sp = Math.hypot(p.vx, p.vy), cap = 190;
      if (sp > cap) { p.vx = p.vx / sp * cap; p.vy = p.vy / sp * cap; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 14 || p.x > W - 14) { p.vx *= -1; p.x = clamp(p.x, 14, W - 14); }
      if (p.y < 14 || p.y > H - 14) { p.vy *= -1; p.y = clamp(p.y, 14, H - 14); }
      if (Math.hypot(p.x - s.x, p.y - s.y) < 20) {
        s.score++; s.tries++;
        p.x = 20 + ((s.score * 137) % (W - 40)); p.y = 20 + ((s.score * 91) % (H - 40));
        p.vx = 90; p.vy = -70;
      }
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#cfe9f7', '#a8dcc0');
      ctx.strokeStyle = 'rgba(46,155,181,.28)'; ctx.lineWidth = 3;
      ctx.beginPath();
      s.trail.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.stroke();
      circle(ctx, s.prey.x, s.prey.y, 6, '#5b4a3a');
      // dragonfly
      const ang = Math.atan2(s.vy, s.vx);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(223,246,255,.75)';
      const wf = Math.sin(s.t * 40) * 6;
      ctx.fillRect(-4, -22 + wf * 0.2, 8, 20); ctx.fillRect(-4, 2 - wf * 0.2, 8, 20);
      ctx.fillStyle = '#2e9bb5';
      ctx.fillRect(-26, -3.5, 46, 7);
      circle(ctx, 20, 0, 7, '#2e9bb5');
      circle(ctx, 23, -3, 2.4, '#174f42'); circle(ctx, 23, 3, 2.4, '#174f42');
      ctx.restore();
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score} caught · ${Math.max(0, s.limit - s.t).toFixed(0)}s`,
    resultTitle: (s) => s.score >= 8 ? 'Ace hunter!' : 'Good chase!',
    result: (s) => `You caught ${s.score}. A real dragonfly lands about 95 out of every 100 chases — the best hunting record of any animal.`,
  },

  // 🐝 bumblebee — buzz pollination
  bee: {
    title: '🐝 Buzz the Pollen',
    rule: 'Hold to buzz — shake the pollen loose',
    fact: 'Bumblebees vibrate their muscles to shake pollen out of flowers.',
    init(s, W, H) {
      s.flowers = [0, 1, 2].map((i) => ({ x: W * (0.24 + i * 0.26), y: H * 0.62, pollen: 1, done: false }));
      s.i = 0; s.buzz = 0; s.limit = 20;
    },
    update(s, dt, W, H) {
      const f = s.flowers[s.i];
      if (!f) { s.done = true; return; }
      s.buzz = s.down ? Math.min(1, s.buzz + dt * 1.35) : Math.max(0, s.buzz - dt * 1.9);
      if (s.buzz > 0.55) {
        f.pollen -= dt * (s.buzz - 0.5) * 1.5;
        if (f.pollen <= 0) { f.done = true; s.score++; s.i++; s.buzz = 0; }
      }
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#e7f3d8', '#9fd06a');
      s.flowers.forEach((f, i) => {
        ctx.strokeStyle = '#5f9c3f'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(f.x, H); ctx.lineTo(f.x, f.y); ctx.stroke();
        for (let p = 0; p < 7; p++) {
          const a = (p / 7) * Math.PI * 2;
          circle(ctx, f.x + Math.cos(a) * 22, f.y + Math.sin(a) * 22, 13, f.done ? '#d7c9de' : '#e58cc0');
        }
        circle(ctx, f.x, f.y, 14, f.done ? '#cfc3b0' : `rgba(244,181,63,${0.35 + 0.65 * f.pollen})`);
      });
      const f = s.flowers[s.i];
      if (f) {
        const shake = s.buzz * 5;
        const bx = f.x + Math.sin(s.t * 60) * shake, by = f.y - 34 + Math.cos(s.t * 55) * shake;
        ctx.fillStyle = 'rgba(232,244,248,.7)';
        ctx.fillRect(bx - 16, by - 10, 12, 7); ctx.fillRect(bx + 4, by - 10, 12, 7);
        circle(ctx, bx, by, 12, '#f2c23e');
        ctx.fillStyle = '#2b241d';
        ctx.fillRect(bx - 12, by - 4, 24, 4); ctx.fillRect(bx - 10, by + 4, 20, 4);
        if (s.buzz > 0.55) for (let i = 0; i < 6; i++) {
          circle(ctx, f.x + Math.sin(s.t * 12 + i) * 26, f.y - 10 - ((s.t * 60 + i * 14) % 44), 3, AMBER);
        }
      }
      ctx.fillStyle = 'rgba(20,40,20,.6)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.down ? 'BZZZZZ' : 'hold to buzz', W / 2, 30);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score}/3 flowers`,
    resultTitle: (s) => s.score === 3 ? 'Every flower pollinated!' : 'Keep buzzing!',
    result: (s) => `You emptied ${s.score} of 3 flowers. Some flowers only release pollen when a bee buzzes at exactly the right pitch — honeybees can't do it, bumblebees can.`,
  },

  // 🦋 butterfly — tastes with its feet
  butterfly: {
    title: '🦋 Taste With Your Feet',
    rule: 'Land only on the milkweed',
    fact: 'A butterfly tastes a leaf by standing on it.',
    init(s, W, H) {
      s.leaves = Array.from({ length: 5 }, (_, i) => ({
        x: (i + 0.5) * (W / 5), y: H * (0.45 + (i % 2) * 0.2), good: i % 2 === 0, tasted: false,
      }));
      s.x = W / 2; s.y = 40; s.limit = 22; s.msg = '';
    },
    update(s, dt, W, H) {
      s.x += (s.pointer.x - s.x) * Math.min(1, dt * 6);
      s.y += (s.pointer.y - s.y) * Math.min(1, dt * 6);
      if (s.justPressed) {
        let hit = null;
        for (const l of s.leaves) if (!l.tasted && Math.hypot(l.x - s.x, l.y - s.y) < 40) hit = l;
        if (hit) {
          hit.tasted = true;
          if (hit.good) { s.score++; s.msg = 'milkweed! eggs go here'; }
          else { s.msg = 'bitter — wrong plant'; s.score = Math.max(0, s.score - 1); }
        }
      }
      if (s.leaves.every(l => l.tasted) || s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#dff0f7', '#a6d489');
      for (const l of s.leaves) {
        ctx.save(); ctx.translate(l.x, l.y);
        ctx.fillStyle = l.tasted ? (l.good ? '#7fbf4a' : '#8a8471') : '#63a844';
        ctx.beginPath(); ctx.ellipse(0, 0, 34, 20, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(30,60,20,.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-28, 8); ctx.lineTo(28, -8); ctx.stroke();
        if (l.tasted) {
          ctx.fillStyle = l.good ? '#1f8a70' : '#b5563e';
          ctx.font = '700 18px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(l.good ? '✓' : '✕', 0, 6);
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(s.x, s.y);
      const flap = Math.abs(Math.sin(s.t * 6));
      ctx.fillStyle = '#e8862c';
      ctx.beginPath(); ctx.ellipse(-13 * flap - 4, -4, 15 * flap + 3, 13, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(13 * flap + 4, -4, 15 * flap + 3, 13, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#241a12'; ctx.fillRect(-2, -12, 4, 24);
      ctx.restore();
      ctx.fillStyle = 'rgba(20,40,20,.65)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.msg || 'tap to land and taste', W / 2, 30);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score} milkweed found`,
    resultTitle: (s) => s.score >= 3 ? 'Perfect taste!' : 'Keep tasting!',
    result: (s) => `You found ${s.score} milkweed leaves. Monarch caterpillars eat only milkweed, so the mother tastes every leaf with her feet before laying an egg.`,
  },

  // 🪲 beetle — 1 in 4 animal species
  beetle: {
    title: '🪲 One in Four',
    rule: 'Tap only the beetles',
    fact: 'About one in every four animal species is a beetle.',
    init(s, W, H) {
      s.items = []; s.spawn = 0; s.miss = 0; s.limit = 20;
    },
    update(s, dt, W, H) {
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = 0.42;
        const isBeetle = ((s.items.length * 7 + Math.floor(s.t * 3)) % 4) === 0;
        s.items.push({ x: 24 + ((s.items.length * 113) % (W - 48)), y: -20, isBeetle, hit: false,
          vy: 68 + ((s.items.length * 13) % 40) });
      }
      for (const it of s.items) {
        it.y += it.vy * dt;
        if (s.justPressed && !it.hit && Math.hypot(it.x - s.pointer.x, it.y - s.pointer.y) < 26) {
          it.hit = true;
          if (it.isBeetle) s.score++; else { s.miss++; }
        }
      }
      s.items = s.items.filter(it => it.y < H + 30 && !it.hit);
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#efe6d0', '#c9b88e');
      for (const it of s.items) {
        if (it.isBeetle) {
          bugBody(ctx, it.x, it.y, 13, '#28354d', 6, s.t);
          ctx.strokeStyle = '#101827'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(it.x, it.y - 12); ctx.lineTo(it.x, it.y + 12); ctx.stroke();
        } else {
          // not-a-beetle: a fly-ish thing
          circle(ctx, it.x, it.y, 10, '#7a6a55');
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath(); ctx.ellipse(it.x - 10, it.y - 5, 9, 5, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(it.x + 10, it.y - 5, 9, 5, 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(40,30,20,.6)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('hard shell down the middle = beetle', W / 2, 28);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score} beetles · ${s.miss} wrong`,
    resultTitle: (s) => s.miss === 0 ? 'Sharp eye!' : 'Good sorting!',
    result: (s) => `${s.score} beetles spotted, ${s.miss} mistakes. Scientists have named about 400,000 beetle species — roughly a quarter of all known animals.`,
  },

  // 🎻 cricket — sings by rubbing wings
  cricket: {
    title: '🎻 Chirp in Time',
    rule: 'Tap on the beat',
    fact: 'Crickets sing by rubbing their wings — and hear through their knees.',
    init(s, W, H) { s.bpm = 108; s.next = 1.2; s.hits = 0; s.total = 0; s.flash = 0; s.limit = 20; s.judge = ''; },
    update(s, dt, W, H) {
      const beat = 60 / s.bpm;
      s.flash = Math.max(0, s.flash - dt * 4);
      if (s.t > s.next) { s.next += beat; s.total++; s.flash = 1; }
      if (s.justPressed) {
        const off = Math.abs(s.t - (s.next - beat));
        const off2 = Math.abs(s.t - s.next);
        const best = Math.min(off, off2);
        if (best < 0.13) { s.hits++; s.score = s.hits; s.judge = best < 0.06 ? 'perfect!' : 'good'; }
        else s.judge = 'off-beat';
      }
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#243a2c', '#16251c');
      const cx = W / 2, cy = H / 2;
      const wing = s.flash * 10;
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = '#6b5a35';
      ctx.beginPath(); ctx.ellipse(0, 0, 46, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a4a28';
      ctx.beginPath(); ctx.ellipse(-6 - wing * 0.4, -8, 34, 12, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6 + wing * 0.4, -8, 34, 12, 0.1, 0, Math.PI * 2); ctx.fill();
      circle(ctx, 44, -4, 13, '#6b5a35');
      ctx.strokeStyle = '#4a3d22'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(52, -8); ctx.lineTo(96, -30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(52, -2); ctx.lineTo(98, -6); ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const a = s.flash - i * 0.22;
        if (a > 0) { ctx.strokeStyle = `rgba(56,203,167,${a * 0.6})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, 60 + i * 26 + (1 - a) * 40, 0, Math.PI * 2); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(238,242,243,.85)';
      ctx.font = '700 20px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.judge, cx, H - 34);
      ctx.font = '600 13px "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(238,242,243,.5)';
      ctx.fillText('tap when the rings pulse', cx, 30);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.hits}/${s.total} on beat`,
    resultTitle: (s) => s.hits >= 12 ? 'A proper cricket!' : 'Keep the rhythm!',
    result: (s) => `You hit ${s.hits} of ${s.total} beats. Real crickets chirp faster when it's warmer — you can estimate the temperature by counting their chirps.`,
  },

  // 🐜 ant — carries many times its weight
  ant: {
    title: '🐜 Heavy Lifter',
    rule: 'Tap fast to carry the crumb home',
    fact: 'An ant can carry many times its own body weight.',
    init(s, W, H) { s.pos = 0; s.load = 1; s.limit = 20; s.trips = 0; },
    update(s, dt, W, H) {
      if (s.justPressed) s.pos += 0.055 / (0.6 + s.load * 0.25);
      s.pos -= dt * 0.045;
      s.pos = clamp(s.pos, 0, 1);
      if (s.pos >= 1) { s.trips++; s.score = s.trips; s.load++; s.pos = 0; }
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#e9dcc4', '#c2a878');
      ctx.fillStyle = '#8a6a45'; ctx.fillRect(0, H * 0.66, W, 6);
      // nest
      ctx.fillStyle = '#5c4126';
      ctx.beginPath(); ctx.moveTo(W - 70, H * 0.66); ctx.lineTo(W - 20, H * 0.66); ctx.lineTo(W - 45, H * 0.66 - 44); ctx.fill();
      const x = 30 + s.pos * (W - 110), y = H * 0.66 - 12;
      // crumb stack
      for (let i = 0; i < s.load; i++) circle(ctx, x, y - 16 - i * 11, 9, '#e9d9a8');
      bugBody(ctx, x, y, 9, '#6e3b24', 6, s.t * (s.justPressed ? 2 : 1));
      circle(ctx, x + 9, y - 3, 6, '#6e3b24');
      ctx.fillStyle = 'rgba(60,40,20,.65)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`carrying ${s.load}× — tap tap tap!`, W / 2, 28);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.trips} loads · ${s.load}× weight`,
    resultTitle: (s) => s.trips >= 4 ? 'Colony MVP!' : 'Good hauling!',
    result: (s) => `You hauled ${s.trips} loads, up to ${s.load}× your weight. Real ants routinely carry 10–50× their own body weight — some species far more.`,
  },

  // 🦗 grasshopper — jumps 20× body length
  grasshopper: {
    title: '🦗 Twenty Lengths',
    rule: 'Hold to coil, release to leap',
    fact: 'A grasshopper leaps about 20× its own body length.',
    init(s, W, H) { s.charge = 0; s.x = 40; s.y = H * 0.72; s.vy = 0; s.vx = 0; s.air = false; s.best = 0; s.jumps = 0; },
    update(s, dt, W, H) {
      const ground = H * 0.72;
      if (!s.air) {
        if (s.down) s.charge = Math.min(1, s.charge + dt * 0.85);
        else if (s.charge > 0.05) {
          s.vx = 150 + s.charge * 470; s.vy = -(190 + s.charge * 330);
          s.air = true; s.startX = s.x; s.charge = 0; s.jumps++;
        }
      } else {
        s.vy += 780 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y >= ground) {
          s.y = ground; s.air = false; s.vy = 0; s.vx = 0;
          const lengths = Math.round((s.x - s.startX) / 38);
          s.best = Math.max(s.best, lengths); s.score = s.best;
          if (s.x > W - 60) s.x = 40;
        }
      }
      if (s.jumps >= 5 && !s.air) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#dff0f7', '#9fd06a');
      const ground = H * 0.72;
      ctx.fillStyle = '#5f9c3f'; ctx.fillRect(0, ground + 10, W, H - ground);
      for (let i = 0; i < 26; i++) {
        const gx = (i * 47 + 12) % W;
        ctx.strokeStyle = '#6db14a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(gx, ground + 12); ctx.lineTo(gx + Math.sin(s.t + i) * 5, ground - 22); ctx.stroke();
      }
      ctx.save(); ctx.translate(s.x, s.y);
      const squash = 1 - s.charge * 0.35;
      ctx.scale(1 + s.charge * 0.25, squash);
      ctx.fillStyle = '#71a83c';
      ctx.beginPath(); ctx.ellipse(0, -12, 22, 11, -0.15, 0, Math.PI * 2); ctx.fill();
      circle(ctx, 20, -16, 9, '#71a83c');
      circle(ctx, 23, -18, 3, '#3d2e1e');
      ctx.strokeStyle = '#557a2c'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-20, -26 + s.charge * 12); ctx.lineTo(-6, -2); ctx.stroke();
      ctx.restore();
      // charge meter
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(W / 2 - 60, 22, 120, 9);
      ctx.fillStyle = AMBER; ctx.fillRect(W / 2 - 60, 22, 120 * s.charge, 9);
      ctx.fillStyle = 'rgba(20,40,20,.7)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.air ? '…' : (s.down ? 'coiling…' : 'hold to coil'), W / 2, 16);
      timeBar(ctx, { t: s.jumps }, W, 5);
    },
    scoreText: (s) => `best ${s.best}× body length · jump ${Math.min(s.jumps + 1, 5)}/5`,
    resultTitle: (s) => s.best >= 20 ? 'A real grasshopper leap!' : 'Good spring!',
    result: (s) => `Your best was ${s.best}× your body length. Real grasshoppers manage about 20× — the same as you jumping the length of a school bus.`,
  },

  // 🥎 pill bug — rolls into a ball
  pillbug: {
    title: '🥎 Roll Up',
    rule: 'Tap to curl when something passes',
    fact: 'A pill bug rolls into a perfect ball for armor — it’s a crustacean, not an insect.',
    init(s, W, H) { s.curl = 0; s.threats = []; s.spawn = 1; s.hits = 0; s.limit = 22; },
    update(s, dt, W, H) {
      s.curl = s.down ? Math.min(1, s.curl + dt * 5) : Math.max(0, s.curl - dt * 2.6);
      s.spawn -= dt;
      if (s.spawn <= 0) { s.spawn = 1.15; s.threats.push({ x: -30, y: H * 0.6, v: 150 + (s.threats.length % 3) * 45, scored: false }); }
      for (const th of s.threats) {
        th.x += th.v * dt;
        if (!th.scored && Math.abs(th.x - W / 2) < 26) {
          th.scored = true;
          if (s.curl > 0.7) s.score++; else s.hits++;
        }
      }
      s.threats = s.threats.filter(th => th.x < W + 40);
      if (s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#d9cfc0', '#a09383');
      ctx.fillStyle = '#6b4f35'; ctx.fillRect(0, H * 0.6 + 16, W, H);
      for (const th of s.threats) {
        // a passing boot/bird shadow
        ctx.fillStyle = 'rgba(20,15,10,.35)';
        ctx.beginPath(); ctx.ellipse(th.x, H * 0.6 + 18, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
        circle(ctx, th.x, th.y - 26, 13, '#4a4038');
      }
      const cx = W / 2, cy = H * 0.6;
      if (s.curl > 0.6) {
        circle(ctx, cx, cy, 20, '#7d8289');
        for (let i = -2; i <= 2; i++) {
          ctx.strokeStyle = '#63686f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, 20, i * 0.4 - 0.2, i * 0.4 + 0.2); ctx.stroke();
        }
      } else {
        for (let i = 0; i < 7; i++) {
          const w = 20 - Math.abs(i - 3) * 2;
          ctx.fillStyle = i % 2 ? '#7d8289' : '#888d94';
          ctx.fillRect(cx - 26 + i * 7.5, cy - w / 2, 7, w);
        }
        bugBody(ctx, cx - 30, cy, 4, '#666b73', 6, s.t);
      }
      ctx.fillStyle = 'rgba(30,25,20,.62)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.curl > 0.6 ? 'safe!' : 'hold to curl up', cx, 28);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score} safe · ${s.hits} caught out`,
    resultTitle: (s) => s.hits === 0 ? 'Perfect armor!' : 'Good curling!',
    result: (s) => `Safe ${s.score} times. Pill bugs breathe through gills and roll up to keep from drying out — they're land crustaceans, closer to crabs than to insects.`,
  },

  // 🕴️ daddy longlegs — long legs, no venom
  longlegs: {
    title: '🕴️ Long Legs',
    rule: 'Alternate taps to step across',
    fact: 'Daddy longlegs have no venom and no silk — they’re not spiders.',
    init(s, W, H) { s.pos = 0; s.side = 0; s.steps = 0; s.limit = 20; s.wobble = 0; },
    update(s, dt, W, H) {
      if (s.justPressed) {
        const zone = s.pointer.x < s.W() / 2 ? 0 : 1;
        if (zone === s.side) { s.pos += 0.055; s.steps++; s.side = 1 - s.side; s.wobble = 0.35; }
        else s.wobble = 1;
      }
      s.wobble = Math.max(0, s.wobble - dt * 1.2);
      s.score = Math.round(s.pos * 100);
      if (s.pos >= 1 || s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#e3ecd7', '#8fae74');
      const x = 40 + s.pos * (W - 90), y = H * 0.42;
      ctx.strokeStyle = '#54402c'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.sin(s.t * 3 + i) * 0.12 + s.wobble * Math.sin(i * 3) * 0.4;
        const len = 62 + (i % 3) * 14;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.35 - 26,
          x + Math.cos(a) * len, H * 0.72);
        ctx.stroke();
      }
      circle(ctx, x, y, 13, '#8a6a4a');
      circle(ctx, x - 4, y - 3, 2.4, '#241d18'); circle(ctx, x + 4, y - 3, 2.4, '#241d18');
      ctx.fillStyle = '#5f7d4a'; ctx.fillRect(0, H * 0.72, W, H);
      // step zones
      ctx.fillStyle = s.side === 0 ? 'rgba(244,181,63,.3)' : 'rgba(255,255,255,.08)';
      ctx.fillRect(0, H - 54, W / 2 - 3, 54);
      ctx.fillStyle = s.side === 1 ? 'rgba(244,181,63,.3)' : 'rgba(255,255,255,.08)';
      ctx.fillRect(W / 2 + 3, H - 54, W / 2, 54);
      ctx.fillStyle = 'rgba(30,40,25,.75)';
      ctx.font = '700 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('LEFT', W / 4, H - 22); ctx.fillText('RIGHT', W * 0.75, H - 22);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score}% across · ${s.steps} steps`,
    resultTitle: (s) => s.score >= 100 ? 'All the way across!' : 'Good stepping!',
    result: (s) => `You crossed ${s.score}% in ${s.steps} steps. The "most venomous spider" story about daddy longlegs is a myth — they have no venom glands and no fangs at all.`,
  },

  // 🕸️ spider — spins a fresh web
  spider: {
    title: '🕸️ Spin the Web',
    rule: 'Trace the spiral without lifting',
    fact: 'Many orb weavers eat their old web and spin a fresh one every night.',
    init(s, W, H) {
      s.k = 0; s.breaks = 0; s.limit = 26;
      s.cx = W / 2; s.cy = H / 2; s.R = Math.min(W, H) * 0.38;
    },
    update(s, dt, W, H) {
      const turns = 3.4;
      const a = s.k * turns * Math.PI * 2;
      const r = 16 + s.k * (s.R - 16);
      const tx = s.cx + Math.cos(a) * r, ty = s.cy + Math.sin(a) * r;
      if (s.down) {
        const d = Math.hypot(s.pointer.x - tx, s.pointer.y - ty);
        if (d < 42) s.k = Math.min(1, s.k + dt * 0.13);
        else if (d > 90) { s.breaks += dt; }
      }
      s.score = Math.round(s.k * 100);
      if (s.k >= 1 || s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#1b2a34', '#12202a');
      ctx.strokeStyle = 'rgba(247,247,238,.28)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(s.cx, s.cy);
        ctx.lineTo(s.cx + Math.cos(a) * s.R, s.cy + Math.sin(a) * s.R); ctx.stroke();
      }
      // drawn spiral so far
      ctx.strokeStyle = TEAL; ctx.lineWidth = 2.4;
      ctx.beginPath();
      const turns = 3.4, N = 160;
      for (let i = 0; i <= N * s.k; i++) {
        const v = i / N, a = v * turns * Math.PI * 2, r = 16 + v * (s.R - 16);
        const px = s.cx + Math.cos(a) * r, py = s.cy + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      // target
      const a = s.k * turns * Math.PI * 2, r = 16 + s.k * (s.R - 16);
      const tx = s.cx + Math.cos(a) * r, ty = s.cy + Math.sin(a) * r;
      circle(ctx, tx, ty, 11, s.down ? AMBER : 'rgba(244,181,63,.5)');
      // spider follows the tip
      ctx.strokeStyle = '#38293e'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const la = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(la) * 15, ty + Math.sin(la) * 13); ctx.stroke();
      }
      circle(ctx, tx, ty, 7, '#4a3b52');
      ctx.fillStyle = 'rgba(238,242,243,.55)';
      ctx.font = '600 13px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('hold and follow the amber dot', W / 2, 26);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `web ${s.score}% spun`,
    resultTitle: (s) => s.score >= 100 ? 'A perfect orb!' : 'Nice silk work!',
    result: (s) => `You spun ${s.score}% of the web. A real orb weaver rebuilds the whole thing in under an hour — often eating the old silk to recycle it.`,
  },

  // 🐛 caterpillar — eats 100× its weight
  caterpillar: {
    title: '🐛 Eat 100×',
    rule: 'Inch along and eat every leaf',
    fact: 'A caterpillar can grow 100× heavier before it transforms.',
    init(s, W, H) {
      s.pos = 0; s.size = 1; s.leaves = Array.from({ length: 8 }, (_, i) => ({ at: (i + 1) / 9, eaten: false }));
      s.limit = 22; s.stretch = 0;
    },
    update(s, dt, W, H) {
      s.stretch = s.down ? Math.min(1, s.stretch + dt * 3.4) : Math.max(0, s.stretch - dt * 3.4);
      if (!s.down && s.stretch > 0.85) { s.pos = Math.min(1, s.pos + 0.055); }
      if (s.down && s.stretch >= 1) { /* hold at full stretch */ }
      for (const l of s.leaves) {
        if (!l.eaten && Math.abs(l.at - s.pos) < 0.035) { l.eaten = true; s.size += 0.42; s.score++; }
      }
      if (s.leaves.every(l => l.eaten) || s.t > s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#e7f3d8', '#a6d489');
      const y = H * 0.6;
      ctx.strokeStyle = '#6b4f35'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(20, y + 22); ctx.lineTo(W - 20, y + 22); ctx.stroke();
      for (const l of s.leaves) {
        const lx = 20 + l.at * (W - 40);
        if (!l.eaten) {
          ctx.fillStyle = '#63a844';
          ctx.beginPath(); ctx.ellipse(lx, y + 4, 17, 11, -0.4, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(90,70,40,.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(lx, y + 4, 8, 0, Math.PI * 1.5); ctx.stroke();
        }
      }
      const hx = 20 + s.pos * (W - 40);
      const seg = 7, sc = 1 + s.size * 0.22;
      for (let i = 0; i < seg; i++) {
        const back = i * (9 + s.stretch * 7) * (sc * 0.5);
        const arch = Math.sin((i / (seg - 1)) * Math.PI) * (1 - s.stretch) * 13;
        circle(ctx, hx - back, y + 8 - arch, (6.5 - Math.abs(i - 3) * 0.4) * sc, i % 2 ? '#9ec93f' : '#86b532');
      }
      circle(ctx, hx + 3, y + 4, 3, '#2a241f');
      ctx.fillStyle = 'rgba(30,50,20,.68)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.down ? 'stretch…' : 'hold, then release to inch', W / 2, 28);
      timeBar(ctx, s, W, s.limit);
    },
    scoreText: (s) => `${s.score}/8 leaves · ${Math.round(s.size * 100) / 100}× bigger`,
    resultTitle: (s) => s.score >= 8 ? 'Ready to transform!' : 'Keep munching!',
    result: (s) => `You ate ${s.score} leaves and grew ${Math.round(s.size * 10) / 10}×. A real caterpillar can put on 100× its hatching weight — then rebuild itself entirely inside the chrysalis.`,
  },

  // 🙏 praying mantis — the fastest strike
  mantis: {
    title: '🙏 The Strike',
    rule: 'Tap the instant the fly is in reach',
    fact: 'A mantis strike takes about 1/20th of a second.',
    init(s, W, H) { s.round = 0; s.state = 'wait'; s.wait = 1 + (s.t % 1); s.flyX = -40; s.rt = 0; s.times = []; s.limit = 5; },
    update(s, dt, W, H) {
      if (s.state === 'wait') {
        s.wait -= dt;
        if (s.wait <= 0) { s.state = 'incoming'; s.flyX = -40; }
        if (s.justPressed) { s.state = 'wait'; s.wait = 1.2; s.early = true; }
      } else if (s.state === 'incoming') {
        s.flyX += 210 * dt;
        const inReach = Math.abs(s.flyX - W * 0.55) < 55;
        if (s.justPressed) {
          if (inReach) { s.times.push(Math.abs(s.flyX - W * 0.55)); s.score++; }
          s.round++; s.state = 'wait'; s.wait = 0.9 + (s.round % 3) * 0.35;
        } else if (s.flyX > W + 40) { s.round++; s.state = 'wait'; s.wait = 0.9; }
      }
      if (s.round >= s.limit) s.done = true;
    },
    draw(ctx, s, W, H) {
      bg(ctx, W, H, '#dbeccf', '#84b45f');
      const gy = H * 0.72;
      ctx.fillStyle = '#5f9c3f'; ctx.fillRect(0, gy + 18, W, H);
      // mantis
      const mx = W * 0.62, my = gy;
      ctx.strokeStyle = '#679c3c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 16, my + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 12, my + 18); ctx.stroke();
      ctx.fillStyle = '#7fbf4a';
      ctx.beginPath(); ctx.ellipse(mx + 6, my - 26, 12, 26, 0.25, 0, Math.PI * 2); ctx.fill();
      // raptorial arms — snap out on strike
      const striking = s.justPressed && s.state === 'incoming';
      ctx.strokeStyle = '#6aa83e'; ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(mx - 2, my - 40);
      ctx.lineTo(mx - (striking ? 46 : 18), my - (striking ? 44 : 30));
      ctx.stroke();
      circle(ctx, mx - 2, my - 58, 11, '#7fbf4a');
      circle(ctx, mx - 8, my - 62, 3.4, '#1a1a12'); circle(ctx, mx + 4, my - 62, 3.4, '#1a1a12');
      // fly
      if (s.state === 'incoming') {
        circle(ctx, s.flyX, my - 52, 7, '#4a4038');
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.ellipse(s.flyX - 7, my - 58, 8, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      // reach zone
      ctx.strokeStyle = 'rgba(244,181,63,.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.strokeRect(W * 0.55 - 55, my - 88, 110, 74); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(20,40,20,.7)';
      ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.state === 'wait' ? 'wait… stay still' : 'NOW!', W / 2, 28);
      timeBar(ctx, { t: s.round }, W, s.limit);
    },
    scoreText: (s) => `${s.score}/${s.limit} strikes`,
    resultTitle: (s) => s.score >= 4 ? 'Lightning reflexes!' : 'Good hunting!',
    result: (s) => `You landed ${s.score} of ${s.limit} strikes. A mantis snaps its forelegs shut in about 50 milliseconds — faster than you can blink.`,
  },
};

export const MINIGAME_KEYS = Object.keys(GAMES);
export const MINIGAME_TITLES = Object.fromEntries(Object.entries(GAMES).map(([k, g]) => [k, g.title]));
