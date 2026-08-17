/**
 * WritingApp - Luyện viết tay chữ Hán
 * Sử dụng Signature_Pad để vẽ trên canvas
 */

const WritingApp = {
  words: [],
  currentIndex: 0,
  practiceCount: 0,
  hanziHidden: true,
  pinyinHidden: true,
  signaturePad: null,

  // ── Lấy danh mục được chọn ──

  getSelectedCategories() {
    var checkboxes = document.querySelectorAll('#category-checkboxes input[type="checkbox"]:checked');
    var cats = [];
    checkboxes.forEach(function(cb) { cats.push(cb.value); });
    if (cats.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 danh mục', 'info');
      return [];
    }
    return cats;
  },

  // ── Bắt đầu phiên luyện viết ──

  async start(mode, categories) {
    showLoading();
    try {
      var res;
      if (mode === 'daily') {
        res = await API.getReviewWords();
      } else if (mode === 'category' && categories && categories.length > 0) {
        // Lấy tất cả từ rồi lọc theo danh mục được chọn
        res = await API.getWords();
        var allWords = res.words || [];
        var catSet = {};
        categories.forEach(function(c) { catSet[c] = true; });
        res = { words: allWords.filter(function(w) { return catSet[w.category]; }) };
      } else {
        res = await API.getWords();
      }

      var words = res.words || [];
      if (words.length === 0) {
        showToast('Không có từ để luyện', 'info');
        hideLoading();
        return;
      }

      // Xáo trộn cho chế độ random
      if (mode === 'random' || mode === 'daily') {
        words = this.shuffle(words);
      }

      this.words = words;
      this.currentIndex = 0;
      this.practiceCount = 0;
      this.hanziHidden = true;
      this.pinyinHidden = true;

      // Ẩn mode select, hiện writing area
      document.getElementById('mode-select').style.display = 'none';
      document.getElementById('writing-done').style.display = 'none';
      document.getElementById('writing-area').style.display = 'block';

      this.initCanvas();
      this.showWord();
    } catch (err) {
      showToast('Không thể tải dữ liệu', 'error');
      console.error(err);
    } finally {
      hideLoading();
    }
  },

  // ── Khởi tạo Canvas + SignaturePad ──

  initCanvas() {
    var canvas = document.getElementById('writing-canvas');

    // Responsive: đặt kích thước canvas theo container
    this.resizeCanvas(canvas);
    window.addEventListener('resize', () => this.resizeCanvas(canvas));

    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#1E293B',
      minWidth: 2,
      maxWidth: 4,
    });
  },

  resizeCanvas(canvas) {
    var wrap = canvas.parentElement;
    var maxWidth = window.innerWidth <= 480 ? 320 : 280;
    var size = Math.min(wrap.clientWidth - 16, maxWidth);
    var ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    // Vẽ đường kẻ ô vuông trợ giúp
    this.drawGrid(ctx, size);
  },

  drawGrid(ctx, size) {
    ctx.save();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Đường chéo
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();

    // Đường giữa ngang + dọc
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    ctx.restore();
  },

  // ── Hiển thị từ hiện tại ──

  showWord() {
    var word = this.words[this.currentIndex];
    if (!word) {
      this.showDone();
      return;
    }

    document.getElementById('reference-hanzi').textContent = word.hanzi;
    document.getElementById('word-pinyin').textContent = word.pinyin;
    document.getElementById('word-meaning').textContent = word.meaning;

    // Câu ví dụ
    var exEl = document.getElementById('word-example');
    if (word.example) {
      var exHtml = '<div class="writing__example-hanzi">' + word.example + '</div>';
      if (word.examplePinyin) {
        exHtml += '<div class="writing__example-pinyin">' + word.examplePinyin + '</div>';
      }
      if (word.exampleMeaning) {
        exHtml += '<div class="writing__example-meaning">' + word.exampleMeaning + '</div>';
      }
      exEl.innerHTML = exHtml;
    } else {
      exEl.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.875rem;">Không có ví dụ</span>';
    }

    // Reset state - mặc định ẩn cả hanzi, pinyin và ví dụ
    this.hanziHidden = true;
    this.pinyinHidden = true;
    document.getElementById('reference-hanzi').style.visibility = 'hidden';
    document.getElementById('word-pinyin').style.visibility = 'hidden';
    exEl.style.display = 'none';
    document.getElementById('btn-toggle-hanzi').textContent = 'Xem hanzi';
    document.getElementById('btn-toggle-pinyin').textContent = 'Xem pinyin';

    this.clearCanvas();
    this.updateProgress();
    this.updatePracticeCount(word);
  },

  // ── Cập nhật tiến trình ──

  updateProgress() {
    var total = this.words.length;
    var current = this.currentIndex + 1;
    var percent = Math.round((this.currentIndex / total) * 100);

    document.getElementById('progress-label').textContent = current + ' / ' + total;
    document.getElementById('progress-percent').textContent = percent + '%';
    document.getElementById('progress-fill').style.width = percent + '%';
  },

  // ── Đếm số lần luyện ──

  updatePracticeCount(word) {
    var counts = this.getPracticeCounts();
    var count = counts[word.id] || 0;
    var el = document.getElementById('practice-count');
    if (count > 0) {
      el.textContent = 'Đã luyện ' + count + ' lần';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  },

  getPracticeCounts() {
    try {
      return JSON.parse(localStorage.getItem('writingPracticeCounts') || '{}');
    } catch (e) {
      return {};
    }
  },

  savePracticeCount(wordId) {
    var counts = this.getPracticeCounts();
    counts[wordId] = (counts[wordId] || 0) + 1;
    localStorage.setItem('writingPracticeCounts', JSON.stringify(counts));
    return counts[wordId];
  },

  // ── Ẩn/hiện hanzi ──

  toggleHanzi() {
    var el = document.getElementById('reference-hanzi');
    var btn = document.getElementById('btn-toggle-hanzi');

    this.hanziHidden = !this.hanziHidden;

    if (this.hanziHidden) {
      el.style.visibility = 'hidden';
      btn.textContent = 'Xem hanzi';
    } else {
      el.style.visibility = 'visible';
      btn.textContent = 'Ẩn hanzi';
    }
  },

  // ── Ẩn/hiện pinyin + câu ví dụ ──

  togglePinyin() {
    var el = document.getElementById('word-pinyin');
    var ex = document.getElementById('word-example');
    var btn = document.getElementById('btn-toggle-pinyin');

    this.pinyinHidden = !this.pinyinHidden;

    if (this.pinyinHidden) {
      el.style.visibility = 'hidden';
      ex.style.display = 'none';
      btn.textContent = 'Xem pinyin';
    } else {
      el.style.visibility = 'visible';
      ex.style.display = 'block';
      btn.textContent = 'Ẩn pinyin';
    }
  },

  // ── Xóa canvas ──

  clearCanvas() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  },

  // ── Từ tiếp theo ──

  nextWord() {
    var word = this.words[this.currentIndex];

    // Kiểm tra đã vẽ chưa
    if (this.signaturePad && !this.signaturePad.isEmpty()) {
      this.savePracticeCount(word.id);
      this.practiceCount++;
    }

    this.currentIndex++;
    this.showWord();
  },

  // ── Hoàn thành ──

  showDone() {
    document.getElementById('writing-area').style.display = 'none';
    document.getElementById('writing-done').style.display = 'block';

    document.getElementById('stat-total').textContent = this.words.length;
    document.getElementById('stat-practiced').textContent = this.practiceCount;
  },

  // ── Quay về trang chủ ──

  goHome() {
    window.location.href = '../index.html';
  },

  // ── Shuffle array ──

  shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  },
};
