# LiveNote - 個人演唱會參戰紀錄系統 (v4.3)

LiveNote 是一個專為音樂愛好者設計的個人演唱會（Live）參戰紀錄 Web App。透過 Google Sheets 作為資料庫，結合 Google Apps Script (GAS) 提供後端 API，實現資料的持久化儲存、多使用者管理與智慧化的輸入體驗。

![Ticket Demo](ticket%20demo%201.jpg)

## 🌟 核心特點 (v4.5 更新)

- **🎫 擬真票券 UI 與翻轉效果**：以票券形式展示紀錄，點擊詳情後可「翻轉」查看實體票根照片或電子票截圖。
- **📱 PWA 終極優化 (Smart Install Banner)**：
  - **卡片式點擊設計**：移除傳統按鈕，將整個 Banner 轉化為可點擊的互動卡片，點擊即觸發安裝。
  - **極速滑動避讓**：偵測到頁面捲動或手指觸摸時，Banner 會以 0.1s 的速度瞬間縮回，確保不擋住 List、Map 或 Stats 內容。
  - **手機版物理隔離**：在行動裝置上自動靠左對齊並縮小寬度，避開右下角的「置頂按鈕」與「使用者切換按鈕」。
  - **Session 智慧紀錄**：使用 `sessionStorage` 紀錄關閉狀態，關閉後在本次工作階段內不再出現，重新開啟瀏覽器則再次提醒。
- **👥 參戰者入口門廊 (Portal Overlay)**：
  - **沉浸式選擇頁面**：專屬 `shared.html` 提供精美的 Access Pass 選擇介面。
  - **智慧狀態管理**：在入口頁時自動隱藏功能性按鈕（如快速切換），並優化 PWA Banner 位置以避開導覽連結。
  - **自動建表與身分驗證**：新使用者首次進入時自動初始化專屬工作表，內建管理員密碼保護模式。
- **🧠 智慧輸入助手**：
  - **場館自動補完**：串接 Google Sheets 中的場地設定表，自動填入座標（Lat/Lng）。
  - **熱門藝人標籤**：編輯紀錄時自動統計常用藝人，點擊即可快速填入。
- **📊 深度數據統計與地圖足跡**：
  - **數據洞察**：分析藝人與場館排行，點擊項目可即時展開該分類下的所有參戰歷史。
  - **全球參戰地圖**：整合 Leaflet，自動標記足跡，點擊地圖標記查看場地歷史。

## 🛠️ 技術棧 (Tech Stack)

- **Frontend**: 
  - HTML5 / CSS3 (Vanilla CSS + 動態變數)
  - JavaScript (ES6+, Async/Await)
  - [Leaflet.js](https://leafletjs.com/) - 地圖視覺化
  - [Chart.js](https://www.chartjs.org/) - 數據圖表
  - [Lucide Icons](https://lucide.dev/) - 現代感圖標
- **Backend / Database**:
  - [Google Apps Script](https://developers.google.com/apps-script) - API v3.0 (支援多使用者驗證、自動初始化)
  - [Google Sheets](https://www.google.com/sheets/about/) - 關聯式資料儲存與權限配置

## 🚀 快速上手

### 1. 準備 Google 試算表
1. 建立以下核心工作表：
   - **`_Config_`**：使用者帳號設定（`username, password, display_name, avatar_url, id_code`）。
   - **`_Template_`**：新使用者工作表範本。
   - **`venue_config`**：場地座標補完清單。
   - **`LiveRecords`**：預設管理員工作表。

### 2. 部署後端 API
1. 開啟 Apps Script 編輯器，部署 `Code.gs` 為「網頁應用程式」。
2. 取得 Web App URL 並更新至 `script.js` 中的 `GAS_API_URL`。

### 3. PWA 部署建議
- 確保所有檔案（含 `manifest.json` 與 `sw.js`）皆透過 HTTPS 訪問，以啟用 PWA 安裝功能。

## 📂 檔案結構

```text
myLiveNote/
├── Code.gs             # GAS v3.0 後端邏輯 (Auth, 自動化建表)
├── index.html          # 主站主體 (MASTER)
├── shared.html         # PWA 入口、參戰者選擇 (Portal) 與優化版 Install Banner
├── style.css           # 票券翻轉、動態 Logo、手機版避讓樣式
├── script.js           # 核心邏輯：PWA 整合、地圖渲染、統計分析
├── sw.js               # Service Worker (離線快取支援)
└── manifest.json       # PWA 配置資訊
```

---

Developed by **CHING** | Updated v4.5 2026.03.03

