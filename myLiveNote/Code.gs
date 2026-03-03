/**
 * LiveNote 後端多使用者版本 - v4.0 (極速優化版)
 * 優化重點：導入 CacheService 快取、減少 SpreadsheetApp 呼叫次數、全域變數快取
 */

const MAIN_SHEET = 'LiveRecords';
const CONFIG_SHEET = '_Config_';
const TEMPLATE_SHEET = '_Template_';
const VENUE_SHEET = 'venue_config';

// 1. 全域變數快取：在單次執行中重用物件，減少開啟 API 次數
const ss = SpreadsheetApp.getActiveSpreadsheet();
const cache = CacheService.getScriptCache();

function doGet(e) {
  try {
    const action = e.parameter.action;
    const username = e.parameter.u;

    // 模式 1: 取得使用者清單 (快取優化)
    if (action === 'getUsers') {
      const users = getCachedConfig(CONFIG_SHEET);
      // 安全起見：不包含密碼，減少傳輸量
      const publicUsers = users.map(u => ({
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url
      }));
      return response(publicUsers);
    }

    // 模式 1.2: 取得場地設定 (快取優化)
    if (action === 'getVenues') {
      return response(getCachedConfig(VENUE_SHEET));
    }

    // 模式 1.5: 驗證登入
    if (action === 'login') {
      const pass = e.parameter.p;
      const user = e.parameter.u || 'ching';
      const isValid = validateUser(user, pass);
      return response({ success: !!isValid });
    }

    // 模式 2: 取得特定使用者或主站資料
    const targetSheetName = (username === 'ching' || !username) ? MAIN_SHEET : username;
    const sheet = ss.getSheetByName(targetSheetName);
    
    if (!sheet) return response({ status: 'error', message: 'User sheet not found' });

    // 優化讀取：一次性取得所有資料，減少 getRange 呼叫
    const range = sheet.getDataRange();
    const data = range.getValues();
    const displayValues = range.getDisplayValues(); // 針對日期與時間格式
    
    if (data.length <= 1) return response([]); // 空表

    const headers = data.shift();
    displayValues.shift();
    
    // 加速 JSON 轉換邏輯
    const jsonData = data.map((row, rowIndex) => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        // 針對特定欄位使用顯示值 (Display Value)，其餘用原始值 (Raw Value)
        obj[h] = (h === 'date' || h === 'time') ? displayValues[rowIndex][i] : row[i];
      }
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

    // 1. 驗證身分 (這裡也會用到快取)
    const userConfig = validateUser(username, password);
    if (!userConfig) return response({ status: 'error', message: 'Unauthorized' });

    // 2. 取得或建立工作表
    const targetSheetName = (username === 'ching') ? MAIN_SHEET : username;
    const sheet = getOrCreateUserSheet(targetSheetName);
    
    // 3. 讀取現有資料以計算 ID 或確認更新列
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    let rowIndex = -1;
    if (dataObj.id) {
      // 用迴圈快速定位 ID
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == dataObj.id) {
          rowIndex = i + 1;
          break;
        }
      }
    } else {
      // 產生新 ID (自動化邏輯)
      const dateStr = (dataObj.date || "").replace(/-/g, '');
      const idCode = userConfig.id_code || "CH";
      const prefix = `${idCode}-${dateStr}-`;
      let maxSeq = 0;
      for (let i = 1; i < allData.length; i++) {
        const eid = String(allData[i][0]);
        if (eid.indexOf(prefix) === 0) {
          const seq = parseInt(eid.split('-').pop());
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
      dataObj.id = prefix + (maxSeq + 1);
    }

    // 4. 準備新列資料
    const newRow = headers.map(h => dataObj[h] === undefined ? '' : dataObj[h]);

    // 5. 寫入 (批次寫入)
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
      return response({ status: 'success', id: dataObj.id });
    } else {
      sheet.appendRow(newRow);
      return response({ status: 'success', id: dataObj.id });
    }
  } catch (error) {
    return response({ status: 'error', message: error.toString() });
  }
}

// --- 極速快取核心 Helper ---

/**
 * 取得帶有快取的配置資料
 * 邏輯：先看快取有沒有，沒有才讀試算表，讀完再存入快取
 */
function getCachedConfig(sheetName) {
  const cacheKey = `CONFIG_${sheetName}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // 無快取，執行慢速讀取
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data.map(row => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
    return obj;
  });

  // 將結果存入快取，效期 21600 秒 (6小時)
  try {
    cache.put(cacheKey, JSON.stringify(result), 21600);
  } catch (e) {
    // 防止資料過大超過 Cache 100KB 限制 (通常 config 不會這麼大)
  }
  
  return result;
}

function validateUser(username, password) {
  const users = getCachedConfig(CONFIG_SHEET);
  return users.find(u => u.username === username && String(u.password) === String(password));
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateUserSheet(name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    const template = ss.getSheetByName(TEMPLATE_SHEET);
    sheet = template ? template.copyTo(ss).setName(name) : ss.insertSheet(name);
  }
  return sheet;
}

/**
 * 手動清除快取 (當您手動修改試算表內容卻沒反應時，可從 GAS 編輯器執行此函數)
 */
function clearAllCache() {
  cache.removeAll([`CONFIG_${CONFIG_SHEET}`, `CONFIG_${VENUE_SHEET}`]);
}
