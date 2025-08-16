# Florida Casino — Online Prototype (v2.2)

A 4‑player team card game (North/South vs East/West) played in the browser. This prototype implements your **Florida Casino** rules with AI opponents, building/locking, sweeps (with skip‑turn penalty), and round scoring.

> This is a fan‑made digital prototype for testing rules. Share privately with friends or host via GitHub Pages.

---

## ✨ Features
- **Single human vs 3 AIs** (partner is North). AI waits ~**3 seconds** between turns and shows “thinking…”
- **Add/Subtract builds** with lock rules and “must act next turn” enforcement
- **Sweeps** (+1 point) and automatic **skip‑turn** penalty for multi‑card sweeps
- **Scoring & round summary** (Aces, 10♦, 2♠, Most Spades, Most Cards, 35+/40+ bonuses, all face cards, Sweeps)
- **Last capture rule** (leftover cards go to last‑capturing team)
- **Larger cards** with **felt** or **wood** table themes, size slider, optional sound cues
- **Hint log** shows helpful suggestions on your turn
- **New Round** button appears when the round ends

---

## 📂 What’s in this folder
- `index.html` — the game UI
- `style.css` — table/board styling, card sizing, themes (felt/wood)
- `script.js` — game logic, AI, rules, animations
- `rules.html` — concise, printable rules sheet

> If you only want a single file, ask for the “single‑file build” and use just `index.html`.

---

## ▶️ Run locally
1. Download all four files to one folder.
2. Double‑click **`index.html`** to open it in your browser.
3. (Optional) On iPhone/iPad, tap once anywhere to enable sound.

Supported browsers: current Chrome, Edge, Firefox, Safari.

---

## 🚀 Publish with GitHub Pages
1. Create a **public repository** on GitHub (e.g., `florida-casino`).
2. Click **Add file → Upload files** and drag in: `index.html`, `style.css`, `script.js`, `rules.html`.
3. Commit the changes.
4. Go to **Settings → Pages → Build and deployment**.
   - Source: **Deploy from a branch**
   - Branch: **main** and **/** (root)
5. GitHub will give you a Pages URL (e.g., `https://yourname.github.io/florida-casino`).

**Updating later:** Re‑upload the files (same names) and commit. Force refresh your site (Ctrl/Cmd+Shift+R).

---

## 🕹️ How to play (quick refresher)
- Partners sit across (NS vs EW). Deal a 52‑card deck.
- **Flop 4 face‑up** to the center. Replace any **A, 2, or 10**; if the flop shows any **sum‑to‑10**, replace one card until no sum‑10 remains. Then each player gets **12 cards**.
- On your turn you may **Capture**, **Build** (add *or* subtract with your played card; result 1–10 and you must hold that value), **Lock** a build (same value; you must still hold another of that value), or **Trail** a card.
- Face cards (J/Q/K) have no pip value; they capture only matching ranks.
- Only the card you play from your hand may subtract; table cards/builds may **add**, not subtract.
- **Sweep**: if you clear the table in a turn, +1 point. If you used more than one card to do it, you must **skip** that many upcoming turns.
- **End of round**: last capture takes any leftover table cards.
- **Scoring**: Aces +1 each; 10♦ +1; 2♠ +2; Most Spades +1; Most Cards +3 (not if tied 26–26); 35+ cards +1; 40+ cards +1 more; all 12 face cards +1; each Sweep +1.
- First team to **25+ points** wins (both over 25 in the same round → higher total wins; still tied → tie‑breaker round).

For the full printable sheet, open **`rules.html`**.

---

## 🔧 Controls in the top bar
- **Size** — enlarge or shrink all cards/controls
- **Theme** — felt or wood table
- **Sound** — toggle sound effects
- **Rules** — opens the printable rules
- **Hints** — show helpful suggestions during your turn
- **New Round** — appears after scoring

**In your hand:** click a card to see context actions (Capture choices, Build options, Lock, Trail, or attempt a 2‑card sweep).

---

## 🤖 AI notes
- AI prioritizes largest captures, legal locks, and sensible builds.
- AI respects **locked‑build must‑act** and standard sweep/last‑capture rules.
- AI currently does not plan multi‑card sweeps; the human UI offers a two‑card sweep helper.

---

## 🧪 Troubleshooting
- **Nothing happens / old version shows:** hard refresh your page (**Ctrl/Cmd+Shift+R**).
- **Sounds don’t play (iOS):** tap once anywhere to unlock audio.
- **GitHub Pages not updating:** confirm “Deploy from branch → main → / (root)” in **Settings → Pages** and check the Pages build log under the repo’s **Actions** tab.

---

## 📄 License
- Code: **MIT** — you can redistribute and modify. (Change this if you prefer another license.)
- Game rules & name: your creation; please keep appropriate attribution in the footer.

---

## 🗒️ Changelog
**v2.2**
- Slower AI with ~3s “thinking” delay
- Larger cards + size slider
- Felt/wood table themes
- Animated fly‑to‑capture & play
- Add/subtract builds, build locking, must‑act enforcement
- Sweep with skip‑turn penalty
- Round summary with breakdown & card reveal
- Hints toggle
