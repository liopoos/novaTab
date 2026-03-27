# novaTab

> A minimal Chrome new tab extension that turns your browser bookmarks into a clean navigation page, with theme customization and full-text search.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?logo=googlechrome&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

![novaTab](.github/screenshots/banner.png)

English | [中文](./README.zh.md)

---

## Features

- 🌲 **Bookmark tree sidebar** — full bookmark hierarchy with expand / collapse
- 🗂 **Visual grid** — browse folders and bookmarks as cards
- 🔍 **Global search** — real-time search across all bookmarks
- 🌗 **Dark / Light / System** — follows your OS preference
- 🌐 **i18n** — English, Chinese, Japanese
- ⌨️ **Keyboard shortcuts** — `/` search · `[`/`]` collapse/expand · `H` home · `?` help

## Tech Stack

|           |                                     |
| --------- | ----------------------------------- |
| Framework | React 18 + TypeScript (strict)      |
| Build     | Vite 5 + `@crxjs/vite-plugin`       |
| Styling   | Tailwind CSS v4 + shadcn/ui (Radix) |
| Icons     | lucide-react                        |
| i18n      | i18next + react-i18next             |

## Installation

1. Download `nova.zip` from the Releases page and unzip it to get the `nova/` folder
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** in the top-right corner
4. Click "Load unpacked" and select the `nova/` folder

## Keyboard Shortcuts

| Key          | Action                        |
| ------------ | ----------------------------- |
| `/`          | Focus search bar              |
| `Esc`        | Clear search                  |
| `[` / `]`    | Collapse / expand all folders |
| `H` / `Home` | Go to root                    |
| `?`          | Open shortcuts dialog         |

## Local Build

**Prerequisites:** Node.js 18+, npm 9+, Google Chrome

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # Production build → dist/
npm run type-check # Must exit 0 before committing
```

Once built, follow the installation steps above and select the `dist/` folder.

## License

[MIT](./LICENSE)
