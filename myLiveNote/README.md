# LiveNote - 個人演唱會參戰紀錄系統 (v6.3.3.1 - MapTiler 3D Gold Edition)

LiveNote 是一個專為音樂愛好者設計的個人演唱會（Live）參戰紀錄 Web App。透過 Google Sheets 作為資料庫，結合 Google Apps Script (GAS) 提供後端 API，實現資料的持久化儲存、多使用者管理與智慧化的輸入體驗。

在 **v6.3.3.1** 中，我們迎來了重大功能更新：引入了極具儀式感的暗金主題「年度統計匯總卡片」，自動動態匯總歷史年份參戰指標，並優化了年度總結彈窗頂部的旋轉「金色獎盃虛線徽章」，內建抵消旋轉效果，使獎盃保持端正。同時，公演取消狀態、場外音漏等活動類型亦已完整支援。

![Ticket Demo](ticket%20demo%201.jpg)

## 🌟 核心特點 (v6.3.1.0 重磅更新)

### 1. 🎫 3D 滾筒式擬真票券特效 (3D Rolodex Scroll Effect)
*   **立體翻滾體驗**：票券列表模擬 3D 滾筒（Rolodex）效果，滾動時卡片會自動進行 Z 軸景深退後 (`translateZ`)、X 軸立體翻轉 (`rotateX`) 與尺寸縮放 (`scale`)，配合邊緣漸層淡出遮罩，翻閱回憶時儀式感十足。
*   **雙層分離物理隔離架構 (Wrapper Separation)**：將 2D 物理排版與 3D 視覺變形徹底分離。外層 `.ticket-wrapper` 統一固定高度進行規則的 `scroll-snap-align: center` 磁吸置中對齊；內層 `.ticket` 卡片則保持完全彈性 (`min-height: 200px`)，**徹底解決了文字剪裁、卡位不置中與 3D 深度導致滾動條卡死的問題**。

### 2. 🎛️ 極簡風格檢視模式切換器 (Minimalist View Mode Toggle)
*   **清單控制列 (.list-toolbar)**：常駐於年份篩選 Chips 下方，左側可**動態統計篩選後的票卡總數**（例如 `24 TICKETS`），提供極佳的狀態回饋。
*   **極簡主義 3D / 2D 切換鈕**：走「Quiet Luxury」精緻無框設計，採用 `Inter` 現代字型與拉開的字距。當滑鼠 hover 時會產生 Lucide 圖示 `15度` 旋轉微動畫，並從左向右流暢延伸出極細金色底線，可在一鍵之間讓列表在「3D 滾筒」與「傳統 2D 平鋪清單」間無縫重載切換。

### 3. ⏳ 雙模式無縫年份時間軸 (Dual-Mode Scroll Timeline)
*   **全域 3D Preserve-3D 鏈**：建立統一的 3D 透視空間鏈，確保所有卡片共享同一個深度緩衝區，杜絕卡片穿透重疊。
*   **無縫滾動監聽**：年份時間軸泡泡同時監聽了「3D 容器滾動」與「2D 視窗滾動」，在 3D 模式下以容器中心點對齊，在 2D 模式下以視窗中心點對齊，確保兩種檢視模式下年份氣泡都能精準浮現。

### 4. 🎬 手機版溫柔漸隱轉場 (Smooth Section Fade-out)
*   **美化退場動畫**：在手機版點擊置頂按鈕回到大 Logo 歡迎畫面時，加入了 `.section-fade-out` 動畫。卡片分頁會以 `0.35s` 的時間自然向下漸隱淡出後才正式隱藏，消除原本突然閃爍消失的生硬感，轉場極具質感。

### 5. 🚀 圖片上傳安全清理與 MIME 自動補完
*   **消除 Failed to Fetch 錯誤**：前端自動將圖片檔名中的空格、中文等特殊字元清理為 AWS 安全字元，解決 R2/S3 AWS Signature V4 簽名不符；並在部分行動裝置 MIME 類型缺失時自動根據副檔名進行對應補完，徹底提升圖片上傳穩定度。

### 6. 📱 PWA 終極優化 (Smart Install Banner)
*   **卡片式點擊設計**：移除傳統按鈕，將整個 Banner 轉化為可點擊的互動卡片，點擊即觸發安裝。
*   **極速滑動避讓**：偵測到頁面捲動時，Banner 會以 0.1s 的速度瞬間縮回，確保不擋住 Tickets、Map 或 Stats 內容。
*   **手機版物理隔離**：在行動裝置上自動靠左對齊並縮小寬度，避開右下角的「置頂按鈕」。

### 7. 🗺️ MapTiler 3D 向量地圖與暗金風格深度定制 (MapTiler 3D Gold Edition)
*   **3D 建築與街道精緻渲染**：卡片詳情小地圖採用 `STREETS.DARK` 樣式並在 Zoom 17 + pitch 55° 下，將會場周圍 3D 建築以立體視角浮現，遠景總覽地圖則維持 Dataviz 乾淨純黑。
*   **全圖層暗金配色客製**：透過地圖樣式載入監聽，動態將 3D 建築改為 `#1a1510` 深棕金、道路改為 `#2a2018` 暗金線、並將土地/水域/綠地一律壓低配色，消除任何亮色或藍綠色塊。
*   **防止 Focus 跳轉 Bug**：地圖載入時會暫時改裝 `HTMLElement.prototype.focus` 注入 `{ preventScroll: true }`，從根源阻斷瀏覽器因 Canvas focus 而導致 Modal 燈箱自動向下跳動的 Bug。

---

## 🛠️ 技術棧 (Tech Stack)

-   **Frontend**:
    *   HTML5 / CSS3 (Vanilla CSS + 動態變數)
    *   JavaScript (ES6+, Async/Await)
    *   [Leaflet.js](https://leafletjs.com/) - 地圖視覺化
    *   [Chart.js](https://www.chartjs.org/) - 數據圖表
    *   [Lucide Icons](https://lucide.dev/) - 現代感圖標
-   **Backend / Database**:
    *   [Google Apps Script](https://developers.google.com/apps-script) - API v3.0 (支援多使用者驗證、自動初始化)
    *   [Google Sheets](https://www.google.com/sheets/about/) - 關聯式資料儲存與權限配置

---

## 📂 檔案結構

```text
myLiveNote/
├── Code.gs             # GAS v3.0 後端邏輯 (Auth, 自動化建表)
├── index.html          # 主站主體 (MASTER)
├── shared.html         # PWA 入口、參戰者選擇 (Portal) 與優化版 Install Banner
├── style.css           # 3D 滾筒空間鏈、列表控制列與漸隱退場樣式
├── script.js           # 核心邏輯：雙層 3D 計算、雙模式時間軸、PWA 整合、圖表與地圖
├── sw.js               # Service Worker (離線快取支援)
└── manifest.json       # PWA 配置資訊
```

---

Developed by **CHING** | Updated v6.3.3.1 2026.07.15
