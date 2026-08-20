/**
 * Firebase Config - Khởi tạo Firebase + Firestore
 */

const firebaseConfig = {
  apiKey: "AIzaSyDbvPwm6kkVFnVku58gTxDqErrArOtwoW4",
  authDomain: "webtiengtrung-dc859.firebaseapp.com",
  projectId: "webtiengtrung-dc859",
  storageBucket: "webtiengtrung-dc859.firebasestorage.app",
  messagingSenderId: "107116057590",
  appId: "1:107116057590:web:97790b47cc02fb3de8add7",
  measurementId: "G-ZHTJ2RKH7C"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
