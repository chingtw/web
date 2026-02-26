# LiveNote - 個人演唱會參戰紀錄系統

LiveNote 是一個專為音樂愛好者設計的個人演唱會（Live）參戰紀錄 Web App。透過 Google Sheets 作為資料庫，結合 Google Apps Script (GAS) 提供後端 API，實現資料的持久化儲存與管理。

![Ticket Demo](ticket%20demo%201.jpg)

## 🌟 特點

- **🎫 票券式 UI 設計**：以擬真票券形式展示每一次的參戰紀錄，包含藝人、演出標題、場館及座次。
- **🗺️ 場館地圖**：整合 Leaflet 地圖，自動標記所有參與過的演出場館地點。
- **📊 數據統計**：使用 Chart.js 生成統計圖表，分析最常看的藝人排行榜與場館排行榜。
- **🔍 多維度篩選**：支援按年份、藝人、狀態（已完成/預定）或里程碑進行快速篩選。
- **🔐 管理員後台**：內建密碼保護的管理模式，可直接在網頁端新增、編輯或刪除紀錄。
- **📱 響應式設計**：針對行動裝置優化，隨時隨地查看紀錄。

## 🛠️ 技術棧

- **Frontend**: 
  - HTML5 / CSS3 (Vanilla CSS)
  - JavaScript (ES6+)
  - [Leaflet.js](https://leafletjs.com/) - 地圖視覺化
  - [Chart.js](https://www.chartjs.org/) - 數據圖表
  - [Lucide Icons](https://lucide.dev/) - 圖標庫
- **Backend / Database**:
  - [Google Apps Script](https://developers.google.com/apps-script) - API 邏輯處理
  - [Google Sheets](https://www.google.com/sheets/about/) - 資料儲存

## 🚀 快速上手

### 1. 準備 Google 試算表
1. 建立一個新的 Google 試算表。
2. 將工作表命名為 `LiveRecords`。
3. 第一列需包含以下標題（順序須一致）：
   `id, date, time, type, status, artist, artist_list, tour_title, venue_name, lat_lng, seat_info, ticket_price, currency, setlist, is_first_time, images, ticket_image, tags`

### 2. 部署 Google Apps Script
1. 在試算表中點選 `擴充功能` > `Apps Script`。
2. 將專案中的 `Code.gs` 內容複製到腳本編輯器中。
3. 修改 `ADMIN_PASSWORD` 為您的管理員密碼。
4. 點選 `部署` > `新增部署`，選擇 `網頁應用程式`。
5. 設定為：
   - 執行身份：`我`
   - 誰有權存取：`所有人`
6. 部署後取得 **Web App URL**。

### 3. 設定前端
1. 開啟 `script.js`。
2. 尋找 `const GAS_API_URL` 變數。
3. 將其值替換為您剛取得的 Web App URL。

## 📂 檔案結構

```text
myLiveNote/
├── Code.gs             # Google Apps Script 後端邏輯
├── index.html          # 主程式網頁結構
├── style.css           # 票券風格與介面樣式
├── script.js           # 前端邏輯、API 串接與圖表渲染
└── ticket demo 1.jpg   # 專案演示圖示
```

## 📝 授權

本專案僅供個人學習與紀錄使用。

---
Developed by **CHING**
