# LiveNote - 個人演唱會參戰紀錄系統 (v3.0)

LiveNote 是一個專為音樂愛好者設計的個人演唱會（Live）參戰紀錄 Web App。透過 Google Sheets 作為資料庫，結合 Google Apps Script (GAS) 提供後端 API，實現資料的持久化儲存、多使用者管理與智慧化的輸入體驗。

![Ticket Demo](ticket%20demo%201.jpg)

## 🌟 核心特點

- **🎫 擬真票券 UI 與翻轉效果**：以票券形式展示紀錄，點擊詳情後可「翻轉」查看實體票根照片或電子票截圖。
- **📱 PWA 支援 (Installable)**：支援「新增至主畫面」，提供全螢幕、如原生 App 般的流暢操作體驗。
- **👥 多租戶系統 (Multi-tenant)**：
  - 透過專屬 `shared.html` 入口切換不同參戰者。
  - **自動建表**：新使用者首次登入時，系統會自動根據範本建立專屬工作表。
  - **身分驗證**：內建密碼保護模式，解鎖後方可進行新增、編輯或刪除操作。
- **🧠 智慧輸入助手**：
  - **場館自動補完**：串接 Google Sheets 中的場地設定表，自動填入座標（Lat/Lng）。
  - **熱門藝人標籤**：編輯紀錄時自動統計常用藝人，點擊即可快速填入。
- **⏳ 沉浸式 UX 互動**：
  - **動態 Logo**：隨捲動變換形態的環狀標誌。
  - **捲動年份泡泡 (Scroll Timeline)**：滑動列表時自動顯示當前年份與鄰近年份指示。
  - **年份遮罩導覽**：直覺的水平橫向捲動年份篩選器。
- **📊 深度數據統計**：分析藝人與場館排行，點擊項目可即時展開該分類下的所有參戰歷史。
- **🗺️ 全球參戰地圖**：整合 Leaflet，自動標記足跡，支援點擊地圖標記查看該場地所有公演紀錄。

## 🛠️ 技術棧

- **Frontend**: 
  - HTML5 / CSS3 (Vanilla CSS + CSS Variables)
  - JavaScript (ES6+, Async/Await)
  - [Leaflet.js](https://leafletjs.com/) - 地圖視覺化
  - [Chart.js](https://www.chartjs.org/) - 數據圖表
  - [Lucide Icons](https://lucide.dev/) - 現代感圖標
- **Backend / Database**:
  - [Google Apps Script](https://developers.google.com/apps-script) - API v3.0 (支援多使用者驗證、自動初始化)
  - [Google Sheets](https://www.google.com/sheets/about/) - 關聯式資料儲存與權限配置

## 🚀 快速上手

### 1. 準備 Google 試算表
1. 建立以下三個核心工作表：
   - **`_Config_`**：使用者帳號設定。
     - 標題：`username, password, display_name, avatar_url, id_code`
     - `id_code` 會作為紀錄 ID 的前綴（例如 `CH-20250101-1`）。
   - **`_Template_`**：新使用者工作表的範本。
     - 標題：`id, date, time, type, status, artist, artist_list, tour_title, venue_name, lat_lng, seat_info, ticket_price, currency, setlist, is_first_time, images, ticket_image, tags`
   - **`venue_config`**：場地自動補完清單。
     - 標題：`venue_name, lat_lng`
   - **`LiveRecords`**：預設主管理員的工作表。

### 2. 部署後端 API
1. 開啟試算表的 `Apps Script` 編輯器。
2. 貼入 `Code.gs` 並「部署為網頁應用程式」。
3. 取得 **Web App URL** 並更新至 `script.js` 中的 `GAS_API_URL`。

### 3. 使用與擴充
- 訪問 `shared.html` 作為門口頁面（Portal）。
- 紀錄刪除採用 **軟刪除 (Soft Delete)** 機制，將狀態改為 `HIDDEN` 即可在前端隱藏而不遺失原始數據。

## 📂 檔案結構

```text
myLiveNote/
├── Code.gs             # GAS v3.0 後端邏輯 (處理 Auth, 自動化建表)
├── index.html          # 主站主體 (MASTER)
├── shared.html         # PWA 入口與參戰者選單 (Portal)
├── style.css           # 包含票券翻轉、動態 Logo 等現代化樣式
├── script.js           # 核心邏輯：PWA 整合、地圖渲染、統計分析
├── sw.js               # Service Worker (PWA 離線快取支援)
└── manifest.json       # PWA 配置與 Web App 資訊
```

---
Developed by **CHING**