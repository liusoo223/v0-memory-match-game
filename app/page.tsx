"use client"

import { useEffect, useMemo, useRef, useState } from "react"

// 같은 그림 찾기 (Memory Match) — React 단일 파일
// ✅ 추가: 최고 기록(최단 시간) 저장/표시 (localStorage)
// ✅ 추가: 카드 테마 선택(과일, 동물, 음식) — 이모지 풀 변경

// 카드 테마별 이모지 풀
const THEMES = {
  fruits: [
    "🍎",
    "🍌",
    "🍇",
    "🍉",
    "🍊",
    "🍓",
    "🍒",
    "🍑",
    "🥝",
    "🍍",
    "🥑",
    "🍋",
    "🥭",
    "🍈",
    "🫐",
    "🥥",
    "🍅",
    "🌶️",
    "🥕",
    "🌽",
  ],
  animals: [
    "🐶",
    "🐱",
    "🐭",
    "🐼",
    "🐵",
    "🦊",
    "🐸",
    "🦄",
    "🐙",
    "🐥",
    "🐯",
    "🦁",
    "🐨",
    "🦓",
    "🦒",
    "🐷",
    "🐰",
    "🐻",
    "🐹",
    "🐢",
  ],
  foods: [
    "🍚",
    "🍙",
    "🍘",
    "🍜",
    "🍝",
    "🌮",
    "🌯",
    "🥗",
    "🥪",
    "🍰",
    "🧁",
    "🍮",
    "🍭",
    "🍫",
    "🍿",
    "🧇",
    "🥞",
    "🥟",
    "🍱",
    "🍛",
    "🍔",
    "🍕",
    "🍟",
    "🍣",
    "🍩",
    "🍪",
    "🥨",
  ],
}

// 난이도 프리셋
const PRESETS = {
  easy: { rows: 4, cols: 4 }, // 16 = 8쌍
  hard: { rows: 6, cols: 6 }, // 36 = 18쌍
}

function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickEmojis(pool, pairCount) {
  const shuffled = shuffle(pool)
  return shuffled.slice(0, pairCount)
}

function generateDeck(rows, cols, pool) {
  const total = rows * cols
  if (total % 2 !== 0) throw new Error("카드 수는 짝수여야 합니다.")
  const pairCount = total / 2
  const selected = pickEmojis(pool, pairCount)
  const deck = shuffle(
    selected.flatMap((emoji, idx) => [
      { id: `${idx}-a`, value: emoji, matched: false },
      { id: `${idx}-b`, value: emoji, matched: false },
    ]),
  )
  return deck
}

// localStorage key 유틸 — 난이도/테마별 별도 저장
const bestTimeKey = (level, theme) => `memorymatch.besttime.${level}.${theme}`

export default function MemoryMatchGame() {
  const [level, setLevel] = useState("easy")
  const [theme, setTheme] = useState("fruits") // fruits | animals | foods
  const { rows, cols } = PRESETS[level]

  // 게임 상태
  const [deck, setDeck] = useState(() => generateDeck(rows, cols, THEMES[theme]))
  const [flipped, setFlipped] = useState([]) // 현재 뒤집힌 카드 id 배열 (최대 2)
  const [locked, setLocked] = useState(false) // 비교 중 입력 잠금
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [won, setWon] = useState(false)
  const [bestTime, setBestTime] = useState(() => loadBestTime(level, theme))

  const timerRef = useRef(null)

  // 난이도/테마 변경 시 새 덱 & 베스트타임 반영
  useEffect(() => {
    resetGame(level, theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, theme])

  // 타이머
  useEffect(() => {
    if (started && !won) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [started, won])

  // 승리 판정 및 베스트타임 저장
  useEffect(() => {
    if (deck.length && deck.every((c) => c.matched)) {
      setWon(true)
      setStarted(false)
      // 베스트타임 갱신
      setBestTime((prev) => {
        const next = prev == null ? seconds : Math.min(prev, seconds)
        if (prev == null || seconds < prev) {
          try {
            localStorage.setItem(bestTimeKey(level, theme), String(next))
          } catch (_) {}
        }
        return next
      })
    }
  }, [deck])

  function resetGame(nextLevel = level, nextTheme = theme) {
    const { rows, cols } = PRESETS[nextLevel]
    setDeck(generateDeck(rows, cols, THEMES[nextTheme]))
    setFlipped([])
    setLocked(false)
    setMoves(0)
    setSeconds(0)
    setStarted(false)
    setWon(false)
    setBestTime(loadBestTime(nextLevel, nextTheme))
  }

  function handleCardClick(cardId) {
    if (locked) return
    const card = deck.find((c) => c.id === cardId)
    if (!card || card.matched) return

    if (flipped.includes(cardId)) return // 이미 뒤집힌 카드면 무시
    if (!started) setStarted(true)

    const nextFlipped = [...flipped, cardId]
    setFlipped(nextFlipped)

    if (nextFlipped.length === 2) {
      setLocked(true)
      setMoves((m) => m + 1)
      const [aId, bId] = nextFlipped
      const a = deck.find((c) => c.id === aId)
      const b = deck.find((c) => c.id === bId)

      if (a.value === b.value) {
        // 매치 성공
        setTimeout(() => {
          setDeck((prev) => prev.map((c) => (c.id === aId || c.id === bId ? { ...c, matched: true } : c)))
          setFlipped([])
          setLocked(false)
        }, 350)
      } else {
        // 매치 실패 → 다시 뒤집기
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
        }, 700)
      }
    }
  }

  // 카드가 앞면(이모지)인지?
  const isFaceUp = (id) => {
    const c = deck.find((x) => x.id === id)
    return c.matched || flipped.includes(id)
  }

  // 그리드 스타일 계산 (반응형)
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    }),
    [cols],
  )

  // 포맷터
  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-green-50 to-green-100 p-6">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-green-800">
            같은 그림 찾기 — Memory Match
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-green-700">난이도</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:ring-2 focus:ring-green-200"
            >
              <option value="easy">Easy (4×4)</option>
              <option value="hard">Hard (6×6)</option>
            </select>

            <label className="ml-2 text-sm font-medium text-green-700">테마</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:ring-2 focus:ring-green-200"
            >
              <option value="fruits">과일</option>
              <option value="animals">동물</option>
              <option value="foods">음식</option>
            </select>

            <button
              onClick={() => resetGame()}
              className="rounded-2xl border border-green-300 bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-600 hover:shadow transition-all"
            >
              재시작
            </button>
          </div>
        </header>

        {/* 상태 패널 */}
        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="이동 수" value={moves} />
          <Stat label="경과 시간" value={formatTime(seconds)} />
          <Stat label="쌍 개수" value={deck.length / 2} />
          <Stat label="진행" value={`${Math.round((deck.filter((c) => c.matched).length / deck.length) * 100)}%`} />
          <Stat label="최고 기록" value={bestTime == null ? "—" : formatTime(bestTime)} />
        </section>

        {/* 게임 보드 */}
        <main className="rounded-3xl bg-white p-2 shadow-lg border border-green-100 relative">
          <div className="grid gap-2" style={gridStyle}>
            {deck.map((card) => (
              <CardTile
                key={card.id}
                isFaceUp={isFaceUp(card.id)}
                matched={card.matched}
                onClick={() => handleCardClick(card.id)}
                value={card.value}
              />
            ))}
          </div>

          {won && (
            <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-green-200 max-w-sm mx-4 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-xl font-bold text-green-800 mb-2">축하합니다!</p>
                <p className="text-lg text-green-700 mb-3">모든 카드를 맞췄어요</p>
                <p className="text-sm text-green-600 mb-4">
                  이동 수 {moves}번, 시간 {formatTime(seconds)} 소요
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => resetGame()}
                    className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
                  >
                    같은 난이도로 다시
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLevel(level === "easy" ? "hard" : "easy")}
                      className="flex-1 rounded-xl border border-green-300 px-3 py-2 text-xs text-green-700 hover:bg-green-50 transition-colors"
                    >
                      다른 난이도
                    </button>
                    <button
                      onClick={() =>
                        setTheme(theme === "fruits" ? "animals" : theme === "animals" ? "foods" : "fruits")
                      }
                      className="flex-1 rounded-xl border border-green-300 px-3 py-2 text-xs text-green-700 hover:bg-green-50 transition-colors"
                    >
                      다른 테마
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* 사용 팁 */}
        <aside className="mt-8 text-sm text-green-600">
          
          <ul className="list-disc space-y-1 pl-5">
            
            
            
            
          </ul>
        </aside>
      </div>
    </div>
  )
}

function loadBestTime(level, theme) {
  try {
    const v = localStorage.getItem(bestTimeKey(level, theme))
    return v == null ? null : Number(v)
  } catch (_) {
    return null
  }
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-white p-3 text-center shadow-sm">
      <div className="text-xs uppercase tracking-wide text-green-600">{label}</div>
      <div className="mt-1 text-xl font-bold text-green-800">{value}</div>
    </div>
  )
}

function CardTile({ isFaceUp, matched, onClick, value }) {
  return (
    <button
      onClick={onClick}
      disabled={matched}
      className={[
        "relative aspect-square select-none rounded-2xl border border-green-200 shadow-sm transition-all duration-200",
        matched ? "opacity-60 bg-green-50" : "hover:-translate-y-0.5 hover:shadow-md bg-white",
      ].join(" ")}
      aria-label={isFaceUp ? `카드 앞면 ${value}` : "카드 뒷면"}
    >
      <div className="absolute inset-0 [perspective:800px]">
        {/* 카드 뒤집힘 효과 */}
        <div
          className={[
            "size-full [transform-style:preserve-3d] transition-transform duration-300",
            isFaceUp ? "[transform:rotateY(180deg)]" : "",
          ].join(" ")}
        >
          {/* 뒷면 */}
          <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-green-200 to-green-300 grid place-items-center text-green-700 text-lg font-bold">
            ❓
          </div>
          {/* 앞면 */}
          <div className="absolute inset-0 rounded-2xl bg-white border border-green-100 grid place-items-center text-4xl [transform:rotateY(180deg)] backface-hidden">
            <span>{value}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
