import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAp5RyfKRfmvPqxLw09fUo4lVOp30yZtqY",
  authDomain: "mejuns-98fbc.firebaseapp.com",
  projectId: "mejuns-98fbc",
  storageBucket: "mejuns-98fbc.firebasestorage.app",
  messagingSenderId: "884477690081",
  appId: "1:884477690081:web:3d6320de203a74fa7db7a0",
  measurementId: "G-G98JWEXD5T"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------- DOM ----------
const loaderScreen  = document.getElementById('loaderScreen');
const authScreen    = document.getElementById('authScreen');
const profileScreen = document.getElementById('profileScreen');
const authMsg       = document.getElementById('authMsg');

const emailForm     = document.getElementById('emailForm');
const emailInput    = document.getElementById('emailInput');
const emailPassword = document.getElementById('emailPassword');
const emailSubmit   = document.getElementById('emailSubmit');

const phoneForm     = document.getElementById('phoneForm');
const phoneInput    = document.getElementById('phoneInput');
const phoneCode     = document.getElementById('phoneCode');
const phoneSubmit   = document.getElementById('phoneSubmit');
const codeField     = document.getElementById('codeField');

const profileAvatar = document.getElementById('profileAvatar');
const profileName   = document.getElementById('profileName');
const profileEmail  = document.getElementById('profileEmail');
const profileUid    = document.getElementById('profileUid');
const profileMethod = document.getElementById('profileMethod');
const profileStatus = document.getElementById('profileStatus');
const logoutBtn     = document.getElementById('logoutBtn');

// ---------- UI helpers ----------
function showMsg(text, type){
  authMsg.textContent = text;
  authMsg.className = 'auth__msg show auth__msg--' + type;
}
function clearMsg(){
  authMsg.className = 'auth__msg';
  authMsg.textContent = '';
}

// ---------- Tabs ----------
document.querySelectorAll('.auth__tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth__tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.getAttribute('data-tab');
    document.querySelectorAll('.auth__form').forEach(f => f.classList.remove('active'));
    if (target === 'email') emailForm.classList.add('active');
    else phoneForm.classList.add('active');
    clearMsg();
  });
});

// ---------- EMAIL: только вход ----------
emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const email = emailInput.value.trim();
  const pass  = emailPassword.value;
  if (!email || !pass) { showMsg('Заполни email и пароль', 'error'); return; }

  emailSubmit.disabled = true;
  emailSubmit.textContent = 'Вход...';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    console.error(err);
    let msg = 'Ошибка входа';
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
      msg = 'Неверный email или пароль';
    if (err.code === 'auth/user-not-found')
      msg = 'Пользователь с таким email не найден';
    if (err.code === 'auth/invalid-email')
      msg = 'Неверный формат email';
    if (err.code === 'auth/too-many-requests')
      msg = 'Слишком много попыток. Попробуй позже';
    showMsg(msg, 'error');
  } finally {
    emailSubmit.disabled = false;
    emailSubmit.textContent = 'Войти';
  }
});

// ---------- PHONE: только вход ----------
let recaptchaVerifier = null;
let confirmationResult = null;

function setupRecaptcha() {
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {}
  });
}

phoneForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const phone = phoneInput.value.trim();
  if (!phone) { showMsg('Введи номер телефона', 'error'); return; }

  // Если код уже отправлен — проверяем его
  if (confirmationResult && phoneCode.value.trim()) {
    phoneSubmit.disabled = true;
    phoneSubmit.textContent = 'Проверка...';
    try {
      await confirmationResult.confirm(phoneCode.value.trim());
    } catch (err) {
      console.error(err);
      showMsg('Неверный код', 'error');
    } finally {
      phoneSubmit.disabled = false;
      phoneSubmit.textContent = 'Войти';
    }
    return;
  }

  // Первый шаг — отправка SMS
  phoneSubmit.disabled = true;
  phoneSubmit.textContent = 'Отправка...';
  setupRecaptcha();
  try {
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    codeField.style.display = 'flex';
    phoneSubmit.textContent = 'Войти';
    showMsg('Код отправлен на номер ' + phone, 'success');
  } catch (err) {
    console.error(err);
    let msg = 'Ошибка отправки кода';
    if (err.code === 'auth/invalid-phone-number') msg = 'Неверный формат номера (нужен +код страны)';
    if (err.code === 'auth/too-many-requests') msg = 'Слишком много попыток. Попробуй позже';
    showMsg(msg, 'error');
    phoneSubmit.textContent = 'Получить код';
    recaptchaVerifier = null;
  } finally {
    phoneSubmit.disabled = false;
  }
});

// ---------- PROFILE ----------
function showProfile(user) {
  loaderScreen.style.display = 'none';
  authScreen.style.display = 'none';
  profileScreen.style.display = 'block';

  const email = user.email || '';
  const phone = user.phoneNumber || '';
  const uid   = user.uid || '';

  profileEmail.textContent = email || phone || '—';
  profileUid.textContent   = uid ? (uid.slice(0, 12) + '…') : '—';
  profileMethod.textContent = email ? 'Email' : (phone ? 'Телефон' : '—');
  profileStatus.textContent = user.emailVerified ? 'Подтверждён' : 'Активен';

  const displayName = user.displayName || (email ? email.split('@')[0] : (phone || 'Пользователь'));
  profileName.textContent = displayName;
  profileAvatar.textContent = displayName.charAt(0).toUpperCase();
}

function showAuth() {
  loaderScreen.style.display = 'none';
  profileScreen.style.display = 'none';
  authScreen.style.display = 'block';
}

onAuthStateChanged(auth, (user) => {
  if (user) showProfile(user);
  else showAuth();
});

// ---------- LOGOUT ----------
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
});