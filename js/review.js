/**
 * ReviewApp - UI Module cho ôn tập Spaced Repetition
 * Phụ thuộc: ReviewService, API, CONFIG, utils
 */

const ReviewApp = {
  // ── State ──
  words: [],
  currentIndex: 0,
  mode: 'daily',
  category: null,
  results: [],

  // ── Bắt đầu phiên ôn ──

  async start(mode, category) {
    this.mode = mode;
    this.category = category || null;
    this.results = [];
    this.currentIndex = 0;

    showLoading();
    try {
      var words;
      if (mode === 'daily') {
        var res = await API.getReviewWords();
        words = res.words || [];
      } else if (mode === 'category') {
        var res = await API.getReviewWordsByCategory(category);
        words = res.words || [];
      } else {
        var res = await API.getWords();
        words = this.shuffle(res.words || []);
      }

      if (words.length === 0) {
        showToast('Không có từ nào để ôn', 'info');
        return;
      }

      this.words = words;
      document.getElementById('mode-select').style.display = 'none';
      document.getElementById('review-area').style.display = 'block';
      this.showCard();
    } catch (err) {
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  },

  // ── Hiển thị flashcard ──

  showCard() {
    if (this.currentIndex >= this.words.length) {
      this.showDone();
      return;
    }

    var card = document.getElementById('flashcard');
    var word = this.words[this.currentIndex];

    // Animation: fade out → đổi nội dung → fade in
    card.classList.add('flashcard--exit');
    setTimeout(function() {
      // Hanzi
      document.getElementById('card-hanzi').textContent = word.hanzi;

      // Reset input
      var inputPinyin = document.getElementById('input-pinyin');
      var inputMeaning = document.getElementById('input-meaning');
      inputPinyin.value = '';
      inputMeaning.value = '';
      inputPinyin.className = 'flashcard__input';
      inputMeaning.className = 'flashcard__input';
      inputPinyin.disabled = false;
      inputMeaning.disabled = false;

      // Hiển thị input, giấu đáp án
      document.getElementById('input-area').style.display = 'block';
      document.getElementById('card-answer').style.display = 'none';
      document.getElementById('check-btn').style.display = 'block';
      document.getElementById('check-btn').disabled = false;
      document.getElementById('review-actions').style.display = 'none';

      inputPinyin.focus();

      // Progress
      var total = ReviewApp.words.length;
      var pct = Math.round((ReviewApp.currentIndex / total) * 100);
      document.getElementById('progress-label').textContent =
        (ReviewApp.currentIndex + 1) + ' / ' + total;
      document.getElementById('progress-percent').textContent = pct + '%';
      document.getElementById('progress-fill').style.width = pct + '%';

      card.classList.remove('flashcard--exit');
      card.classList.add('flashcard--enter');
      setTimeout(function() {
        card.classList.remove('flashcard--enter');
      }, 50);
    }, 250);
  },

  // ── Kiểm tra đáp án ──

  checkAnswer() {
    var word = this.words[this.currentIndex];
    var inputPinyin = document.getElementById('input-pinyin');
    var inputMeaning = document.getElementById('input-meaning');

    var pinyinOk = ReviewService.checkPinyin(inputPinyin.value, word.pinyin);
    var meaningOk = ReviewService.checkMeaning(inputMeaning.value, word.meaning);

    // Ghi kết quả
    this.results.push({ word: word, pinyinOk: pinyinOk, meaningOk: meaningOk });

    // Đánh màu input
    inputPinyin.className = 'flashcard__input ' + (pinyinOk ? 'input--correct' : 'input--wrong');
    inputMeaning.className = 'flashcard__input ' + (meaningOk ? 'input--correct' : 'input--wrong');
    inputPinyin.disabled = true;
    inputMeaning.disabled = true;

    // Hiển thị kết quả
    document.getElementById('result-pinyin').textContent = pinyinOk ? '✓ Pinyin' : '✗ Pinyin';
    document.getElementById('result-pinyin').className =
      'result-label ' + (pinyinOk ? 'result-label--correct' : 'result-label--wrong');

    document.getElementById('result-meaning').textContent = meaningOk ? '✓ Nghĩa' : '✗ Nghĩa';
    document.getElementById('result-meaning').className =
      'result-label ' + (meaningOk ? 'result-label--correct' : 'result-label--wrong');

    // Đáp án đầy đủ
    document.getElementById('card-pinyin').textContent = word.pinyin;
    document.getElementById('card-meaning').textContent = ReviewService.parseMeanings(word.meaning).join(' | ');

    var exampleParts = [];
    if (word.example) exampleParts.push(word.example);
    if (word.examplePinyin) exampleParts.push(word.examplePinyin);
    if (word.exampleMeaning) exampleParts.push(word.exampleMeaning);
    document.getElementById('card-example').textContent = exampleParts.join(' — ');

    // Chuyển sang hiển thị đáp án + nút đánh dấu
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('card-answer').style.display = 'block';
    document.getElementById('review-actions').style.display = 'flex';
  },

  // ── Đánh dấu đã/chưa nhớ ──

  async markWord(remembered) {
    var word = this.words[this.currentIndex];
    var updates;

    if (remembered) {
      updates = ReviewService.processCorrect(word);
    } else {
      updates = ReviewService.processWrong(word);
    }

    // Cập nhật local
    Object.assign(word, updates);

    // Lưu xuống Google Sheet
    if (this.mode !== 'random') {
      try {
        await API.updateReview(
          word.id, updates.level, updates.correctStreak,
          updates.wrongCount, updates.lastReview, updates.nextReview
        );
      } catch (err) {
        console.error('Lỗi cập nhật review:', err);
      }
    }

    this.currentIndex++;
    this.showCard();
  },

  // ── Hoàn thành ──

  showDone() {
    document.getElementById('review-area').style.display = 'none';
    document.getElementById('review-done').style.display = 'block';

    var stats = ReviewService.calcStats(this.results);
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-correct').textContent = stats.correct;
    document.getElementById('stat-wrong').textContent = stats.wrong;
    document.getElementById('stat-percent').textContent = stats.percent + '%';

    // Chỉ hiện nút "Ôn lại từ sai" nếu có từ sai
    var retryBtn = document.getElementById('btn-retry');
    retryBtn.style.display = stats.wrong > 0 ? 'block' : 'none';
  },

  // ── Ôn lại từ sai ──

  retryWrong() {
    var wrongWords = this.results
      .filter(function(r) { return !r.pinyinOk || !r.meaningOk; })
      .map(function(r) { return r.word; });

    if (wrongWords.length === 0) {
      showToast('Không có từ sai nào!', 'info');
      return;
    }

    this.words = this.shuffle(wrongWords);
    this.currentIndex = 0;
    this.results = [];

    document.getElementById('review-done').style.display = 'none';
    document.getElementById('review-area').style.display = 'block';
    this.showCard();
  },

  // ── Helpers ──

  shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  },

  goHome() {
    window.location.href = '../index.html';
  },
};

// ── Event listeners ──

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('review-area').style.display !== 'none') {
    if (document.getElementById('input-area').style.display !== 'none') {
      ReviewApp.checkAnswer();
    }
  }
});
