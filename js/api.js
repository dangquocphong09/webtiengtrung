/**
 * API - Lớp wrapper gọi REST API
 *
 * Apps Script chỉ có 1 endpoint (/exec):
 *   - GET  → ?action=xxx&param=value
 *   - POST → body { action: "xxx", ...data }
 */

const API = {
  /**
   * GET request
   */
  async _get(action, params) {
    var url = CONFIG.API_BASE_URL + '?action=' + encodeURIComponent(action);
    if (params) {
      Object.keys(params).forEach(function(k) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }
      });
    }

    try {
      var res = await fetch(url);
      return await res.json();
    } catch (err) {
      console.error('API GET ' + action + ':', err);
      throw err;
    }
  },

  /**
   * POST request
   */
  async _post(action, data) {
    try {
      var res = await fetch(CONFIG.API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(Object.assign({ action: action }, data || {})),
      });
      return await res.json();
    } catch (err) {
      console.error('API POST ' + action + ':', err);
      throw err;
    }
  },

  // ── GET ──

  async getWords() {
    return this._get('words');
  },

  async getReviewWords() {
    return this._get('review');
  },

  async getReviewWordsByCategory(category) {
    return this._get('review', { category: category });
  },

  async getCategories() {
    return this._get('categories');
  },

  // ── POST ──

  async createWord(word) {
    return this._post('createWord', { word: word });
  },

  async updateWord(word) {
    return this._post('updateWord', { word: word });
  },

  async deleteWord(id) {
    return this._post('deleteWord', { id: id });
  },

  async toggleFavorite(id, favorite) {
    return this._post('toggleFavorite', { id: id, favorite: favorite });
  },

  async updateReview(id, level, correctStreak, wrongCount, lastReview, nextReview) {
    return this._post('updateReview', {
      id: id,
      level: level,
      correctStreak: correctStreak,
      wrongCount: wrongCount,
      lastReview: lastReview,
      nextReview: nextReview,
    });
  },
};
