/**
 * ReviewService - Logic Spaced Repetition thuần túy
 * Không DOM, không API — chỉ tính toán
 */

const ReviewService = {
  INTERVALS: { 0: 1, 1: 3, 2: 7, 3: 15, 4: 30, 5: 60 },

  // ── Date helpers (dùng chung) ──

  getToday() {
    return new Date().toISOString().split('T')[0];
  },

  getTomorrow() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },

  addDays(dateStr, days) {
    var d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },

  // ── Tính ngày ôn tiếp theo ──

  getNextReviewDate(level) {
    var days = this.INTERVALS[level] || 120;
    return this.addDays(this.getToday(), days);
  },

  // ── Text processing ──

  /** Bỏ dấu pinyin: "nǐ hǎo" → "ni hao" */
  stripTones(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
  },

  /** Chuẩn hóa: lowercase, trim, bỏ khoảng trắng thừa */
  normalize(str) {
    return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  },

  // ── Kiểm tra đáp án ──

  /** Kiểm tra pinyin (không dấu) */
  checkPinyin(userInput, correctPinyin) {
    var clean = function(s) {
      return ReviewService.stripTones(ReviewService.normalize(s));
    };
    return clean(userInput) === clean(correctPinyin);
  },

  /** Parse nghĩa: "giáo viên|thầy" → ["giáo viên", "thầy"] */
  parseMeanings(meaningStr) {
    return (meaningStr || '').split('|').map(function(s) {
      return s.trim();
    }).filter(Boolean);
  },

  /** Kiểm tra nghĩa (đúng 1 trong nhiều) */
  checkMeaning(userInput, meaningStr) {
    var input = this.normalize(userInput);
    return this.parseMeanings(meaningStr).some(function(m) {
      return ReviewService.normalize(m) === input;
    });
  },

  // ── Xử lý kết quả ôn tập ──

  /** Khi bấm "Đã nhớ" */
  processCorrect(word) {
    var level = word.level || 0;
    var correctStreak = (word.correctStreak || 0) + 1;

    if (correctStreak >= CONFIG.STREAK_TO_LEVEL_UP) {
      level += 1;
      correctStreak = 0;
    }

    return {
      level: level,
      correctStreak: correctStreak,
      wrongCount: word.wrongCount || 0,
      lastReview: this.getToday(),
      nextReview: this.getNextReviewDate(level),
    };
  },

  /** Khi bấm "Chưa nhớ" */
  processWrong(word) {
    var level = Math.max((word.level || 0) - 1, CONFIG.MIN_LEVEL);

    return {
      level: level,
      correctStreak: 0,
      wrongCount: (word.wrongCount || 0) + 1,
      lastReview: this.getToday(),
      nextReview: this.getTomorrow(),
    };
  },

  // ── Thống kê ──

  calcStats(results) {
    var total = results.length;
    var correct = results.filter(function(r) { return r.pinyinOk && r.meaningOk; }).length;
    var wrong = total - correct;
    var percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total: total, correct: correct, wrong: wrong, percent: percent };
  },
};
