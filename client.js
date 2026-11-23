/**
 * DeepSeek balance — Client half.
 *
 * Draws one floating card in the frame's bottom-right corner (`shell.overlay`)
 * and keeps it current: the balance comes from the signed-in DeepSeek platform
 * account through the `account/getBalance` Remote, refreshed every minute and
 * whenever the page becomes visible or regains focus.
 */
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-balance',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NAMESPACE = 'deepseek.balance'
    const REFRESH_INTERVAL_MS = 60_000

    const en = {
      title: 'DeepSeek balance',
      refresh: 'Refresh balance',
      loading: 'Reading balance',
      signedOut: 'Not signed in',
      signedOutHint: 'Sign in to a DeepSeek platform account',
      failed: 'Balance unavailable',
      retry: 'Click refresh to retry',
      refreshFailed: 'Refresh failed',
      toppedUp: 'Topped-up balance',
      granted: 'Granted balance',
      updated: 'Updated {time}',
    }
    const zh = {
      title: 'DeepSeek 余额',
      refresh: '刷新余额',
      loading: '正在读取余额',
      signedOut: '未登录',
      signedOutHint: '登录 DeepSeek 平台账号后显示',
      failed: '余额读取失败',
      retry: '点击刷新重试',
      refreshFailed: '刷新失败',
      toppedUp: '充值余额',
      granted: '赠金余额',
      updated: '更新于 {time}',
    }

    // 148px wide at a 12px inset keeps the card clear of the centred composer's
    // send control on a 1280px window; the host's floating surfaces supply the
    // radius, elevation stroke and shadow.
    const CSS = `
.dsh-db-card {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 40;
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 148px;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--dsw-radius-lg);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-prominent);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  line-height: 16px;
  text-align: left;
}
.dsh-db-head {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
}
.dsh-db-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 500;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-db-refresh {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -2px -4px -2px 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dsh-db-refresh:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dsh-db-refresh:focus-visible {
  outline-offset: 2px;
}
.dsh-db-refresh.is-busy svg {
  animation: dsh-db-spin 900ms linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .dsh-db-refresh.is-busy svg {
    animation-duration: 2400ms;
  }
}
.dsh-db-amount {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.dsh-db-amount.is-muted {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.dsh-db-amount.is-error {
  color: var(--dsw-alias-state-error-primary);
}
.dsh-db-detail {
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 15px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.dsh-db-foot {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 15px;
  font-variant-numeric: tabular-nums;
}
.dsh-db-foot.is-error {
  color: var(--dsw-alias-state-error-primary);
}
@keyframes dsh-db-spin {
  to { transform: rotate(360deg); }
}
`

    /** Substitute `{name}` placeholders from a fallback dictionary entry. */
    function interpolate(text, params) {
      if (params === undefined) return text
      return text.replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
    }

    /** Currency symbol; the empty string marks a currency the card spells out. */
    function symbolOf(currency) {
      if (currency === 'CNY') return '¥'
      if (currency === 'USD') return '$'
      return ''
    }

    /** Formatting locale tag: the active DSH locale decides number and time shapes. */
    function numberTag(active) {
      return typeof active === 'string' && active.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
    }

    /** Platform Web's display rules: two decimals, `<0.01` below one cent, rounded down. */
    function formatAmount(value, currency, tag) {
      const symbol = symbolOf(currency)
      const amount = Number(value)
      if (!Number.isFinite(amount)) return `${symbol}${String(value)}`
      const suffix = symbol === '' ? ` ${String(currency)}` : ''
      const sign = amount < 0 ? '-' : ''
      const magnitude = Math.abs(amount)
      if (magnitude === 0) return `${symbol}0.00${suffix}`
      if (magnitude < 0.01) return `${sign}<${symbol}0.01${suffix}`
      const floored = Math.floor(magnitude * 100) / 100
      const digits = floored.toLocaleString(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return `${sign}${symbol}${digits}${suffix}`
    }

    /** Sum wallets of one currency; null when none of them match. */
    function walletTotal(wallets, currency) {
      let total = 0
      let matched = false
      for (const wallet of wallets) {
        if (wallet === null || typeof wallet !== 'object' || wallet.currency !== currency) continue
        const amount = Number(wallet.balance)
        if (!Number.isFinite(amount)) continue
        total += amount
        matched = true
      }
      return matched ? total : null
    }

    /** Currency the card reports in; a known symbol wins, then the first wallet's own currency. */
    function primaryCurrency(normal, bonus) {
      for (const list of [normal, bonus]) {
        for (const wallet of list) {
          if (wallet === null || typeof wallet !== 'object') continue
          if (symbolOf(wallet.currency) !== '') return wallet.currency
        }
      }
      for (const list of [normal, bonus]) {
        for (const wallet of list) {
          if (wallet !== null && typeof wallet === 'object' && typeof wallet.currency === 'string' && wallet.currency !== '') {
            return wallet.currency
          }
        }
      }
      return 'CNY'
    }

    return {
      name: 'dsh-deepseek-balance',
      // `remote.account` is a separate Client service (the gateway installs one
      // `remote.<namespace>` service per mounted Remote namespace), so the
      // namespace must be injected beside the root `remote` service.
      inject: ['slots', 'locale', 'remote', 'remote.account'],
      apply(ctx) {
        const locale = ctx.locale
        const remote = ctx.remote

        /** Localized text for the rare render that arrives without the `t` seat. */
        const dictionary = (key) => {
          const snapshot = locale.getSnapshot()
          const active = snapshot !== undefined && typeof snapshot.active === 'string' ? snapshot.active.toLowerCase() : ''
          const table = active.startsWith('zh') ? zh : en
          return table[key] !== undefined ? table[key] : (en[key] !== undefined ? en[key] : key)
        }

        /** Release version reported as this client's identity in account requests. */
        const clientVersion = () => {
          const boot = globalThis.__DSH_BOOT__
          const release = boot !== null && typeof boot === 'object' ? boot.release : undefined
          return release !== null && typeof release === 'object' && typeof release.version === 'string'
            ? release.version
            : '0.0.0'
        }

        function BalanceCard(props) {
          const translate = typeof props.t === 'function'
            ? props.t
            : (key, params) => interpolate(dictionary(key), params)
          // Root-scope slots carry `useRemoteAccess`; the per-session slots carry
          // `useAccess`. Read whichever this seat supplies, and hide the card from
          // a peer the Host would refuse.
          const accessHook = typeof props.useRemoteAccess === 'function'
            ? props.useRemoteAccess
            : typeof props.useAccess === 'function'
              ? props.useAccess
              : undefined
          const allowed = accessHook === undefined ? true : accessHook('account/getBalance')
          const [state, setState] = React.useState({ status: allowed ? 'loading' : 'hidden' })
          const generation = React.useRef(0)

          const load = React.useCallback(async () => {
            const generationId = ++generation.current
            setState((previous) => previous.status === 'ready'
              ? { ...previous, busy: true }
              : { status: 'loading' })
            try {
              const snapshot = locale.getSnapshot()
              const active = snapshot !== undefined && typeof snapshot.active === 'string' ? snapshot.active : 'en'
              const result = await remote.account.getBalance({
                version: clientVersion(),
                locale: active,
                timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
              })
              if (generationId !== generation.current) return
              if (result === null || typeof result !== 'object' || result.ok !== true) {
                const code = result !== null && typeof result === 'object' && result.ok === false && result.error !== undefined
                  ? String(result.error.code)
                  : ''
                if (code.includes('remote-access') || code.includes('denied')) {
                  setState({ status: 'hidden' })
                  return
                }
                // A failed refresh keeps the last good reading; only a card that
                // never loaded falls back to the full error state.
                setState((previous) => previous.status === 'ready'
                  ? { ...previous, busy: false, failed: true, code }
                  : { status: 'error', code })
                return
              }
              const value = result.value
              if (value === null || value === undefined) {
                setState({ status: 'signedOut' })
                return
              }
              if (value.status !== 'ready') {
                setState((previous) => previous.status === 'ready'
                  ? { ...previous, busy: false, failed: true, code: 'balance-failed' }
                  : { status: 'error', code: 'balance-failed' })
                return
              }
              const normal = Array.isArray(value.value) ? value.value : []
              const bonus = Array.isArray(value.bonusWallets) ? value.bonusWallets : []
              const currency = primaryCurrency(normal, bonus)
              setState({
                status: 'ready',
                busy: false,
                failed: false,
                currency,
                toppedUp: walletTotal(normal, currency),
                granted: walletTotal(bonus, currency),
                updatedAt: Date.now(),
              })
            } catch (error) {
              if (generationId !== generation.current) return
              const message = error !== null && typeof error === 'object' && typeof error.message === 'string'
                ? error.message
                : String(error)
              const code = message.slice(0, 48)
              setState((previous) => previous.status === 'ready'
                ? { ...previous, busy: false, failed: true, code }
                : { status: 'error', code })
            }
          }, [])

          React.useEffect(() => {
            if (!allowed) {
              generation.current++
              setState({ status: 'hidden' })
              return
            }
            void load()
            const tick = () => {
              if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
              void load()
            }
            const timer = window.setInterval(tick, REFRESH_INTERVAL_MS)
            window.addEventListener('focus', tick)
            document.addEventListener('visibilitychange', tick)
            return () => {
              generation.current++
              window.clearInterval(timer)
              window.removeEventListener('focus', tick)
              document.removeEventListener('visibilitychange', tick)
            }
          }, [allowed, load])

          if (state.status === 'hidden') return null

          const snapshot = locale.getSnapshot()
          const tag = numberTag(snapshot !== undefined && typeof snapshot.active === 'string' ? snapshot.active : 'en')
          const busy = state.status === 'loading' || state.busy === true
          const ready = state.status === 'ready'
          const stale = ready && state.failed === true
          const amount = ready
            ? formatAmount(state.toppedUp === null ? 0 : state.toppedUp, state.currency, tag)
            : ''
          const granted = ready && state.granted !== null ? state.granted : null
          const time = ready
            ? new Date(state.updatedAt).toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' })
            : ''

          let amountClass = 'dsh-db-amount'
          let amountText = '—'
          if (ready) amountText = amount
          else if (state.status === 'signedOut') {
            amountClass += ' is-muted'
            amountText = translate('signedOut')
          } else if (state.status === 'error') {
            amountClass += ' is-muted is-error'
            amountText = translate('failed')
          } else {
            amountClass += ' is-muted'
          }

          const detail = granted !== null && granted > 0
            ? `${translate('granted')} ${formatAmount(granted, state.currency, tag)}`
            : ''
          const hint = state.status === 'signedOut'
            ? translate('signedOutHint')
            : state.status === 'error'
              ? translate('retry')
              : state.status === 'loading'
                ? translate('loading')
                : ''
          const foot = !ready
            ? ''
            : stale
              ? `${translate('refreshFailed')} · ${translate('updated', { time })}`
              : translate('updated', { time })

          const summary = ready
            ? [
              `${translate('toppedUp')} ${amount}`,
              granted !== null && granted > 0 ? `${translate('granted')} ${formatAmount(granted, state.currency, tag)}` : '',
              stale ? translate('refreshFailed') : '',
              translate('updated', { time }),
            ].filter((part) => part !== '').join(' · ')
            : state.status === 'error' && typeof state.code === 'string' && state.code !== ''
              ? `${translate('failed')}: ${state.code}`
              : hint

          return h('div', {
            className: 'dsh-db-card',
            'data-status': state.status,
            ...(summary === '' ? {} : { title: summary }),
          },
          h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
          h('div', { className: 'dsh-db-head' },
            h('span', { className: 'dsh-db-title' }, translate('title')),
            h('button', {
              type: 'button',
              className: busy ? 'dsh-db-refresh is-busy' : 'dsh-db-refresh',
              onClick: () => { void load() },
              'aria-label': translate('refresh'),
              title: translate('refresh'),
            },
            h('svg', {
              viewBox: '0 0 16 16',
              width: 14,
              height: 14,
              'aria-hidden': true,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            },
            h('path', { d: 'M13.2 8a5.2 5.2 0 1 1-1.7-3.8' }),
            h('path', { d: 'M13.2 2.4v3.1h-3.1' })))),
          h('div', {
            className: amountClass,
            role: 'status',
            'aria-busy': busy ? 'true' : undefined,
          }, amountText),
          detail === '' ? null : h('div', { className: 'dsh-db-detail' }, detail),
          hint === '' ? null : h('div', { className: 'dsh-db-detail' }, hint),
          foot === '' ? null : h('div', { className: stale ? 'dsh-db-foot is-error' : 'dsh-db-foot' }, foot))
        }

        ctx.effect(
          () => locale.register(NAMESPACE, { en, zh }),
          'deepseek-balance: dictionaries',
        )
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'deepseek-balance',
          order: 60,
          locale: NAMESPACE,
        }, BalanceCard))
      },
    }
  },
})
