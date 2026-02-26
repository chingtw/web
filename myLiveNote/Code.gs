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
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataObj = params.data;
    
    let rowIndex = -1;
    if (dataObj.id) {
      // 尋找現有 ID 的索引 (從第 2 列開始找)
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == dataObj.id) {
          rowIndex = i + 1;
          break;
        }
      }
    } else {
      // 產生新 ID: CH-YYYYMMDD-X
      const dateStr = dataObj.date.replace(/-/g, ''); // 轉為 YYYYMMDD
      const prefix = "CH-" + dateStr + "-";
      
      // 找出當天已有的最大序號
      let maxSeq = 0;
      for (let i = 1; i < data.length; i++) {
        const existingId = String(data[i][0]);
        if (existingId.startsWith(prefix)) {
          const parts = existingId.split('-');
          const seq = parseInt(parts[parts.length - 1]);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
      dataObj.id = prefix + (maxSeq + 1);
    }

    const newRow = headers.map(header => {
      let val = dataObj[header];
      return val === undefined ? '' : val;
    });

    if (rowIndex !== -1) {
      // 更新現有列
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
      return response({ status: 'success', message: 'Record updated successfully', id: dataObj.id });
    } else {
      // 新增一列
      sheet.appendRow(newRow);
      return response({ status: 'success', message: 'Record added successfully', id: dataObj.id });
    }
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
    const headers = ['id', 'date', 'time', 'type', 'status', 'artist', 'artist_list', 'tour_title', 'venue_name', 'lat_lng', 'seat_info', 'ticket_price', 'currency', 'setlist', 'is_first_time', 'images', 'ticket_image', 'tags'];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
