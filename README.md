# 王城指揮作戰系統 · Whiteout Coord

給《寒霜啟示錄》決戰王城活動用的**即時集結協同工具**。指揮官設抵達時間、車頭各自填行軍時間，系統自動算出每個人該按下集結的 UTC 時刻，全房間即時同步。

🔗 **線上版**：<https://ohhannn.github.io/whiteout-coord/>

## 怎麼用

1. 任一人產 PIN 建房 → 把**分享 PIN** 按鈕複製的連結丟進公會 Discord / LINE
2. 車頭點連結 → 填名字 + 選車頭／車身 → 行軍時間填進列表
3. 指揮官設抵達時間（例如 `21:30:00`），或按 `+5m / +6m / +10m / +30m` 快捷（`+6m` 是反集結保留秒數的偏移）
4. 每人畫面顯示「距離自己發車 X 秒」的倒數、時間到按遊戲內發動集結，落地時也會再提醒一次

## 主要功能

- **聲音 / 震動提醒**：發車前 5、4、3、2、1、0 秒每秒嗶一聲，落地前同樣；T-0 是長音 + 震動
- **多時區**：每個使用者自選 IANA 時區（UTC / UTC+8 / UTC-5 等），firebase 內部統一存 UTC ms、各人本地顯示自己的偏移
- **抵達偏移**：每個車頭可設 -60 ~ +60 秒偏移（先鋒吸盾 -2s 之類），系統自動把發車時間錯開
- **反集結模式**：任一人標 counterRally → 非反集結成員自動 passive、不收倒數提醒、UI 灰階
- **集結窗口**：每車頭可選 5 分 / 10 分窗口
- **代管車頭**：指揮官可代為加入沒在用工具的隊友、設好行軍時間
- **接管指揮**：指揮官離線過久（90s）→ 任何車頭可接管
- **戰報歷史**：每次鎖定作戰會 snapshot 一份戰報，右側 Sheet 可隨時查
- **共用 PIN session**：同 PIN 不會反覆要你輸名字，但跨房或被踢會清掉

## 技術 stack

- React 19 + TypeScript + Vite 6
- Tailwind v4 + shadcn/ui（zinc theme、light / dark）
- Firebase Realtime DB（匿名登入 + presence onDisconnect）
- i18next（繁中 / English / 한국어）

## 本地開發

```bash
npm install
cp .env.example .env.local     # 填自己的 Firebase config
npm run dev
```

想 fork 跑自己實例（獨立 Firebase + GitHub Pages）可以開 Issue 問我要 setup 文件。

## License

MIT © [OHHANNN](https://github.com/OHHANNN)
靈感來源：[Rally Timing Master](https://github.com/mountarreat/wos-rally-timing-master)、[Theria Games Rally Tracker](https://theriagames.com/guide/whiteout-survival-rally-tracker/)
