import { Attribution } from 'ox/erc8021'
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { baseAccount, injected } from 'wagmi/connectors'

export const BUILDER_CODE = ''

export const DATA_SUFFIX = BUILDER_CODE
  ? Attribution.toDataSuffix({ codes: [BUILDER_CODE] })
  : undefined

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({ shimDisconnect: true }),
    baseAccount({ appName: 'Base Tac Toe' }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
  ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
