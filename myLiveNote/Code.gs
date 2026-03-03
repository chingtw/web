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
const props = PropertiesService.getScriptProperties();

// Cloudflare R2 配置
const R2_CONFIG = {
  accessKeyId: props.getProperty('R2_ACCESS_KEY_ID'),
  secretAccessKey: props.getProperty('R2_SECRET_ACCESS_KEY'),
  bucketName: props.getProperty('R2_BUCKET_NAME'),
  endpoint: props.getProperty('R2_ENDPOINT'), // https://<id>.r2.cloudflarestorage.com
  region: 'auto'
};

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

    // 模式 1.3: 取得 R2 預簽名上傳網址 (Pre-signed URL)
    if (action === 'getPresignedUrl') {
      const fileName = e.parameter.fileName;
      const contentType = e.parameter.contentType;
      const path = e.parameter.path || `LiveNote/user_img/${username || 'guest'}`;
      
      if (!fileName || !contentType) return response({ status: 'error', message: 'Missing params' });
      
      const objectKey = `${path}/${Date.now()}_${fileName}`;
      const url = getS3PresignedUrl(objectKey, contentType);
      
      // 使用自定義網域 img.chingx.com，且自定義網域通常直接指向桶內，不需包含 bucketName
      const customDomain = 'https://img.chingx.com'; 
      
      return response({ 
        status: 'success', 
        uploadUrl: url, 
        publicUrl: `${customDomain}/${objectKey}`,
        objectKey: objectKey
      });
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

// --- S3 V4 SIGNATURE GENERATOR ---

function getS3PresignedUrl(objectKey, contentType) {
  const method = 'PUT';
  const region = R2_CONFIG.region;
  const service = 's3';
  const accessKey = R2_CONFIG.accessKeyId;
  const secretKey = R2_CONFIG.secretAccessKey;
  const bucket = R2_CONFIG.bucketName;
  
  if (!accessKey || !secretKey || !R2_CONFIG.endpoint) {
    throw new Error('R2 配置缺失，請檢查 Script Properties');
  }
  
  const host = R2_CONFIG.endpoint.replace('https://', '');
  const urlBase = `${R2_CONFIG.endpoint}/${bucket}/${objectKey}`;

  const now = new Date();
  const amzDate = Utilities.formatDate(now, "GMT", "yyyyMMdd'T'HHmmss'Z'");
  const datestamp = amzDate.substr(0, 8);
  const expiration = 3600;

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiration.toString(),
    'X-Amz-SignedHeaders': 'host'
  };

  const canonicalQuerystring = Object.keys(queryParams).sort().map(k => 
    encodeURIComponent(k) + '=' + encodeURIComponent(queryParams[k])
  ).join('&');
  
  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    method,
    `/${bucket}/${objectKey}`,
    canonicalQuerystring,
    canonicalHeaders,
    'host',
    payloadHash
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedHex(canonicalRequest)
  ].join('\n');

  // 強制將 stringToSign 轉為 Byte Array 計算簽名
  const signingKey = getSignatureKey(secretKey, datestamp, region, service);
  const signature = bytesToHex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob(stringToSign).getBytes(), signingKey));

  return `${urlBase}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

function hashedHex(data) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data);
  return bytesToHex(digest);
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  // kDate: 字串與字串的計算
  const kDate = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, dateStamp, "AWS4" + key);
  
  // 後續層級：必須是 (Byte[], Byte[]) 的組合，因此要將字串用 Utilities.newBlob().getBytes() 轉型
  const kRegion = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob(regionName).getBytes(), kDate);
  const kService = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob(serviceName).getBytes(), kRegion);
  const kSigning = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob("aws4_request").getBytes(), kService);
  
  return kSigning;
}

function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    if (b < 0) b += 256;
    let s = b.toString(16);
    if (s.length === 1) hex += "0";
    hex += s;
  }
  return hex;
}
