import { zeroAddress, type Address } from 'viem'

const deployedAddress = ''
const configuredAddress = import.meta.env.VITE_BASE_TAC_TOE_CONTRACT_ADDRESS
const activeAddress = configuredAddress || deployedAddress

export const isContractConfigured =
  /^0x[a-fA-F0-9]{40}$/.test(activeAddress) &&
  activeAddress.toLowerCase() !== zeroAddress

export const BASE_TAC_TOE_ADDRESS = (
  isContractConfigured ? activeAddress : zeroAddress
) as Address

export const baseTacToeAbi = [
  { type: 'function', name: 'startGame', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'play', inputs: [{ name: 'cell', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'dailyCheckIn', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function', name: 'gameOf', inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: 'game', type: 'tuple', components: [
      { name: 'board', type: 'uint8[9]' }, { name: 'status', type: 'uint8' },
      { name: 'playerMoves', type: 'uint8' }, { name: 'botMoves', type: 'uint8' },
      { name: 'gameNumber', type: 'uint32' }, { name: 'lastActionAt', type: 'uint64' },
    ] }], stateMutability: 'view',
  },
  {
    type: 'function', name: 'statsOf', inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: 'stats', type: 'tuple', components: [
      { name: 'games', type: 'uint64' }, { name: 'wins', type: 'uint64' },
      { name: 'losses', type: 'uint64' }, { name: 'draws', type: 'uint64' },
      { name: 'totalMoves', type: 'uint64' }, { name: 'checkIns', type: 'uint64' },
      { name: 'lastCheckInDay', type: 'uint64' }, { name: 'streak', type: 'uint16' },
    ] }], stateMutability: 'view',
  },
  { type: 'function', name: 'globalGames', inputs: [], outputs: [{ name: '', type: 'uint64' }], stateMutability: 'view' },
] as const
