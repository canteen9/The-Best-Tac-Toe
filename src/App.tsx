import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  CalendarCheck,
  Check,
  ChevronRight,
  Copy,
  Gamepad2,
  LogOut,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { encodeFunctionData, zeroAddress, type Address } from 'viem'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { base } from 'wagmi/chains'
import {
  BASE_TAC_TOE_ADDRESS,
  baseTacToeAbi,
  isContractConfigured,
} from './config/contract'
import { DATA_SUFFIX } from './config/wagmi'

type Game = {
  board: readonly number[]
  status: number
  playerMoves: number
  botMoves: number
  gameNumber: number
  lastActionAt: bigint
}

type Stats = {
  games: bigint
  wins: bigint
  losses: bigint
  draws: bigint
  totalMoves: bigint
  checkIns: bigint
  lastCheckInDay: bigint
  streak: number
}

type Action = 'start' | 'move' | 'checkin' | null

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function shortAddress(address?: Address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'
}

function utcDay() {
  return Math.floor(Date.now() / 86_400_000)
}

function Mark({ value }: { value: number }) {
  if (value === 1) {
    return (
      <svg className="x-mark" viewBox="0 0 100 100" aria-label="X">
        <path d="M24 24 L76 76" />
        <path d="M76 24 L24 76" />
      </svg>
    )
  }
  if (value === 2) {
    return (
      <svg className="o-mark" viewBox="0 0 100 100" aria-label="O">
        <circle cx="50" cy="50" r="29" />
      </svg>
    )
  }
  return null
}

function App() {
  const [walletOpen, setWalletOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<Action>(null)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  const { address, isConnected, isReconnecting } = useAccount()
  const chainId = useChainId()
  const { connectors, connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const {
    data: hash,
    sendTransactionAsync,
    isPending: isSending,
    error: sendError,
    reset: resetTransaction,
  } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash, chainId: base.id })

  const readsEnabled = isConnected && isContractConfigured && Boolean(address)
  const { data: gameData, refetch: refetchGame } = useReadContract({
    address: BASE_TAC_TOE_ADDRESS,
    abi: baseTacToeAbi,
    functionName: 'gameOf',
    args: [address || zeroAddress],
    chainId: base.id,
    query: { enabled: readsEnabled, refetchInterval: 8_000 },
  })
  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: BASE_TAC_TOE_ADDRESS,
    abi: baseTacToeAbi,
    functionName: 'statsOf',
    args: [address || zeroAddress],
    chainId: base.id,
    query: { enabled: readsEnabled, refetchInterval: 10_000 },
  })
  const { data: globalGames, refetch: refetchGlobal } = useReadContract({
    address: BASE_TAC_TOE_ADDRESS,
    abi: baseTacToeAbi,
    functionName: 'globalGames',
    chainId: base.id,
    query: { enabled: isContractConfigured, refetchInterval: 15_000 },
  })

  const game = gameData as Game | undefined
  const stats = statsData as Stats | undefined
  const board = useMemo(
    () => Array.from(game?.board || Array(9).fill(0)).map(Number),
    [game?.board],
  )
  const active = game?.status === 1
  const checkedIn = Number(stats?.lastCheckInDay || 0n) === utcDay()
  const busy = isSending || isConfirming || isSwitching
  const winningLine = useMemo(() => {
    for (const line of winningLines) {
      const [a, b, c] = line
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
    }
    return []
  }, [board])

  const gameMessage = useMemo(() => {
    if (!isConnected) return 'Connect to challenge the machine'
    if (!isContractConfigured) return 'Contract address required'
    if (!game || game.status === 0) return 'A fresh board is waiting'
    if (game.status === 1) return 'Your turn. Choose an open cell.'
    if (game.status === 2) return 'You won. Clean line.'
    if (game.status === 3) return 'The machine won this round.'
    return 'Draw. Perfectly balanced.'
  }, [game, isConnected])

  const transactionMessage = useMemo(() => {
    if (isSwitching) return 'Switching to Base...'
    if (isSending) return 'Confirm in your wallet...'
    if (isConfirming) return pendingAction === 'move' ? 'The machine is answering...' : 'Writing on Base...'
    if (isConfirmed && pendingAction === 'start') return 'New board is live'
    if (isConfirmed && pendingAction === 'move') return 'Move confirmed'
    if (isConfirmed && pendingAction === 'checkin') return 'Daily check-in complete'
    return ''
  }, [isSwitching, isSending, isConfirming, isConfirmed, pendingAction])

  useEffect(() => {
    if (!isConfirmed) return
    void Promise.all([refetchGame(), refetchStats(), refetchGlobal()])
  }, [isConfirmed, refetchGame, refetchStats, refetchGlobal])

  useEffect(() => {
    if (!sendError) return
    setNotice(sendError.message.split('\n')[0])
    setPendingAction(null)
  }, [sendError])

  async function sendAction(action: Exclude<Action, null>, cell?: number) {
    setNotice('')
    resetTransaction()
    if (!isConnected) {
      setWalletOpen(true)
      return
    }
    if (!isContractConfigured) {
      setNotice('Contract address required in src/config/contract.ts.')
      return
    }

    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id })
      setPendingAction(action)
      const functionName = action === 'start' ? 'startGame' : action === 'move' ? 'play' : 'dailyCheckIn'
      const data = encodeFunctionData({
        abi: baseTacToeAbi,
        functionName,
        args: action === 'move' ? [cell!] : [],
      })
      await sendTransactionAsync({
        to: BASE_TAC_TOE_ADDRESS,
        data,
        chainId: base.id,
        ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
      })
    } catch (error) {
      setNotice((error instanceof Error ? error.message : 'Transaction cancelled.').split('\n')[0])
      setPendingAction(null)
    }
  }

  function connectWallet(index: number) {
    const connector = connectors[index]
    if (!connector) return
    connect({ connector, chainId: base.id }, { onSuccess: () => setWalletOpen(false) })
  }

  async function shareGame() {
    const text = `I played Base Tac Toe on Base. Record: ${Number(stats?.wins || 0n)}W / ${Number(stats?.draws || 0n)}D.`
    if (navigator.share) {
      try { await navigator.share({ title: 'Base Tac Toe', text, url: window.location.href }); return } catch { return }
    }
    await navigator.clipboard.writeText(`${text} ${window.location.href}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#game" aria-label="Base Tac Toe home">
          <span className="brand-symbol"><Gamepad2 size={19} /></span>
          <span>Base Tac Toe</span>
          <span className="network-pill"><i /> Base</span>
        </a>
        {isConnected ? (
          <button className="wallet-chip" onClick={() => disconnect()} title="Disconnect wallet">
            <span className="address-orb">X</span>{shortAddress(address)}<LogOut size={15} />
          </button>
        ) : (
          <button className="connect-button" onClick={() => setWalletOpen(true)}><Wallet size={17} /> Connect</button>
        )}
      </header>

      <main id="game">
        <div className="game-layout">
          <aside className="player-panel human">
            <span className="panel-label">Player X</span>
            <div className="player-avatar">X</div>
            <strong>You</strong>
            <small>{shortAddress(address)}</small>
            <span className={active ? 'turn-indicator active' : 'turn-indicator'}><i />{active ? 'Your turn' : 'Standby'}</span>
          </aside>

          <section className="game-stage" aria-label="Tic-Tac-Toe game">
            <div className="stage-heading">
              <div><span>Onchain match</span><strong>Game {Number(game?.gameNumber || 0)}</strong></div>
              <span className="verified"><ShieldCheck size={15} /> Base verified</span>
            </div>

            <div className="board-wrap">
              <div className="board" role="grid" aria-label="Tic-Tac-Toe board">
                {board.map((value, index) => (
                  <button
                    key={index}
                    className={`${value ? 'occupied' : ''} ${winningLine.includes(index) ? 'winner' : ''}`}
                    onClick={() => void sendAction('move', index)}
                    disabled={busy || !active || value !== 0}
                    aria-label={`Cell ${index + 1}${value === 1 ? ', X' : value === 2 ? ', O' : ', empty'}`}
                    role="gridcell"
                  >
                    <Mark value={value} />
                    {!value && active && <span className="cell-preview"><Mark value={1} /></span>}
                  </button>
                ))}
              </div>
            </div>

            <div className={`game-status status-${game?.status || 0}`}>
              <span className="status-light" />
              <div><small>Match status</small><strong>{gameMessage}</strong></div>
            </div>

            <div className="game-actions">
              <button className="primary-action" onClick={() => void sendAction('start')} disabled={busy || active}>
                {busy && pendingAction === 'start' ? <span className="spinner" /> : <RefreshCw size={18} />}
                {game?.status && game.status > 1 ? 'Rematch' : 'New Game'}
              </button>
              <button className="icon-action" onClick={() => void shareGame()} title="Share result">
                {copied ? <Check size={19} /> : <Share2 size={19} />}
              </button>
            </div>
          </section>

          <aside className="player-panel machine">
            <span className="panel-label">Player O</span>
            <div className="player-avatar"><Bot size={25} /></div>
            <strong>Base Machine</strong>
            <small>Deterministic contract</small>
            <span className="turn-indicator"><i />Instant reply</span>
          </aside>
        </div>

        <section className="daily-strip">
          <div className={checkedIn ? 'daily-icon complete' : 'daily-icon'}>
            {checkedIn ? <Check size={23} /> : <CalendarCheck size={23} />}
          </div>
          <div className="daily-copy">
            <span>Daily protocol</span>
            <strong>{checkedIn ? 'Check-in secured' : 'Return to the board'}</strong>
            <small>{checkedIn ? 'Next check-in opens tomorrow at 00:00 UTC.' : 'Keep a separate onchain streak, win or lose.'}</small>
          </div>
          <div className="streak-value"><strong>{Number(stats?.streak || 0)}</strong><span>day streak</span></div>
          <button onClick={() => void sendAction('checkin')} disabled={busy || checkedIn}>
            {busy && pendingAction === 'checkin' ? <span className="spinner" /> : checkedIn ? <Check size={18} /> : <Sparkles size={18} />}
            {checkedIn ? 'Done' : 'Check in'}
          </button>
        </section>

        <section className="stats-row">
          <div><span>Wins</span><strong>{Number(stats?.wins || 0n)}</strong></div>
          <div><span>Draws</span><strong>{Number(stats?.draws || 0n)}</strong></div>
          <div><span>Games</span><strong>{Number(stats?.games || 0n)}</strong></div>
          <div><span>Global matches</span><strong>{Number(globalGames || 0n).toLocaleString()}</strong></div>
        </section>

        <div className="base-note"><span>No stake. No token. No app fee.</span><span>Only Base network gas.</span></div>
      </main>

      <footer><span>Base Tac Toe</span><span>Built on Base</span></footer>

      {(transactionMessage || notice || !isContractConfigured) && (
        <div className={notice || !isContractConfigured ? 'toast error' : 'toast'} role="status">
          {notice || (!isContractConfigured ? 'Contract address required in src/config/contract.ts.' : transactionMessage)}
        </div>
      )}

      {walletOpen && (
        <div className="modal-backdrop" onMouseDown={() => setWalletOpen(false)}>
          <div className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setWalletOpen(false)} aria-label="Close"><X size={20} /></button>
            <span className="modal-icon"><Gamepad2 size={24} /></span>
            <span className="modal-kicker">Base Mainnet</span>
            <h2 id="wallet-title">Enter the arena.</h2>
            <p>Connect a wallet to start your onchain match.</p>
            <div className="wallet-options">
              {connectors.map((connector, index) => (
                <button key={connector.uid} onClick={() => connectWallet(index)} disabled={isConnecting || isReconnecting}>
                  <span className={index === 0 ? 'wallet-symbol browser' : 'wallet-symbol base'}>{index === 0 ? <Wallet size={19} /> : 'B'}</span>
                  <span><strong>{index === 0 ? 'Browser wallet' : 'Base Account'}</strong><small>{index === 0 ? 'MetaMask, Rabby and more' : 'Coinbase smart wallet'}</small></span>
                  <ChevronRight size={20} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
