# LiveNote - 個人演唱會參戰紀錄系統

LiveNote 是一個專為音樂愛好者設計的個人演唱會（Live）參戰紀錄 Web App。透過 Google Sheets 作為資料庫，結合 Google Apps Script (GAS) 提供後端 API，實現資料的持久化儲存與多使用者管理。

![Ticket Demo](ticket%20demo%201.jpg)

## 🌟 核心特點

- **🎫 票券式 UI 設計**：以擬真票券形式展示每一次的參戰紀錄，包含藝人、演出標題、場館及座次。
- **👥 多使用者系統 (Access Pass)**：支援多個獨立使用者的紀錄切換，透過專屬的 `shared.html` 參戰者入口（Portal）選擇不同的通行證（Access Pass），並帶有快速切換的懸浮選單。
- **🗺️ 場館地圖**：整合 Leaflet 地圖，自動標記所有參與過的演出場館地點。
- **📊 數據統計**：使用 Chart.js 生成統計圖表，分析最常看的藝人排行榜與場館排行榜。
- **⏳ 時間軸導覽**：直覺的年份捲動時間軸（Timeline），快速定位不同年份的參戰紀錄。
- **🔍 多維度篩選**：支援按年份、藝人、狀態（已完成/預定）或里程碑進行快速篩選。
- **🔐 管理員後台**：內建密碼保護的管理模式，依據不同使用者的設定，可直接在網頁端新增、編輯或刪除專屬紀錄。
- **📱 響應式設計**：針對行動裝置優化，支援手機版雙排顯示，隨時隨地查看紀錄。

## 🛠️ 技術棧

- **Frontend**: 
  - HTML5 / CSS3 (Vanilla CSS)
  - JavaScript (ES6+)
  - [Leaflet.js](https://leafletjs.com/) - 地圖視覺化
  - [Chart.js](https://www.chartjs.org/) - 數據圖表
  - [Lucide Icons](https://lucide.dev/) - 圖標庫
- **Backend / Database**:
  - [Google Apps Script](https://developers.google.com/apps-script) - API 邏輯處理 (v3.0 支援多使用者與自動建立工作表)
  - [Google Sheets](https://www.google.com/sheets/about/) - 資料儲存與帳號配置

## 🚀 快速上手

### 1. 準備 Google 試算表
1. 建立一個新的 Google 試算表。
2. 建立以下三個工作表：
   - **`LiveRecords`**：主站管理員（預設為 `ching`）的紀錄表。
     - 第一列標題：`id, date, time, type, status, artist, artist_list, tour_title, venue_name, lat_lng, seat_info, ticket_price, currency, setlist, is_first_time, images, ticket_image, tags`
   - **`_Config_`**：多使用者帳號設定表。
     - 第一列標題：`username, password, display_name, avatar_url, id_code`
     - 填入您的使用者資料（例如 `username: ching`）。
   - **`_Template_`**（可選）：新使用者自動建立紀錄表時的範本，第一列標題需與 `LiveRecords` 相同。

### 2. 部署 Google Apps Script
1. 在試算表中點選 `擴充功能` > `Apps Script`。
2. 將專案中的 `Code.gs` 內容複製到腳本編輯器中。
3. 點選 `部署` > `新增部署`，選擇 `網頁應用程式`。
4. 設定為：
   - 執行身份：`我`
   - 誰有權存取：`所有人`
5. 部署後取得 **Web App URL**。

### 3. 設定前端
1. 開啟 `script.js`。
2. 尋找 `const GAS_API_URL` 變數。
3. 將其值替換為您剛取得的 Web App URL。

## 📂 檔案結構

```text
myLiveNote/
├── Code.gs             # Google Apps Script 後端邏輯 (含多使用者驗證)
├── index.html          # 主站網頁結構 (MASTER)
├── shared.html         # 參戰者入口與多使用者切換頁面 (Portal)
├── style.css           # 票券風格、入口頁面與介面樣式
├── script.js           # 前端邏輯、API 串接與圖表渲染
└── ticket demo 1.jpg   # 專案演示圖示
```

## 📝 授權

本專案僅供個人學習與紀錄使用。

---
Developed by **CHING**