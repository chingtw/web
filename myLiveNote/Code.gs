/**
 * LiveNote 後端程式碼 (Google Apps Script) - v2.3
 * 解決時區偏移問題：改用 getDisplayValues() 抓取原始文字
 */

const SHEET_NAME = 'LiveRecords';
const ADMIN_PASSWORD = 'YOUR_SECRET_PASSWORD'; 

function doGet(e) {
  try {
    const sheet = getSheet();
    const range = sheet.getDataRange();
    const data = range.getValues();        // 原始資料 (處理邏輯用)
    const displayData = range.getDisplayValues(); // 顯示資料 (確保時間文字正確)
    
    const headers = data.shift(); 
    displayData.shift(); // 移除標題列
    
    const jsonData = data.map((row, rowIndex) => {
      let obj = {};
      headers.forEach((h, i) => {
        // 對於日期和時間欄位，直接採用試算表上看到的文字 (displayData)
        // 這樣可以避免 GAS 自動轉換時區導致的時差問題
        if (h === 'date' || h === 'time') {
          obj[h] = displayData[rowIndex][i];
        } else {
          obj[h] = row[i];
        }
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(jsonData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    if (params.password !== ADMIN_PASSWORD) return response({ status: 'error', message: 'Unauthorized' });
    const sheet = getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const dataObj = params.data;
    if (!dataObj.id) dataObj.id = 'LN' + new Date().getTime();
    const newRow = headers.map(header => {
      let val = dataObj[header];
      return val === undefined ? '' : val;
    });
    sheet.appendRow(newRow);
    return response({ status: 'success', message: 'Record added successfully', id: dataObj.id });
  } catch (error) {
    return response({ status: 'error', message: error.toString() });
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['id', 'date', 'time', 'type', 'status', 'artist', 'artist_list', 'tour_title', 'venue_name', 'lat_lng', 'seat_info', 'ticket_price', 'currency', 'setlist', 'is_first_time', 'images', 'tags'];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
