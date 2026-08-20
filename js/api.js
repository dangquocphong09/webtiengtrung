/**
 * API - Lớp wrapper gọi Firestore
 *
 * Dữ liệu lưu trong collection "words"
 */

const API = {

  // ── READ ──

  async getWords() {
    var snap = await db.collection('words').orderBy('createdAt', 'desc').get();
    var words = [];
    snap.forEach(function(doc) {
      words.push({ id: doc.id, ...doc.data() });
    });
    return { words: words };
  },

  async getReviewWords() {
    var today = new Date().toISOString().split('T')[0];
    var snap = await db.collection('words')
      .where('nextReview', '<=', today)
      .orderBy('nextReview', 'asc')
      .get();
    var words = [];
    snap.forEach(function(doc) {
      words.push({ id: doc.id, ...doc.data() });
    });
    return { words: words };
  },

  async getReviewWordsByCategory(category) {
    var today = new Date().toISOString().split('T')[0];
    var snap = await db.collection('words')
      .where('category', '==', category)
      .where('nextReview', '<=', today)
      .orderBy('nextReview', 'asc')
      .get();
    var words = [];
    snap.forEach(function(doc) {
      words.push({ id: doc.id, ...doc.data() });
    });
    return { words: words };
  },

  async getCategories() {
    var snap = await db.collection('words').get();
    var catSet = {};
    snap.forEach(function(doc) {
      var cat = doc.data().category;
      if (cat) catSet[cat] = true;
    });
    return { categories: Object.keys(catSet).sort() };
  },

  // ── CREATE / UPDATE / DELETE ──

  async createWord(word) {
    var id = word.id || this._genId();
    var data = Object.assign({}, word, { id: id });
    await db.collection('words').doc(id).set(data);
    return { success: true, id: id };
  },

  async updateWord(word) {
    var id = word.id;
    var data = Object.assign({}, word);
    delete data.id;
    await db.collection('words').doc(id).set(data, { merge: true });
    return { success: true };
  },

  async deleteWord(id) {
    await db.collection('words').doc(id).delete();
    return { success: true };
  },

  async toggleFavorite(id, favorite) {
    await db.collection('words').doc(id).update({ favorite: favorite });
    return { success: true };
  },

  async updateReview(id, level, correctStreak, wrongCount, lastReview, nextReview) {
    await db.collection('words').doc(id).update({
      level: level,
      correctStreak: correctStreak,
      wrongCount: wrongCount,
      lastReview: lastReview,
      nextReview: nextReview,
    });
    return { success: true };
  },

  // ── Helpers ──

  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },
};
