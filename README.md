# 王城指揮作戰系統 · Whiteout Coord

寒霜啟示錄（Whiteout Survival）「決戰王城」事件的集結協同工具。指揮官建立房間、車頭輸入同一 PIN 進入，所有人即時同步目標落地時間、行軍時間、發車時間。

A real-time rally coordination tool for Whiteout Survival's King City event. The commander creates a room, drivers join with the same PIN, and everyone stays in sync on landing time, march time, and launch time.

**線上版 / Live**: https://ohhannn.github.io/whiteout-coord/

---

## 為什麼要做這個 · Why

市面上已有 Rally Timing Master、Theria Rally Tracker 等工具，但多數是英文、單機計算、或需要註冊。本專案走「中文友善 + 免登入 + PIN 房間即時同步」的路線，並且部署在 GitHub Pages、任何人都可以 fork 自己跑。

---

## Stack

- **前端**：Vite + React 19 + TypeScript + Zustand + Mantine + SCSS Modules
- **即時同步**：Firebase Realtime Database（匿名 auth）
- **部署**：GitHub Pages + GitHub Actions

---

## 本地開發 · Local Development

```bash
# 1. clone
git clone https://github.com/OHHANNN/whiteout-coord.git
cd whiteout-coord

# 2. 裝相依
npm install

# 3. 複製環境變數
cp .env.example .env.local
# 然後編輯 .env.local，填入你的 Firebase config

# 4. 啟動 dev server
npm run dev
```

開啟 http://localhost:5173 就能看到進入頁。

---

## Fork 後如何跑自己的實例 · Self-Hosting

約 10 分鐘設定，步驟：

### 1. 建 Firebase 專案

1. 登入 https://console.firebase.google.com
2. 新增專案 → 名稱隨意 → 關閉 Analytics
3. 建構 → Realtime Database → 建立（位置選 asia-southeast1）→ 鎖定模式
4. 建構 → Authentication → 啟用「匿名」登入方式
5. 專案設定 → Your apps → `</>` 註冊 web app → 複製 firebaseConfig

### 2. 部署 Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # 選你建的 project
firebase deploy --only database
```

### 3. 設定 GitHub Actions

- Fork 這個 repo
- 去 Settings → Secrets and variables → Actions → New repository secret
- 把 `.env.local` 的每個變數都加成 secret（VITE_FIREBASE_API_KEY、VITE_FIREBASE_AUTH_DOMAIN …）
- push 到 main 分支，Actions 會自動 build + deploy 到 gh-pages
- Settings → Pages → 選 gh-pages 分支 → save

完成後網址是 `https://你的GitHub帳號.github.io/whiteout-coord/`。

---

## 安全性 · Security

- Firebase API key 外露到前端是設計如此，靠 **Security Rules** 保護
- 已啟用 **匿名 auth**，未登入使用者無法讀寫
- PIN 必須為 8 位數字，不符格式的 request 直接被拒
- 每位使用者只能寫自己的 member 節點，不能改別人的資料
- 欄位有型別與範圍驗證（marchSeconds 0–600、name ≤ 20 字）
- 進階安全（App Check）預設未啟，會在 [roadmap](#roadmap) 中加上

---

## Roadmap

- [ ] App Check 整合（reCAPTCHA v3 防暴力猜 PIN）
- [ ] 作戰戰報匯出（JSON / PNG）
- [ ] 多目標同時管理
- [ ] 座標小地圖視覺化
- [ ] 簡體中文支援

---

## License

MIT © OHHANNN

## 鳴謝 · Credits

- UI 設計系統由 [UI UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) 推薦的 HUD / Sci-Fi FUI 風格生成
- 靈感來自 [Rally Timing Master](https://github.com/mountarreat/wos-rally-timing-master)、[Theria Games Rally Tracker](https://theriagames.com/guide/whiteout-survival-rally-tracker/)
