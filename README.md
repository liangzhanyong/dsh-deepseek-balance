# dsh-deepseek-balance

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web plugin that
keeps your DeepSeek platform account balance visible in a compact floating card at the
bottom-right corner of the Web GUI, refreshed every minute.

It is a client-side bundle: the card reads the balance of the signed-in DeepSeek platform
account through the Harness `account/getBalance` Remote — the same numbers as **Settings →
Account**.

## What it shows

| Element | Content |
|---|---|
| Headline | **充值余额** / topped-up balance of the signed-in platform account |
| Second line | **赠金余额** / granted balance, only when the account has one |
| Time line | the local time of the last successful read |
| Refresh | a button at the top-right of the card; it spins while a read is in flight |
| Signed out | `未登录` / `Not signed in` plus a hint to sign in |
| Failure | `余额读取失败` / `Balance unavailable` with a retry hint; a later failed refresh keeps the last good amount and marks the time line `刷新失败` |

Amounts follow the platform's display rules: two decimals, `<¥0.01` below one cent, rounded
down, thousands separators. CNY and USD use `¥` and `$`; any other currency is spelled out
after the amount.

## Refresh behavior

- on mount;
- every 60 seconds while the page is visible;
- when the browser window regains focus or the page becomes visible again;
- when the refresh button is clicked.

## Requirements

- DSH Web GUI `0.2.2-rc.5` or newer (`0.2.x`), declared as `engines.dsh`.
- A signed-in DeepSeek **platform account** (the login used by `Settings → Account`). The
  plugin does not read an API key.
- A profile whose composition mounts the `deepseek-account` Remote namespace — every stock
  Web profile does. Without it the plugin simply stays inactive and no card appears.

## Install

1. Clone this repository anywhere:

   ```sh
   git clone https://github.com/liangzhanyong/dsh-deepseek-balance.git
   ```

2. In the DSH Web GUI open **Plugins → Add plugin** and choose the cloned directory
   (the folder containing `package.json`).

The plugin is installed into the current profile, activates immediately, and survives
restarts. To remove it, remove the `dsh-deepseek-balance` bundle from the same page.

Installing from a local directory links the checkout: after editing files, toggle the
plugin row in **Plugins** to reload it without restarting Harness.

## Privacy

- The card only reads the balance of the already signed-in account through the running
  Harness. It sends nothing anywhere else.
- No API key, token, or balance value is stored by the plugin.
- Shared LiveShare viewers without Remote access to `account/getBalance` do not see the
  card at all.

## Known limitations

- The card is 148 px wide at a 12 px inset. On windows narrower than about 1280 px it can
  sit close to the composer's send control.
- Host notices that also occupy the bottom-right corner (a failed terminal cleanup, for
  example) can be partly covered while the card is visible.

## How it is built

| File | Role |
|---|---|
| `package.json` | bundle manifest: `dsh.bundle.patch` plus the `dsh.client` web half |
| `cordis.patch.yml` | inserts one Host row `deepseek-balance` named after the package |
| `index.js` | Host half — intentionally empty: no service, route, credential, or config |
| `client.js` | Client half — registers one entry `deepseek-balance` in the `shell.overlay` slot and renders the card |
| `locale/en.json`, `locale/zh.json` | title and description shown by the Plugins page |
| `icon.svg` | plugin icon |

The card is a React component created without JSX (`React.createElement`) and loaded through
the Harness client module loader. It uses only `--dsw-*` theme tokens for surfaces, text,
borders, elevation, focus, and state colors, and registers its Chinese/English strings with
the client locale service.

## Development

There is no build step: the two JavaScript files are the shipped artifacts.

```sh
node --check index.js client.js
```

After editing, toggle `dsh-deepseek-balance` in **Plugins**, or reload the page.

## License

[MIT](LICENSE) © 2026 liangzhanyong

Not affiliated with or endorsed by DeepSeek. "DeepSeek" is a trademark of its owner.
