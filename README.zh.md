# dsh-deepseek-balance

[English](README.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web 插件：在
Web 界面右下角的紧凑悬浮卡片中持续显示 DeepSeek 平台账号余额，每分钟自动刷新。

插件是纯客户端 bundle：卡片通过 Harness 的 `account/getBalance` Remote 读取**已登录的
DeepSeek 平台账号**余额，数值与「设置 → 账号」一致。

## 显示内容

| 位置 | 内容 |
|---|---|
| 大字 | 已登录平台账号的**充值余额** |
| 第二行 | **赠金余额**（账号存在赠金时才显示） |
| 时间行 | 最近一次成功读取的本地时间 |
| 刷新 | 卡片右上角的刷新按钮，读取过程中图标旋转 |
| 未登录 | 显示「未登录」及登录提示 |
| 读取失败 | 显示「余额读取失败」与重试提示；已成功过之后再失败会保留上次金额，并把时间行标为「刷新失败」 |

金额按平台规则显示：两位小数、不足一分显示 `<¥0.01`、向下取整、带千分位；人民币与美元用
`¥`、`$`，其他币种在金额后写出币种代码。

## 刷新时机

- 挂载时；
- 页面可见状态下每 60 秒；
- 窗口重新获得焦点、或页面从隐藏恢复可见时；
- 点击刷新按钮时。

## 环境要求

- DSH Web GUI `0.2.2-rc.5` 及以上（`0.2.x`），已通过 `engines.dsh` 声明。
- 已登录 DeepSeek **平台账号**（即「设置 → 账号」所用的登录）。插件不读取 API Key。
- profile 组合中挂载了 `deepseek-account` Remote 命名空间——官方 Web profile 默认满足；缺少时
  插件保持未激活，不显示卡片。

## 安装

1. 克隆本仓库到任意目录：

   ```sh
   git clone https://github.com/liangzhanyong/dsh-deepseek-balance.git
   ```

2. 在 DSH Web 界面打开 **Plugins → Add plugin**，选择克隆下来的目录（含 `package.json` 的那一层）。

插件会安装到当前 profile、立即生效，并在重启后保留。卸载时在同一页面移除
`dsh-deepseek-balance` bundle 即可。

以本地目录安装时是链接方式：修改文件后在 **Plugins** 页重新开关该插件即可热重载，无需重启 Harness。

## 隐私

- 卡片只通过运行中的 Harness 读取已登录账号的余额，不向其他任何位置发送数据。
- 插件不保存 API Key、令牌或余额数值。
- 没有 `account/getBalance` Remote 权限的 LiveShare 共享访客完全看不到卡片。

## 已知限制

- 卡片宽 148px、距边缘 12px；窗口窄于约 1280px 时可能贴近输入框的发送按钮。
- 宿主在右下角出现的其他提示（例如终端清理失败）在卡片可见时可能被遮挡一角。

## 实现结构

| 文件 | 作用 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch` 与 `dsh.client` Web 半边 |
| `cordis.patch.yml` | 插入一行名为本包的 Host 插件 `deepseek-balance` |
| `index.js` | Host 半边——有意留空：不注册服务、路由、凭据或配置 |
| `client.js` | Client 半边——在 `shell.overlay` 插槽注册 `deepseek-balance` 条目并渲染卡片 |
| `locale/en.json`、`locale/zh.json` | Plugins 页显示的标题与描述 |
| `icon.svg` | 插件图标 |

卡片是使用 `React.createElement`（无 JSX）编写的 React 组件，经 Harness 客户端模块加载器加载。
界面只使用 `--dsw-*` 主题令牌来控制表面、文字、边框、阴影、焦点与状态色，中英文文案注册到客户端
locale 服务。

## 开发

没有构建步骤，两个 JavaScript 文件就是最终产物：

```sh
node --check index.js client.js
```

修改后在 **Plugins** 页重新开关 `dsh-deepseek-balance`，或刷新页面即可。

## 许可证

[MIT](LICENSE) © 2026 liangzhanyong

本插件与 DeepSeek 官方无关联，也未获其背书；“DeepSeek” 是其权利人的商标。
