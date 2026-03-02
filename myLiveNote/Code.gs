/**
 * LiveNote 後端多使用者版本 - v3.0
 * 支援分頁隔離、多使用者密碼驗證與自動建立工作表
 */

const MAIN_SHEET = 'LiveRecords'; // 預設主站工作表
const CONFIG_SHEET = '_Config_';  // 使用者設定表
const TEMPLATE_SHEET = '_Template_'; // 工作表範本

function doGet(e) {
  try {
    const action = e.parameter.action;
    const username = e.parameter.u;

    // 模式 1: 取得使用者清單 (用於入口頁 portal)
    if (action === 'getUsers') {
      const users = getUsersConfig();
      // 安全起見，回傳給前端時不包含密碼
      const publicUsers = users.map(u => ({
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url
      }));
      return response(publicUsers);
    }

    // 模式 1.2: 取得場地設定 (用於編輯表單 Autocomplete)
    if (action === 'getVenues') {
      return response(getVenuesConfig());
    }

    // 模式 1.5: 驗證登入 (用於前端解鎖)
    if (action === 'login') {
      const pass = e.parameter.p;
      const user = e.parameter.u || MAIN_SHEET;
      const isValid = validateUser(user, pass);
      return response({ success: !!isValid });
    }

    // 模式 2: 取得特定使用者或主站資料
    // 修改：如果 u 是 'ching' 或沒帶參數，都強制對應到主站 LiveRecords
    const targetSheetName = (username === 'ching' || !username) ? MAIN_SHEET : username;
    const sheet = getSheetByName(targetSheetName);
    
    if (!sheet) {
      return response({ status: 'error', message: 'User sheet not found' });
    }

    const range = sheet.getDataRange();
    const data = range.getValues();
    const displayData = range.getDisplayValues();
    
    const headers = data.shift(); 
    displayData.shift();
    
    const jsonData = data.map((row, rowIndex) => {
      let obj = {};
      headers.forEach((h, i) => {
        if (h === 'date' || h === 'time') {
          obj[h] = displayData[rowIndex][i];
        } else {
          obj[h] = row[i];
        }
      });
      return obj;
    });

    return response(jsonData);
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const username = params.username;
    const password = params.password;
    const dataObj = params.data;

    // 1. 驗證身分
    const userConfig = validateUser(username, password);
    if (!userConfig) {
      return response({ status: 'error', message: 'Unauthorized: Invalid username or password' });
    }

    // 2. 取得或建立該使用者的工作表
    // 修改：確保 ching 永遠對應到 MAIN_SHEET
    const targetSheetName = (username === 'ching') ? MAIN_SHEET : username;
    const sheet = getOrCreateUserSheet(targetSheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    let rowIndex = -1;
    if (dataObj.id) {
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == dataObj.id) {
          rowIndex = i + 1;
          break;
        }
      }
    } else {
      // 產生新 ID Logic
      const dateStr = dataObj.date.replace(/-/g, '');
      // 使用 config 中的 id_code 欄位，若無則預設回退為 CH
      const idCode = userConfig.id_code || "CH";
      const prefix = idCode + "-" + dateStr + "-";
      let maxSeq = 0;
      for (let i = 1; i < allData.length; i++) {
        const existingId = String(allData[i][0]);
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
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
      return response({ status: 'success', message: 'Record updated', id: dataObj.id });
    } else {
      sheet.appendRow(newRow);
      return response({ status: 'success', message: 'Record added', id: dataObj.id });
    }
  } catch (error) {
    return response({ status: 'error', message: error.toString() });
  }
}

// --- HELPERS ---

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetByName(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getUsersConfig() {
  const sheet = getSheetByName(CONFIG_SHEET);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getVenuesConfig() {
  const sheet = getSheetByName('venue_config');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function validateUser(username, password) {
  // 為了向下相容，如果沒有提供 username，則嘗試匹配主站管理員 (假設主站在 config 第一筆或有特定標記)
  // 但建議之後 index.html 也帶上 username: 'ching'
  const users = getUsersConfig();
  return users.find(u => u.username === username && String(u.password) === String(password));
}

function getOrCreateUserSheet(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(username);
  
  if (!sheet) {
    const template = ss.getSheetByName(TEMPLATE_SHEET);
    if (template) {
      sheet = template.copyTo(ss).setName(username);
    } else {
      // 如果沒範本，建立一個基礎的
      sheet = ss.insertSheet(username);
      const headers = ['id', 'date', 'time', 'type', 'status', 'artist', 'artist_list', 'tour_title', 'venue_name', 'lat_lng', 'seat_info', 'ticket_price', 'currency', 'setlist', 'is_first_time', 'images', 'ticket_image', 'tags'];
      sheet.appendRow(headers);
    }
  }
  return sheet;
}
