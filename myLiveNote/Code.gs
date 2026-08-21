/**
 * LiveNote 後端多使用者版本 - v7.0 (Google Calendar 同步整合版)
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
      return response(users.map(u => ({
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        has_calendar: !!(u.calendar_id && String(u.calendar_id).trim() !== '')
      })));
    }

    if (action === 'getVenues') return response(getCachedConfig(VENUE_SHEET));

    if (action === 'getCalendarLink') {
      const password = e.parameter.p;
      const userConfig = validateUser(username, password);
      if (!userConfig) return response({ status: 'error', message: 'Unauthorized' });
      const calId = userConfig.calendar_id || '';
      if (!calId) return response({ status: 'error', message: '尚未有訂閱日曆，請聯繫管理員' });
      return response({
        status: 'success',
        calendarId: calId,
        subscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calId)}`
      });
    }

    if (action === 'getPresignedUrl') {
      const fileName = e.parameter.fileName;
      const contentType = e.parameter.contentType;
      const path = e.parameter.path || `LiveNote/user_img/${username || 'guest'}`;
      if (!fileName || !contentType) return response({ status: 'error', message: 'Missing params' });
      const objectKey = `${path}/${Date.now()}_${fileName}`;
      return response({ status: 'success', uploadUrl: getS3PresignedUrl(objectKey, contentType), publicUrl: `https://img.chingx.com/${objectKey}`, objectKey: objectKey });
    }

    if (action === 'login') {
      const user = validateUser(e.parameter.u || 'ching', e.parameter.p);
      return response({
        success: !!user,
        has_calendar: !!(user && user.calendar_id && String(user.calendar_id).trim() !== '')
      });
    }

    const targetSheetName = (username === 'ching' || !username) ? MAIN_SHEET : username;
    const sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) return response({ status: 'error', message: 'User sheet not found' });

    // 優化：移除 getDisplayValues()，改用 getValues() 並在後端統一轉換
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return response([]);

    const headers = data.shift().map(h => String(h).trim().toLowerCase());
    const results = data.map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val instanceof Date) {
          if (val.getFullYear() === 1899) {
            val = Utilities.formatDate(val, "GMT+8", "HH:mm");
          } else {
            val = Utilities.formatDate(val, "GMT+8", "yyyy-MM-dd");
          }
        }
        obj[h] = val;
      });
      return obj;
    });
    return response(results);
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

    // ── Calendar 同步 action ──
    if (params.action === 'syncCalendar') {
      const userConfig = validateUser(username, password);
      if (!userConfig) return response({ status: 'error', message: 'Unauthorized' });

      const calId = userConfig.calendar_id || '';
      if (!calId) return response({ status: 'error', message: '尚未設定 calendar_id，請聯繫管理員' });

      const sheetName = username === 'ching' ? MAIN_SHEET : username;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return response({ status: 'error', message: 'Sheet not found' });

      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const calEventIdIdx = headers.indexOf('calendar_event_id');

      // 找到目標 row
      let rowIndex = -1;
      let rowData = null;
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][0]) === String(params.recordId)) {
          rowIndex = i + 1;
          rowData = {};
          headers.forEach((h, idx) => {
            let val = allData[i][idx];
            // 與 doGet 一致：將 Date 物件轉成字串
            if (val instanceof Date) {
              if (val.getFullYear() === 1899) {
                val = Utilities.formatDate(val, "GMT+8", "HH:mm"); // time 欄位
              } else {
                val = Utilities.formatDate(val, "GMT+8", "yyyy-MM-dd"); // date 欄位
              }
            }
            rowData[h] = val;
          });
          break;
        }
      }
      if (!rowData) return response({ status: 'error', message: 'Record not found' });

      const existingEventId = (calEventIdIdx !== -1) ? String(rowData.calendar_event_id || '') : '';
      const eventId = syncLiveToCalendar(rowData, calId, existingEventId);

      // 把 event_id 寫回 Sheet
      if (calEventIdIdx !== -1 && rowIndex !== -1) {
        sheet.getRange(rowIndex, calEventIdIdx + 1).setValue(eventId);
      }

      return response({ status: 'success', eventId: eventId });
    }
    // ────────────────────────────

    const userConfig = validateUser(username, password);
    if (!userConfig) return response({ status: 'error', message: 'Unauthorized' });

    const sheetName = username === 'ching' ? MAIN_SHEET : username;
    const sheet = getOrCreateUserSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const lastRow = allData.length;
    
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

    // --- A. 處理主發起人 ---
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
    // 優化：改用 getRange.setValues 替代 appendRow
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([mainRowData]);
    } else {
      sheet.getRange(lastRow + 1, 1, 1, headers.length).setValues([mainRowData]);
    }
    results.push({ username: username, id: finalId, action: rowIndex !== -1 ? 'update' : 'append' });

    // --- B. 處理新夥伴 ---
    if (newCompanions.length > 0) {
      const allConfigs = getCachedConfig(CONFIG_SHEET);
      newCompanions.forEach(u => {
        const targetUConfig = allConfigs.find(usr => usr.username === u);
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
        const allParticipants = [username, ...currentTags];
        const tagsForCompanion = allParticipants.filter(p => p !== u);

        const companionData = { ...dataObj, id: companionId, tag: tagsForCompanion.join(',') };
        const companionRow = targetHeaders.map(h => companionData[h] === undefined ? '' : companionData[h]);
        
        targetSheet.getRange(targetAllData.length + 1, 1, 1, targetHeaders.length).setValues([companionRow]);
        results.push({ username: u, id: companionId, action: 'sync_append' });
      });
    }

    return response({ status: 'success', results: results });
  } catch (error) {
    return response({ status: 'error', message: error.toString() });
  }
}
//日曆測試用
function testCalendarId() {                                                     
      const users = getCachedConfig(CONFIG_SHEET);                                  
      users.forEach(u => Logger.log(`${u.username} → calendar_id: "${u.             
  calendar_id}"`));                                                                 
}          
//日曆授權用
function authorizeCalendar() {                                                  
      const cal = CalendarApp.                                                      
  getCalendarById('76bd934cad2aa0c5783cbe26c4535fda9f22f3016535c53b097d4b996ec68eb2@group.calendar.google.com');                                                      
      Logger.log('日曆名稱：' + cal.getName());                                     
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

function updateStatusToCompleted() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  // 取得今日日期，並將時間歸零至凌晨 00:00:00 以便精準備較
  var today = new Date();
  today.setHours(0, 0, 0, 0); 

  // 定義不需要執行此排查的工作表名稱（可自行增減）
  var excludeSheets = ['_Config_', '_Template_', 'venue_config'];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();

    // 略過不需要處理的工作表
    if (excludeSheets.includes(sheetName)) continue;

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();

    // 如果工作表只有標題或為空，則跳過
    if (values.length <= 1) continue; 

    // 自動尋找 'date' 與 'status' 所在的欄位索引
    var headers = values[0];
    var dateColIdx = headers.indexOf('date');
    var statusColIdx = headers.indexOf('status');

    // 若該工作表沒有這兩個欄位，則跳過
    if (dateColIdx === -1 || statusColIdx === -1) continue; 

    var statusUpdated = false;

    // 從第 2 列開始逐筆檢查（索引值為 1）
    for (var i = 1; i < values.length; i++) {
      var rowStatus = values[i][statusColIdx];
      var rowDateVal = values[i][dateColIdx];

      if (rowStatus === 'CONFIRMED') {
        var parsedDate = new Date(rowDateVal);
        
        // 確保日期格式有效，並且日期早於今天
        if (!isNaN(parsedDate.getTime()) && parsedDate < today) {
          values[i][statusColIdx] = 'COMPLETED';
          statusUpdated = true;
        }
      }
    }

    // 若有資料被修改，則將整批資料寫回工作表以提升執行效能
    if (statusUpdated) {
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  }
}

/**
 * 建立或更新 Google Calendar 事件
 * @param {Object} d - Live 記錄物件
 * @param {string} calendarId - 目標行事曆 ID
 * @param {string} existingEventId - 既有的 Event ID（用於更新）
 * @returns {string} Calendar Event ID
 */
function syncLiveToCalendar(d, calendarId, existingEventId) {
  const cal = CalendarApp.getCalendarById(calendarId);
  if (!cal) throw new Error(`找不到行事曆 ID：${calendarId}`);

  const dateStr = d.date ? String(d.date) : '';
  if (!dateStr) throw new Error('記錄缺少 date 欄位');

  const title = `${d.tour_title || d.artist || 'Live'} - LiveNote`;
  const location = (d.venue_name || '').split(/[、,]+/)[0].trim();
  const description = buildCalendarDescription(d);

  // 計算開始/結束時間
  const timeStr = d.time ? String(d.time).trim() : '';
  let startDate, endDate, isAllDay = false;

  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    // 有 time 欄位：建立有時間的事件（GMT+8）
    startDate = new Date(`${dateStr}T${timeStr}:00+08:00`);
    endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // +3 小時
  } else {
    // 無 time：全天事件
    startDate = new Date(dateStr);
    isAllDay = true;
  }

  let event = null;
  if (existingEventId) {
    try { event = cal.getEventById(existingEventId); } catch (e) { event = null; }
  }

  if (event) {
    // 更新現有事件
    event.setTitle(title);
    event.setLocation(location);
    event.setDescription(description);
    if (!isAllDay) event.setTime(startDate, endDate);
    return existingEventId;
  } else {
    // 新增事件
    let newEvent;
    if (isAllDay) {
      newEvent = cal.createAllDayEvent(title, startDate, { location, description });
    } else {
      newEvent = cal.createEvent(title, startDate, endDate, { location, description });
    }
    return newEvent.getId();
  }
}

function buildCalendarDescription(d) {
  const lines = [];
  if (d.tour_title)  lines.push(`${d.tour_title}`);
  if (d.artist)      lines.push(`ARTIST ：${d.artist}`);
  if (d.venue_name)  lines.push(`VENUE  ：${d.venue_name}`);
  const dateDisplay = [d.date, d.time].filter(Boolean).join(' ');
  if (dateDisplay)   lines.push(`DATE   ：${dateDisplay}`);
  if (d.seat_info)   lines.push(`SEAT   ：${d.seat_info}`);
  if (d.status)      lines.push(`TYPE   ：${d.status}`);

  // 把 tag 的 username 對應到 display_name
  if (d.tag) {
    const allConfigs = getCachedConfig(CONFIG_SHEET);
    const companionNames = String(d.tag).split(',')
      .map(u => u.trim())
      .filter(u => u !== '')
      .map(u => {
        const found = allConfigs.find(c => c.username === u);
        return found ? (found.display_name || u) : u;
      });
    if (companionNames.length > 0) {
      lines.push(`WITH   ：${companionNames.join('、')}`);
    }
  }

  if (d.id)  lines.push(`LiveNoteID :${d.id}`);
  lines.push(`\n FOR LiveNote App`);
  return lines.join('\n');
}
