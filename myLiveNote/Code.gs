/**
 * LiveNote 後端多使用者版本 - v4.0 (極速優化版)
 */

const MAIN_SHEET = 'LiveRecords';
const CONFIG_SHEET = '_Config_';
const TEMPLATE_SHEET = '_Template_';
const VENUE_SHEET = 'venue_config';

const ss = SpreadsheetApp.getActiveSpreadsheet();
const cache = CacheService.getScriptCache();
const props = PropertiesService.getScriptProperties();

// Cloudflare R2 配置
const R2_CONFIG = {
  accessKeyId: props.getProperty('R2_ACCESS_KEY_ID'),
  secretAccessKey: props.getProperty('R2_SECRET_ACCESS_KEY'),
  bucketName: props.getProperty('R2_BUCKET_NAME'),
  endpoint: props.getProperty('R2_ENDPOINT'),
  region: 'auto'
};

function doGet(e) {
  try {
    const action = e.parameter.action;
    const username = e.parameter.u;

    if (action === 'getUsers') {
      const users = getCachedConfig(CONFIG_SHEET);
      return response(users.map(u => ({ username: u.username, display_name: u.display_name, avatar_url: u.avatar_url })));
    }

    if (action === 'getVenues') return response(getCachedConfig(VENUE_SHEET));

    if (action === 'getPresignedUrl') {
      const fileName = e.parameter.fileName;
      const contentType = e.parameter.contentType;
      const path = e.parameter.path || `LiveNote/user_img/${username || 'guest'}`;
      if (!fileName || !contentType) return response({ status: 'error', message: 'Missing params' });
      const objectKey = `${path}/${Date.now()}_${fileName}`;
      return response({ status: 'success', uploadUrl: getS3PresignedUrl(objectKey, contentType), publicUrl: `https://img.chingx.com/${objectKey}`, objectKey: objectKey });
    }

    if (action === 'login') return response({ success: !!validateUser(e.parameter.u || 'ching', e.parameter.p) });

    const targetSheetName = (username === 'ching' || !username) ? MAIN_SHEET : username;
    const sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) return response({ status: 'error', message: 'User sheet not found' });

    const range = sheet.getDataRange();
    const data = range.getValues();
    const displayValues = range.getDisplayValues();
    if (data.length <= 1) return response([]);

    const headers = data.shift();
    displayValues.shift();
    return response(data.map((row, rowIndex) => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        obj[h] = (h === 'date' || h === 'time') ? displayValues[rowIndex][i] : row[i];
      }
      return obj;
    }));
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

    const userConfig = validateUser(username, password);
    if (!userConfig) return response({ status: 'error', message: 'Unauthorized' });

    const sheet = getOrCreateUserSheet(username === 'ching' ? MAIN_SHEET : username);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    let rowIndex = -1;
    let oldTags = [];

    if (dataObj.id) {
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == dataObj.id) {
          rowIndex = i + 1;
          const tagIdx = headers.indexOf('tag');
          if (tagIdx !== -1) oldTags = String(allData[i][tagIdx] || "").split(',').map(u => u.trim()).filter(u => u !== "");
          break;
        }
      }
    }

    const currentTags = String(dataObj.tag || "").split(',').map(u => u.trim()).filter(u => u !== "");
    const newCompanions = currentTags.filter(u => u !== username && !oldTags.includes(u));
    const results = [];

    // --- A. 處理主發起人 (您自己) ---
    let finalId = dataObj.id;
    if (!finalId) {
      const dateStr = (dataObj.date || "").replace(/-/g, '');
      const prefix = `${userConfig.id_code || "CH"}-${dateStr}-`;
      let maxSeq = 0;
      for (let i = 1; i < allData.length; i++) {
        const eid = String(allData[i][0]);
        if (eid.indexOf(prefix) === 0) {
          const seq = parseInt(eid.split('-').pop());
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
      finalId = prefix + (maxSeq + 1);
      dataObj.id = finalId;
    }

    const mainRowData = headers.map(h => dataObj[h] === undefined ? '' : dataObj[h]);
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([mainRowData]);
    } else {
      sheet.appendRow(mainRowData);
    }
    results.push({ username: username, id: finalId, action: rowIndex !== -1 ? 'update' : 'append' });

    // --- B. 處理新夥伴 (遞歸互換 Tag 邏輯) ---
    newCompanions.forEach(u => {
      const targetUConfig = getCachedConfig(CONFIG_SHEET).find(usr => usr.username === u);
      if (!targetUConfig) return;

      const targetSheet = getOrCreateUserSheet(u === 'ching' ? MAIN_SHEET : u);
      const targetAllData = targetSheet.getDataRange().getValues();
      const targetHeaders = targetAllData[0];

      const dateStr = (dataObj.date || "").replace(/-/g, '');
      const prefix = `${targetUConfig.id_code || "GU"}-${dateStr}-`;
      let maxSeq = 0;
      for (let i = 1; i < targetAllData.length; i++) {
        const eid = String(targetAllData[i][0]);
        if (eid.indexOf(prefix) === 0) {
          const seq = parseInt(eid.split('-').pop());
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
      const companionId = prefix + (maxSeq + 1);
      
      // 關鍵修正：計算該夥伴在自己表內應該看到的 tag 名單
      // 邏輯：所有參與者 = [發起人A] + [原名單B, C] -> 對於 B 來說，名單應該是 [A, C]
      const allParticipants = [username, ...currentTags];
      const tagsForCompanion = allParticipants.filter(p => p !== u);

      const companionData = { ...dataObj, id: companionId, tag: tagsForCompanion.join(',') };
      const companionRow = targetHeaders.map(h => companionData[h] === undefined ? '' : companionData[h]);
      
      targetSheet.appendRow(companionRow);
      results.push({ username: u, id: companionId, action: 'sync_append' });
    });

    return response({ status: 'success', results: results });
  } catch (error) {
    return response({ status: 'error', message: error.toString() });
  }
}

function getCachedConfig(sheetName) {
  const cacheKey = `CONFIG_${sheetName}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return JSON.parse(cachedData);

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data.map(row => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
    return obj;
  });
  try { cache.put(cacheKey, JSON.stringify(result), 21600); } catch (e) {}
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

function clearAllCache() {
  cache.removeAll([`CONFIG_${CONFIG_SHEET}`, `CONFIG_${VENUE_SHEET}`]);
}

function getS3PresignedUrl(objectKey, contentType) {
  const method = 'PUT';
  const region = R2_CONFIG.region;
  const service = 's3';
  const accessKey = R2_CONFIG.accessKeyId;
  const secretKey = R2_CONFIG.secretAccessKey;
  const bucket = R2_CONFIG.bucketName;
  const host = R2_CONFIG.endpoint.replace('https://', '');
  const urlBase = `${R2_CONFIG.endpoint}/${bucket}/${objectKey}`;
  const amzDate = Utilities.formatDate(new Date(), "GMT", "yyyyMMdd'T'HHmmss'Z'");
  const datestamp = amzDate.substr(0, 8);
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const queryParams = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${accessKey}/${credentialScope}`, 'X-Amz-Date': amzDate, 'X-Amz-Expires': '3600', 'X-Amz-SignedHeaders': 'host' };
  const canonicalQuerystring = Object.keys(queryParams).sort().map(k => encodeURIComponent(k) + '=' + encodeURIComponent(queryParams[k])).join('&');
  const canonicalRequest = [method, `/${bucket}/${objectKey}`, canonicalQuerystring, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hashedHex(canonicalRequest)].join('\n');
  const signingKey = getSignatureKey(secretKey, datestamp, region, service);
  const signature = bytesToHex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob(stringToSign).getBytes(), signingKey));
  return `${urlBase}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

function hashedHex(data) { return bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data)); }
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, dateStamp, "AWS4" + key);
  const kRegion = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob(regionName).getBytes(), kDate);
  const kService = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob(serviceName).getBytes(), kRegion);
  return Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, Utilities.newBlob("aws4_request").getBytes(), kService);
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
