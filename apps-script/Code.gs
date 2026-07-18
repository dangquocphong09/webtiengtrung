/**
 * Google Apps Script - REST API cho web app học tiếng Trung
 *
 * GET  ?action=words          → Lấy toàn bộ từ
 * GET  ?action=review         → Lấy từ cần ôn (nextReview <= today)
 * GET  ?action=categories     → Danh sách category duy nhất
 * GET  ?action=review&category=X → Từ cần ôn theo danh mục
 * POST { action: "createWord",    word: {...} }
 * POST { action: "updateWord",    word: {...} }
 * POST { action: "deleteWord",    id }
 * POST { action: "toggleFavorite", id, favorite }
 * POST { action: "updateReview",  id, level, correctStreak, wrongCount, lastReview, nextReview }
 */

var HEADERS = [
  'id', 'hanzi', 'pinyin', 'meaning',
  'example', 'examplePinyin', 'exampleMeaning',
  'category', 'favorite', 'level', 'correctStreak', 'wrongCount',
  'lastReview', 'nextReview', 'createdAt'
];

// ── Sheet helpers ──

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
}

function ensureHeaders() {
  var sheet = getSheet();
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function getAllData() {
  ensureHeaders();
  var sheet = getSheet();
  var range = sheet.getDataRange();
  if (range.getNumRows() < 2) return [];
  var values = range.getValues();
  var headers = values[0];
  return values.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(data) {
  ensureHeaders();
  var sheet = getSheet();
  var row = HEADERS.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
  sheet.appendRow(row);
}

function findById(id) {
  var data = getAllData();
  var index = data.findIndex(function(row) { return String(row.id) === String(id); });
  if (index === -1) return null;
  return { rowNum: index + 2, data: data[index] };
}

function updateRow(rowNum, data) {
  var sheet = getSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function(h, i) {
    if (data[h] !== undefined) {
      sheet.getRange(rowNum, i + 1).setValue(data[h]);
    }
  });
}

function deleteRow(rowNum) {
  getSheet().deleteRow(rowNum);
}

// ── Response ──

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET ──

function doGet(e) {
  var action = e.parameter.action;
  var today = new Date().toISOString().split('T')[0];

  if (action === 'words') {
    return json({ words: getAllData() });
  }

  if (action === 'review') {
    var category = e.parameter.category;
    var words = getAllData().filter(function(w) {
      var due = w.nextReview && String(w.nextReview) <= today;
      if (category) return due && w.category === category;
      return due;
    });
    return json({ words: words });
  }

  if (action === 'categories') {
    var cats = {};
    getAllData().forEach(function(w) {
      if (w.category) cats[w.category] = true;
    });
    return json({ categories: Object.keys(cats).sort() });
  }

  return json({ error: 'Unknown action' });
}

// ── POST ──

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === 'createWord') {
    var today = new Date().toISOString().split('T')[0];
    var now = new Date().toISOString();
    var w = body.word;
    var newWord = {
      id: Utilities.getUuid(),
      hanzi: w.hanzi || '',
      pinyin: w.pinyin || '',
      meaning: w.meaning || '',
      example: w.example || '',
      examplePinyin: w.examplePinyin || '',
      exampleMeaning: w.exampleMeaning || '',
      category: w.category || '',
      favorite: false,
      level: 0,
      correctStreak: 0,
      wrongCount: 0,
      lastReview: '',
      nextReview: today,
      createdAt: now
    };
    appendRow(newWord);
    return json({ success: true, word: newWord });
  }

  if (action === 'updateWord') {
    var found = findById(body.word.id);
    if (!found) return json({ error: 'Word not found' });
    updateRow(found.rowNum, body.word);
    return json({ success: true });
  }

  if (action === 'deleteWord') {
    var found = findById(body.id);
    if (!found) return json({ error: 'Word not found' });
    deleteRow(found.rowNum);
    return json({ success: true });
  }

  if (action === 'toggleFavorite') {
    var found = findById(body.id);
    if (!found) return json({ error: 'Word not found' });
    updateRow(found.rowNum, { favorite: body.favorite });
    return json({ success: true });
  }

  if (action === 'updateReview') {
    var found = findById(body.id);
    if (!found) return json({ error: 'Word not found' });
    updateRow(found.rowNum, {
      level: body.level,
      correctStreak: body.correctStreak,
      wrongCount: body.wrongCount,
      lastReview: body.lastReview,
      nextReview: body.nextReview
    });
    return json({ success: true });
  }

  return json({ error: 'Unknown action' });
}
