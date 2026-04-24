# 王城指揮作戰系統 · Whiteout Coord

給《寒霜啟示錄》決戰王城事件用的**即時集結協同工具**。指揮官設落地時間、車頭各自填行軍時間、系統自動算出每個人該發車的 UTC 時刻，全房間即時同步。

🔗 **線上版**：<https://ohhannn.github.io/whiteout-coord/>

## 怎麼用

1. 任一人產 PIN 建房 → 把**分享 PIN** 按鈕複製的連結丟進公會 Discord / LINE
2. 車頭點連結 → 填名字 → 輸入自己的行軍時間
3. 指揮官設目標落地 UTC 時間（例如 `21:30:00`）或按 `+5m / +10m / +30m / +1h` 快捷
4. 每人畫面會顯示「距離自己發車 X 秒」的倒數、時間到按遊戲內發動集結

發車前 5/3/1/0 秒會嗶聲提醒（右上角可以靜音）。指揮官可以直接幫其他車頭調行軍時間、也能勾「我只調度不出集結」當純指揮模式。

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
