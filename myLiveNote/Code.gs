/**
 * LiveNote 後端程式碼 (Google Apps Script)
 * 
 * 使用方式：
 * 1. 在 Google 試算表中點選「擴充功能」 > 「Apps Script」
 * 2. 清除原本的所有程式碼，將此檔案內容完整貼上
 * 3. 修改下方的 API_KEY 為您自訂的密碼
 * 4. 點選「部署」 > 「新增部署」
 *    - 類型：網頁應用程式
 *    - 執行身分：我
 *    - 存取權限：任何人 (這很重要，前端才抓得到資料)
 * 5. 複製產生的「網頁應用程式 URL」並貼回前端 script.js 的 GAS_API_URL 中
 */

const SHEET_NAME = 'LiveRecords';
const ADMIN_PASSWORD = 'YOUR_SECRET_PASSWORD'; // 請修改此密碼，並與前端 Admin 登入時輸入的一致

/**
 * 處理 GET 請求：回傳所有參戰紀錄
 */
function doGet(e) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // 移除標題列
  
  // 將二維陣列轉換為物件陣列 [ { artist: '...', ... }, ... ]
  const jsonData = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      // 處理日期格式，確保傳回前端時是字串
      let value = row[i];
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      obj[h] = value;
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(jsonData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 POST 請求：新增或修改資料
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    
    // 簡單的密碼驗證
    if (params.password !== ADMIN_PASSWORD) {
      return response({ status: 'error', message: 'Unauthorized' });
    }

    const sheet = getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 根據標頭順序準備新列資料
    const newRow = headers.map(header => {
      let val = params.data[header];
      if (val === undefined) return '';
      return val;
    });

    sheet.appendRow(newRow);
    return response({ status: 'success', message: 'Record added successfully' });
    
  } catch (error) {
    return response({ status: 'error', message: error.toString() });
  }
}

/**
 * 輔助函式：標準化回傳格式
 */
function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 獲取試算表，若不存在則初始化
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // 初始化標頭 (對應前端欄位)
    const headers = [
      'id', 'date', 'time', 'artist', 'tour_title', 
      'venue_name', 'lat_lng', 'seat_info', 'ticket_price', 
      'setlist', 'is_first_time', 'rating', 'images', 'tags'
    ];
    sheet.appendRow(headers);
    
    // 凍結第一列
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * 手動測試用：在 Apps Script 編輯器執行此函式可以先建立好試算表標頭
 */
function initialSetup() {
  getSheet();
  Logger.log('試算表初始化完成！');
}
