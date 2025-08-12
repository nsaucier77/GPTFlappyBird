import React, { useEffect, useRef, useState } from "react";

// Single-file Flappy Bird clone
// Controls: Space / ArrowUp / Click / Tap to flap. Press R to restart.
// Features: score, best score (localStorage), pause, responsive canvas, clean UI.

export default function FlappyBird() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gameStartedRef = useRef(false);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);

  // Game state stored in refs to avoid excessive re-renders
  const birdYRef = useRef(0);
  const birdVYRef = useRef(0);
  const pipesRef = useRef([]);
  const scoreRef = useRef(0);
  const passedPipeIndexRef = useRef(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    const v = Number(localStorage.getItem("flappy_best") || 0);
    return Number.isFinite(v) ? v : 0;
  });
  const [showHelp, setShowHelp] = useState(true);

  // Config
  const cfg = useRef({
    w: 360,
    h: 640,
    groundH: 80,
    gravity: 1800, // px/s^2
    jump: -420, // px/s
    pipeGap: 160,
    pipeW: 70,
    pipeSpeed: 150, // px/s
    spawnEvery: 1400, // ms
    birdX: 90,
    birdR: 14,
  });

  // Helpers
  function resetGame() {
    const { h } = cfg.current;
    birdYRef.current = h / 2;
    birdVYRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    passedPipeIndexRef.current = 0;
    lastSpawnRef.current = 0;
    lastTimeRef.current = 0;
    gameOverRef.current = false;
    gameStartedRef.current = false;
  }

  function flap() {

    if (!gameStartedRef.current) {
      gameStartedRef.current = true;
      pausedRef.current = false;
      setShowHelp(false);
    }
    if (gameOverRef.current) return; // ignore flaps on game over
    birdVYRef.current = cfg.current.jump;
  }
  // Handle taps/clicks anywhere in the wrapper/overlay
  const handlePointer = () => {
    flap();
    if (!rafRef.current && !pausedRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
  };



  function togglePause() {

    if (!gameStartedRef.current || gameOverRef.current) return;
    pausedRef.current = !pausedRef.current;
    if (!pausedRef.current) {
      // Reset timing refs so we don't jump in time
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  function spawnPipe(canvasH) {
    const { pipeGap } = cfg.current;
    const minTop = 60;
    const maxTop = canvasH - cfg.current.groundH - pipeGap - 60;
    const topH = minTop + Math.random() * (maxTop - minTop);
    pipesRef.current.push({ x: cfg.current.w + 40, topH });
  }

  function collides(bx, by, r, pipe) {
    const { pipeW, pipeGap, groundH, h } = cfg.current;
    // Pipe rects
    const topRect = { x: pipe.x, y: 0, w: pipeW, h: pipe.topH };
    const bottomRect = {
      x: pipe.x,
      y: pipe.topH + pipeGap,
      w: pipeW,
      h: h - groundH - (pipe.topH + pipeGap),
    };

    // Circle-rect collision
    function circleRect(cx, cy, cr, rx, ry, rw, rh) {
      const nx = Math.max(rx, Math.min(cx, rx + rw));
      const ny = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - nx;
      const dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

    return (
      circleRect(bx, by, r, topRect.x, topRect.y, topRect.w, topRect.h) ||
      circleRect(
        bx,
        by,
        r,
        bottomRect.x,
        bottomRect.y,
        bottomRect.w,
        bottomRect.h
      )
    );
  }

  function draw(ctx, dt) {
    const c = ctx.canvas;
    const { w, h, groundH, birdX, birdR, pipeW, pipeGap } = cfg.current;

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#87CEEB"); // sky blue
    g.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    // Move/update
    if (gameStartedRef.current && !pausedRef.current && !gameOverRef.current) {
      // Bird physics
      birdVYRef.current += cfg.current.gravity * dt;
      birdYRef.current += birdVYRef.current * dt;

      // Pipes movement
      for (const p of pipesRef.current) p.x -= cfg.current.pipeSpeed * dt;

      // Spawn pipes
      lastSpawnRef.current += dt * 1000;
      if (lastSpawnRef.current >= cfg.current.spawnEvery) {
        lastSpawnRef.current = 0;
        spawnPipe(h);
      }

      // Remove off-screen pipes & update score
      while (pipesRef.current.length && pipesRef.current[0].x + pipeW < 0) {
        pipesRef.current.shift();
        passedPipeIndexRef.current = Math.max(0, passedPipeIndexRef.current - 1);
      }

      // Scoring: count passing each first pipe once
      if (pipesRef.current.length) {
        const first = pipesRef.current[0];
        if (
          cfg.current.birdX > first.x + pipeW &&
          passedPipeIndexRef.current === 0
        ) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          passedPipeIndexRef.current = 1; // ensure we don't double count until this pipe leaves
        }
        if (first.x + pipeW < birdX - birdR) {
          passedPipeIndexRef.current = 0;
        }
      }

      // Collisions: with ground/ceiling
      if (
        birdYRef.current + birdR >= h - groundH ||
        birdYRef.current - birdR <= 0
      ) {
        gameOverRef.current = true;
      }
      // Collisions: with pipes
      for (const p of pipesRef.current) {
        if (collides(birdX, birdYRef.current, birdR, p)) {
          gameOverRef.current = true;
          break;
        }
      }

      if (gameOverRef.current) {
        // Update best
        if (scoreRef.current > best) {
          setBest(scoreRef.current);
          localStorage.setItem("flappy_best", String(scoreRef.current));
        }
      }
    }

    // Draw pipes
    ctx.fillStyle = "#5FB548"; // green
    for (const p of pipesRef.current) {
      // top pipe
      ctx.fillRect(p.x, 0, pipeW, p.topH);
      // bottom pipe
      ctx.fillRect(p.x, p.topH + pipeGap, pipeW, h - groundH - (p.topH + pipeGap));
      // pipe lips
      ctx.fillRect(p.x - 4, p.topH - 14, pipeW + 8, 14);
      ctx.fillRect(p.x - 4, p.topH + pipeGap, pipeW + 8, 14);
    }

    // Ground
    ctx.fillStyle = "#E4C580"; // sand
    ctx.fillRect(0, h - groundH, w, groundH);
    // simple grass strip
    ctx.fillStyle = "#8DD36A";
    ctx.fillRect(0, h - groundH, w, 10);

    // Bird (simple circle with beak/eye)
    const by = birdYRef.current;
    ctx.save();
    ctx.translate(birdX, by);
    const tilt = Math.max(-0.6, Math.min(0.6, birdVYRef.current / 500));
    ctx.rotate(tilt);
    // body
    ctx.fillStyle = "#FFD166"; // yellow
    ctx.beginPath();
    ctx.arc(0, 0, birdR, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.fillStyle = "#F26D21";
    ctx.beginPath();
    ctx.moveTo(birdR - 2, 2);
    ctx.lineTo(birdR + 8, 6);
    ctx.lineTo(birdR - 2, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Score
    ctx.font = "bold 28px ui-sans-serif, system-ui, -apple-system";
    ctx.textAlign = "center";
    ctx.fillStyle = "#1f2937"; // gray-800
    ctx.fillText(`${scoreRef.current}`, w / 2, 48);
  }

  function loop(ts) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const { w, h } = cfg.current;
    // Resize canvas for DPR once per frame in case of zoom
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (pausedRef.current) return; // stop drawing while paused

    // Delta time
    let dt = 0;
    if (lastTimeRef.current) dt = Math.min(0.033, (ts - lastTimeRef.current) / 1000); // cap dt
    lastTimeRef.current = ts;

    draw(ctx, dt);

    if (!gameOverRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // Draw game over text overlay directly on canvas for crispness
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 32px ui-sans-serif, system-ui";
      ctx.fillText("Game Over", w / 2, h / 2 - 10);
      ctx.font = "600 18px ui-sans-serif, system-ui";
      ctx.fillText("Press R or click Restart", w / 2, h / 2 + 22);
      ctx.restore();
    }
  }

  // Input handlers
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
        if (!rafRef.current && !pausedRef.current) rafRef.current = requestAnimationFrame(loop);
      } else if (e.code === "KeyP") {
        togglePause();
      } else if (e.code === "KeyR") {
        resetGame();
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    window.addEventListener("keydown", onKey);

    resetGame();
    // Draw first frame
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = () => {
    resetGame();
    rafRef.current = requestAnimationFrame(loop);
  };

  // Minimal inlined styles to mimic a clean card around the canvas
  const hudBtn = {
    padding: "6px 10px",
    fontSize: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
    cursor: "pointer",
  };

  return (
    <div style={{position:'relative'}} onPointerDown={handlePointer}>
      {/* Canvas container */}
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 16,
          boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
          outline: "1px solid rgba(0,0,0,0.08)",
          background: "white",
          touchAction: "none"
        }}
        aria-label="Flappy Bird Canvas"
      />

      {/* Top HUD */}
      <div style={{position:'absolute', left:0, right:0, top:8, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px'}}>
        <div style={{fontSize:12, background:'rgba(255,255,255,0.75)', padding:'4px 8px', borderRadius:12, boxShadow:'0 1px 2px rgba(0,0,0,0.08)'}}>Best: {best}</div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={restart} style={hudBtn}>Restart (R)</button>
          <button onClick={togglePause} style={hudBtn}>{pausedRef.current ? "Resume (P)" : "Pause (P)"}</button>
        </div>
      </div>

      {/* Help overlay */}
      {showHelp && (
        <div onPointerDown={handlePointer} style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24}}>
          <div style={{background:'rgba(255,255,255,0.85)', backdropFilter:'blur(4px)', borderRadius:16, boxShadow:'0 10px 25px rgba(0,0,0,0.12)', padding:16, maxWidth:'85%'}}>
            <h1 style={{fontSize:18, fontWeight:800, margin:'0 0 6px'}}>Flappy Bird</h1>
            <p style={{fontSize:13, color:'#334155', margin:0}}>
              Tap / Click or press <kbd style={{padding:'2px 6px', background:'#e2e8f0', borderRadius:6}}>Space</kbd> to flap.
              Avoid the pipes, don’t hit the ground. Press <kbd style={{padding:'2px 6px', background:'#e2e8f0', borderRadius:6}}>P</kbd> to pause.
            </p>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{position:'absolute', left:0, right:0, bottom:-28, textAlign:'center', color:'#475569', fontSize:12, userSelect:'none'}}>
        Score: <span style={{fontWeight:600}}>{score}</span>
      </div>
    </div>
  );
}
