import React from "react";
import {
  hasMochiMeadowBlock,
  playableGameAnchorId,
  removeLocalGamesForShare,
  splitPlayableGameBlocks,
} from "./playable-game-contract.js";

export { hasMochiMeadowBlock, playableGameAnchorId, removeLocalGamesForShare, splitPlayableGameBlocks };

const ROUND_MS = 30_000;
const TICK_MS = 80;

export const PLAYABLE_GAME_CSS = `
.vfx-mochi-game { margin:26px 0 30px; padding:clamp(16px,3vw,24px); overflow:hidden; border:1px solid color-mix(in srgb,var(--chunk-accent) 40%,#e9dce5); border-radius:22px; color:#30243a; background:radial-gradient(ellipse at 15% 0,#fff8d9 0,transparent 44%),linear-gradient(145deg,#fff8ed,#f4eaff 58%,#e8f8ec); box-shadow:0 18px 42px #160b1618; }
.vfx-mochi-game:focus-visible { outline:3px solid var(--chunk-accent); outline-offset:4px; }
.vfx-mochi-heading { display:flex; align-items:center; justify-content:space-between; gap:14px; }.vfx-mochi-heading h3 { margin:4px 0 0; color:#382745; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(25px,3vw,34px); font-weight:650; letter-spacing:-.03em; }.vfx-mochi-eyebrow { color:#805b7e; font-size:10px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }.vfx-mochi-mascot { display:grid; width:48px; height:48px; place-items:center; border:1px solid #ffffffc9; border-radius:17px; background:#ffffff9c; font-size:27px; }
.vfx-mochi-instructions { max-width:62ch; margin:12px 0 17px; color:#5e5261; font-size:13px; line-height:1.55; }
.vfx-mochi-stats { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 14px; margin-bottom:10px; color:#6d5a71; font-size:11px; }.vfx-mochi-stats span { display:flex; align-items:center; gap:5px; }.vfx-mochi-stats strong { color:#36213e; font-size:14px; font-variant-numeric:tabular-nums; }
.vfx-mochi-board { position:relative; height:clamp(190px,30vw,250px); overflow:hidden; border:1px solid #ffffffc9; border-radius:17px; background:linear-gradient(180deg,#bcecf0 0%,#e3f4f4 61%,#d7efcd 100%); box-shadow:inset 0 2px 12px #3d70831b; isolation:isolate; }
.vfx-mochi-cloud { position:absolute; z-index:0; opacity:.62; font-size:27px; }.vfx-mochi-cloud-one { top:13px; left:14%; }.vfx-mochi-cloud-two { top:31px; right:15%; font-size:21px; }
.vfx-mochi-drop { position:absolute; z-index:2; transform:translate(-50%,-50%); font-size:clamp(20px,3vw,27px); line-height:1; filter:drop-shadow(0 3px 3px #526b7540); will-change:top; }.vfx-mochi-drop.is-rain { font-size:23px; }.vfx-mochi-drop.is-sparkle { font-size:22px; }
.vfx-mochi-basket { position:absolute; z-index:3; bottom:15%; transform:translateX(-50%); font-size:clamp(29px,4vw,36px); line-height:1; filter:drop-shadow(0 4px 3px #4f665344); transition:left 90ms ease-out; }
.vfx-mochi-ground { position:absolute; z-index:1; right:0; bottom:0; left:0; height:10%; border-top:1px solid #aacb8e; background:linear-gradient(180deg,#b9dc9c,#9dca81); }
.vfx-mochi-message { min-height:22px; margin:12px 0 9px; color:#514058; font-size:12px; font-weight:680; text-align:center; }
.vfx-mochi-controls { display:grid; grid-template-columns:54px minmax(0,1fr) 54px; align-items:center; gap:10px; }.vfx-mochi-controls button { min-height:44px; padding:0 12px; border:1px solid #d7c7dc; border-radius:13px; color:#4b3655; background:#ffffffb8; font:700 17px/1 Inter,"SF Pro Display","Helvetica Neue",sans-serif; cursor:pointer; touch-action:manipulation; }.vfx-mochi-controls button:hover { border-color:#a579a8; background:#fff; }.vfx-mochi-controls .vfx-mochi-start { color:#fff; border-color:#855b89; background:#855b89; font-size:13px; }.vfx-mochi-controls>span { color:#735d78; font-size:11px; font-weight:750; text-align:center; }
.vfx-mochi-footnote { margin:12px 0 0; color:#887b8d; font-size:10px; line-height:1.45; text-align:center; }
.vfx-shell .vfx-mochi-game { color:#30243a; }.vfx-shell[data-palette="paper"] .vfx-mochi-game,.vfx-shell[data-palette="forest"] .vfx-mochi-game,.vfx-shell[data-palette="ocean"] .vfx-mochi-game { color:#30243a; }
@media(max-width:560px) { .vfx-mochi-game { margin:22px 0; padding:15px; border-radius:17px; }.vfx-mochi-stats { justify-content:flex-start; column-gap:14px; }.vfx-mochi-controls { grid-template-columns:48px minmax(0,1fr) 48px; gap:7px; }.vfx-mochi-controls button { min-height:46px; padding:0 7px; } }
@media(prefers-reduced-motion:reduce) { .vfx-mochi-basket { transition:none; } }
`;

function createIdleRound() {
  return Object.freeze({
    phase: "ready",
    score: 0,
    hearts: 3,
    secondsLeft: 30,
    basket: 50,
    drops: Object.freeze([]),
    spawnElapsed: 0,
    startedAt: 0,
  });
}

function MochiMeadow({ anchorId, onStart }) {
  const [round, setRound] = React.useState(createIdleRound);
  const [best, setBest] = React.useState(0);
  const nextDropId = React.useRef(0);

  React.useEffect(() => {
    if (round.phase !== "playing") return undefined;
    const timer = window.setInterval(() => {
      setRound((current) => {
        if (current.phase !== "playing") return current;
        const elapsed = Date.now() - current.startedAt;
        const secondsLeft = Math.max(0, Math.ceil((ROUND_MS - elapsed) / 1000));
        const fallSpeed = 22 + current.score * 0.45;
        let score = current.score;
        let hearts = current.hearts;
        let drops = [];
        for (const drop of current.drops) {
          const top = drop.top + fallSpeed * TICK_MS / 1000;
          if (top >= 82 && Math.abs(drop.left - current.basket) <= 13) {
            if (drop.kind === "rain") hearts = Math.max(0, hearts - 1);
            else score += drop.kind === "sparkle" ? 3 : 1;
          } else if (top <= 103) {
            drops.push({ ...drop, top });
          }
        }

        let spawnElapsed = current.spawnElapsed + TICK_MS;
        const spawnDelay = Math.max(460, 780 - score * 12);
        if (spawnElapsed >= spawnDelay) {
          spawnElapsed -= spawnDelay;
          const roll = Math.random();
          const kind = roll < 0.23 ? "rain" : roll > 0.91 ? "sparkle" : "mochi";
          drops.push({
            id: ++nextDropId.current,
            kind,
            left: 9 + Math.random() * 82,
            top: -7,
          });
        }

        const phase = secondsLeft === 0 || hearts === 0 ? "finished" : "playing";
        return Object.freeze({ ...current, phase, score, hearts, secondsLeft, drops: Object.freeze(drops), spawnElapsed });
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [round.phase]);

  React.useEffect(() => {
    if (round.phase === "finished") setBest((previous) => Math.max(previous, round.score));
  }, [round.phase]);

  const move = (direction) => {
    setRound((current) => Object.freeze({
      ...current,
      basket: Math.max(11, Math.min(89, current.basket + direction * 11)),
    }));
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      move(1);
    }
  };
  const start = () => {
    onStart?.();
    setRound(Object.freeze({
      phase: "playing",
      score: 0,
      hearts: 3,
      secondsLeft: 30,
      basket: 50,
      drops: Object.freeze([]),
      spawnElapsed: 0,
      startedAt: Date.now(),
    }));
  };

  let message = "Catch mochi; let the raindrops fall past.";
  if (round.phase === "ready") message = "Move with ← → or A / D. Three drops of rain end the round.";
  if (round.phase === "finished") message = round.hearts === 0
    ? `A rainy finish, and ${round.score} ${round.score === 1 ? "treat" : "treats"} caught. Fancy one more round?`
    : `The meadow is yours: ${round.score} ${round.score === 1 ? "treat" : "treats"} caught. Fancy one more round?`;

  return (
    <section
      id={anchorId}
      className="vfx-mochi-game"
      aria-labelledby={`${anchorId}-title`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <header className="vfx-mochi-heading">
        <div><span className="vfx-mochi-eyebrow">A tiny playable break</span><h3 id={`${anchorId}-title`}>Mochi Meadow</h3></div>
        <span className="vfx-mochi-mascot" aria-hidden="true">🍡</span>
      </header>
      <p className="vfx-mochi-instructions">Catch the falling mochi in your basket. Dodge the rain and see how many treats you can gather in 30 seconds.</p>
      <div className="vfx-mochi-stats" aria-label="Game score">
        <span>Score <strong aria-live="polite" aria-atomic="true">{round.score}</strong></span>
        <span>Time <strong>{round.secondsLeft}s</strong></span>
        <span>Rain left <strong>{"♥".repeat(round.hearts)}{"♡".repeat(3 - round.hearts)}</strong></span>
        <span>Best <strong>{best}</strong></span>
      </div>
      <div className="vfx-mochi-board" role="group" aria-label="Mochi Meadow play area">
        <span className="vfx-mochi-cloud vfx-mochi-cloud-one" aria-hidden="true">☁️</span>
        <span className="vfx-mochi-cloud vfx-mochi-cloud-two" aria-hidden="true">☁️</span>
        {round.drops.map((drop) => (
          <span
            key={drop.id}
            className={`vfx-mochi-drop is-${drop.kind}`}
            style={{ left: `${drop.left}%`, top: `${drop.top}%` }}
            aria-hidden="true"
          >{drop.kind === "rain" ? "💧" : drop.kind === "sparkle" ? "✨🍡" : "🍡"}</span>
        ))}
        <span className="vfx-mochi-basket" style={{ left: `${round.basket}%` }} aria-hidden="true">🧺</span>
        <span className="vfx-mochi-ground" aria-hidden="true" />
      </div>
      <p className="vfx-mochi-message" role="status" aria-live="polite">{message}</p>
      <div className="vfx-mochi-controls" aria-label="Game controls">
        <button type="button" aria-label="Move basket left" onClick={() => move(-1)}>←</button>
        {round.phase === "playing" ? <span>Catch gently</span> : <button type="button" className="vfx-mochi-start" onClick={start}>{round.phase === "ready" ? "Start a 30-second round" : "Play again"}</button>}
        <button type="button" aria-label="Move basket right" onClick={() => move(1)}>→</button>
      </div>
      <p className="vfx-mochi-footnote">No sign-in or outside leaderboard. Your best stays on this card while it is open.</p>
    </section>
  );
}

export function PlayableGame({ gameId, anchorId, onStart }) {
  if (gameId !== "mochi-meadow") return null;
  return <MochiMeadow anchorId={anchorId} onStart={onStart} />;
}
