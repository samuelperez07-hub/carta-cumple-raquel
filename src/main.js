import { createClient } from '@supabase/supabase-js';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const app = document.querySelector('#app');

const CONFIG = {
  displayName: 'Raquel',
  title: '¡Feliz cumpleaños!',
  subtitle: 'Hoy preparé algo especial para ti 💗',
  letter: `Espero que hoy tengas un día precioso. Quiero que recuerdes lo especial que eres y que mereces muchas cosas bonitas. Preparé esta pequeña sorpresa con mucho cariño. ¡Feliz cumpleaños!`,
  musicFile: '/music/cancion.mp3', // Coloca tu propio audio en public/music/cancion.mp3
 
questions: [
  {
    id: 1,
    text: '¿Cuál es mi comida favorita?',
    options: [
      'Arroz con pollo',
      'Carne',
      'Ensalada',
      'Pizza'
    ]
  },
  {
    id: 2,
    text: '¿Cuándo fue nuestra primera conversación?',
    options: [
      '10-02-2025',
      '15-10-2024',
      '12-11-2025',
      '19-05-2026'
    ]
  },
  {
    id: 3,
    text: '¿Qué fue lo primero que pensé cuando te conocí?',
    options: [
      'Que eras una persona muy interesante',
      'Que tenías una sonrisa bonita',
      'Que quería conocerte más',
      'Que serías alguien especial en mi vida'
    ]
  }
],

  gifts: [
    { id: 'dulces', title: 'Un abrazo + kit de dulces', description: 'Un abrazo especial y un kit de dulces personalizados.', emoji: '🍬' },
    { id: 'comida', title: 'Una cita deliciosa', description: 'Salir a comer o preparar algo que te encante.', emoji: '🍰' },
    { id: 'sorpresa', title: 'Un regalo sorpresa', description: 'Una sorpresa preparada especialmente para ti.', emoji: '🎁' }
  ]
};

let supabase;
let currentUser = null;
let profile = null;
let selectedAnswers = {};
let currentQuestion = 0;
let musicOn = false;
let audio;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function render(html) { app.innerHTML = html; }
function showMessage(text, type='info') {
  const el = document.querySelector('#notice');
  if (el) { el.textContent = text; el.className = `notice ${type}`; }
}
function button(label, id, extra='') {
  return `<button class="btn" id="${id}" ${extra}>${label}</button>`;
}
function loading(text='Un momento…') {
  render(`<main class="center"><div class="loader-heart">💗</div><p>${escapeHtml(text)}</p></main>`);
}
function callFunction(name, body={}) {
  return supabase.functions.invoke(name, { body });
}
async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('TU-PROYECTO')) {
    render(`<main class="center"><section class="panel"><div class="eyebrow">CONFIGURACIÓN INICIAL</div><h1>Tu carta está casi lista 💗</h1><p>Primero conecta tu proyecto de Supabase. Abre el archivo <b>.env</b> y pega la URL y la clave pública de tu proyecto.</p><p class="muted">Los pasos están en README.md.</p></section></main>`);
    return;
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await loadApp(session.user);
  else renderLogin();
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) loadApp(session.user);
    else renderLogin();
  });
}

function renderLogin() {
  render(`<main class="center">
    <section class="panel login-panel">
      <div class="flower">🌷</div>
      <div class="eyebrow">UNA SORPRESA PARA TI</div>
      <h1>${escapeHtml(CONFIG.title)}</h1>
      <p>${escapeHtml(CONFIG.subtitle)}</p>

      <form id="admin-login-form" class="stack">
        <h3>Acceso de administrador</h3>
        <label>Correo
          <input id="admin-email" type="email" placeholder="Tu correo" required>
        </label>
        <label>Contraseña
          <input id="admin-password" type="password" placeholder="Tu contraseña" required>
        </label>
        <button class="btn" type="submit">Entrar como administrador</button>
      </form>

      <hr>

      <form id="participant-login-form" class="stack">
        <h3>Tu sorpresa 💗</h3>
       <label>Usuario
  <input id="participant-username" type="text" placeholder="Tu usuario" required>
</label>
<label>Contraseña
  <input id="participant-password" type="password" placeholder="Escribe tu contraseña" required>
</label>
        <button class="btn" type="submit">Entrar a la carta 💌</button>
      </form>

      <p id="notice" class="notice"></p>
      <p class="tiny">Acceso privado · Hecho con cariño</p>
    </section>
  </main>`);

  document.querySelector('#admin-login-form').addEventListener('submit', async e => {
    e.preventDefault();

    const email = document.querySelector('#admin-email').value.trim();
    const password = document.querySelector('#admin-password').value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage('No se pudo entrar. Revisa tus datos.', 'error');
    }
  });

  document.querySelector('#participant-login-form').addEventListener('submit', async e => {
    e.preventDefault();

    const password = document.querySelector('#participant-password').value;
    const username = document.querySelector('#participant-username').value.trim();
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = 'Preparando tu sorpresa…';

    const { data, error } = await callFunction('participant-login', {
  username,
  password
});

    if (error || !data?.session) {
      showMessage(error?.message || data?.error || 'No se pudo iniciar sesión.', 'error');
      btn.disabled = false;
      btn.textContent = 'Entrar a la carta 💌';
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError) {
      showMessage('No se pudo abrir la sesión. Inténtalo nuevamente.', 'error');
      btn.disabled = false;
      btn.textContent = 'Entrar a la carta 💌';
    }
  });
}


async function loadApp(user) {
  currentUser = user;
  loading('Abriendo tu sorpresa…');
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error || !p) { await supabase.auth.signOut(); renderLogin(); return; }
  profile = p;
  if (p.role === 'admin') renderAdmin();
  else {
    await callFunction('start-session');
    const { data: fresh } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = fresh || p;
    renderBirthday();
  }
}
function renderBirthday() {
  const locked = Boolean(profile.gift_choice);
  render(`<main class="birthday-shell">
    <div class="sparkle s1">✦</div><div class="sparkle s2">♡</div>
    <header class="topline"><span>PARA ${escapeHtml(CONFIG.displayName.toUpperCase())}</span><button id="music" class="music-btn">♫ Música: apagada</button></header>
    <section class="hero">
      <div class="hero-flower">🌸</div><div class="eyebrow">UN DÍA MUY ESPECIAL</div>
      <h1>${escapeHtml(CONFIG.title)}</h1><p>${escapeHtml(CONFIG.subtitle)}</p>
      <div class="envelope" aria-label="Sobre de cumpleaños"><div class="envelope-heart">♡</div><div class="envelope-note">Para ti</div></div>
      <button id="open-letter" class="btn">Abrir mi carta 💌</button>
    </section>
    <section id="letter-section" class="paper hidden">
      <div class="paper-flower">🌷</div><div class="eyebrow">CON MUCHO CARIÑO</div>
      <h2>Una cartita para ti</h2><p class="letter-text">${escapeHtml(CONFIG.letter)}</p>
      <p class="signature">Con cariño, alguien que quiere verte feliz. ♡</p>
      ${locked ? `<div class="success-box"><h3>Tu sorpresa ya está elegida ${escapeHtml(profile.gift_choice)}</h3><p>La trivia está cerrada, pero puedes seguir leyendo esta carta y disfrutando sus detalles. 💗</p></div>` : `<button id="start-quiz" class="btn">Comenzar la trivia ✨</button>`}
    </section>
    <section id="quiz-section" class="quiz-card hidden"></section>
    <section id="gift-section" class="gift-card hidden"></section>
    <footer>Hecho especialmente para ti · 💗</footer>
  </main>
  <audio id="bg-audio" loop src="${escapeHtml(CONFIG.musicFile)}"></audio>`);
  audio = document.querySelector('#bg-audio');
  document.querySelector('#music').addEventListener('click', async () => {
    try {
      if (!musicOn) { await audio.play(); musicOn = true; }
      else { audio.pause(); musicOn = false; }
      document.querySelector('#music').textContent = musicOn ? '♫ Música: encendida' : '♫ Música: apagada';
    } catch { showToast('Agrega tu archivo de música en public/music/cancion.mp3'); }
  });
  document.querySelector('#open-letter').addEventListener('click', () => {
    document.querySelector('#letter-section').classList.remove('hidden');
    document.querySelector('#letter-section').scrollIntoView({behavior:'smooth'});
  });
  if (!locked) document.querySelector('#start-quiz').addEventListener('click', startQuiz);
}
function showToast(text) {
  const n = document.createElement('div'); n.className='toast'; n.textContent=text; document.body.append(n);
  setTimeout(()=>n.remove(),3500);
}
function startQuiz() {
  currentQuestion = 0; selectedAnswers = {};
  document.querySelector('#quiz-section').classList.remove('hidden');
  document.querySelector('#quiz-section').scrollIntoView({behavior:'smooth'});
  renderQuestion();
}
function renderQuestion() {
  const q = CONFIG.questions[currentQuestion];
  const section = document.querySelector('#quiz-section');
  section.innerHTML = `<div class="eyebrow">PREGUNTA ${currentQuestion+1} DE 3</div><div class="progress"><span style="width:${(currentQuestion+1)*33.333}%"></span></div>
    <h2>${escapeHtml(q.text)}</h2><div class="options">${q.options.map((o,i)=>`<button class="option" data-index="${i}">${escapeHtml(o)}</button>`).join('')}</div>
    <p class="gentle">No te preocupes si te equivocas. Puedes volver a intentarlo. 💗</p>
    <p id="quiz-notice" class="notice"></p>
    <button id="next-question" class="btn" disabled>${currentQuestion===2?'Enviar respuestas':'Siguiente pregunta'}</button>`;
  section.querySelectorAll('.option').forEach(btn => btn.addEventListener('click', () => {
    section.querySelectorAll('.option').forEach(b=>b.classList.remove('chosen'));
    btn.classList.add('chosen'); selectedAnswers[q.id] = Number(btn.dataset.index);
    section.querySelector('#next-question').disabled = false;
  }));
  section.querySelector('#next-question').addEventListener('click', async () => {
    if (selectedAnswers[q.id] === undefined) return;
    if (currentQuestion < 2) { currentQuestion++; renderQuestion(); }
    else await submitQuiz();
  });
}
async function submitQuiz() {
  const btn = document.querySelector('#next-question'); btn.disabled = true; btn.textContent='Revisando…';
  const answers = CONFIG.questions.map(q=>({question_id:q.id, selected_option:selectedAnswers[q.id]}));
  const { data, error } = await callFunction('submit-attempt', { answers });
  if (error) { showToast('No se pudo guardar el intento. Comprueba tu conexión e inténtalo otra vez.'); btn.disabled=false; btn.textContent='Enviar respuestas'; return; }
  if (data.correct) {
    showToast('¡Lo lograste! ¡Muchas felicidades! 💗');
    document.querySelector('#quiz-section').classList.add('hidden');
    renderGiftChoices();
  } else {
    const msg = `¡Buen intento! Tuviste ${data.score}/3. No pasa nada, puedes volver a intentarlo. ¡Tú puedes! 💕`;
    document.querySelector('#quiz-section').innerHTML = `<div class="big-heart">💗</div><h2>¡Gracias por intentarlo!</h2><p>${escapeHtml(msg)}</p><button id="retry" class="btn">Intentar otra vez</button>`;
    document.querySelector('#retry').addEventListener('click', startQuiz);
  }
}
function renderGiftChoices() {
  const section = document.querySelector('#gift-section');
  section.classList.remove('hidden');
  section.innerHTML = `<div class="eyebrow">¡LO CONSEGUISTE!</div><h2>¡3 de 3! 🎉</h2><p>Ahora puedes elegir UNA de estas tres sorpresas.</p>
    <div class="gift-options">${CONFIG.gifts.map(g=>`<button class="gift-option" data-gift="${g.id}"><span>${g.emoji}</span><b>${escapeHtml(g.title)}</b><small>${escapeHtml(g.description)}</small></button>`).join('')}</div>
    <p class="gentle">Elige con cariño: después de confirmar, tu elección quedará guardada. 💗</p><p id="gift-notice" class="notice"></p>`;
  section.querySelectorAll('[data-gift]').forEach(b=>b.addEventListener('click', async()=>{
    const gift = CONFIG.gifts.find(g=>g.id===b.dataset.gift);
    if (!confirm(`¿Confirmas tu elección: ${gift.title}? Esta elección no se podrá cambiar.`)) return;
    section.querySelectorAll('button').forEach(x=>x.disabled=true);
    const { data, error } = await callFunction('choose-gift', { gift_id: gift.id });
    if (error) { showToast('No se pudo guardar. Inténtalo de nuevo.'); section.querySelectorAll('button').forEach(x=>x.disabled=false); return; }
    profile.gift_choice = gift.id;
    section.innerHTML = `<div class="big-heart">🎁</div><div class="eyebrow">TU ELECCIÓN</div><h2>¡Elegiste ${escapeHtml(gift.title)}!</h2><p>${escapeHtml(gift.description)}</p><div class="success-box"><b>¡Feliz cumpleaños! 💗</b><p>Tu elección quedó guardada. La trivia se ha cerrado, pero tu carta sigue aquí para que vuelvas a leerla cuando quieras.</p></div>`;
  }));
}
async function renderAdmin() {
  const { data: participants } = await supabase.from('profiles').select('*').eq('role','participant');
  const { data: attempts } = await supabase.from('attempts').select('*').order('created_at',{ascending:false}).limit(100);
  render(`<main class="admin-shell"><header class="admin-head"><div><div class="eyebrow">PANEL PRIVADO</div><h1>Administración 💗</h1><p>Gestiona tu carta y revisa la participación.</p></div><button id="logout" class="btn secondary">Cerrar sesión</button></header>
    <div class="admin-grid"><article class="admin-card"><span class="stat">${participants?.length||0}</span><b>Participantes</b></article><article class="admin-card"><span class="stat">${attempts?.length||0}</span><b>Intentos registrados (últimos 100)</b></article></div>
    <section class="admin-card"><h2>Participación</h2>${(participants||[]).map(p=>`<div class="record"><b>${escapeHtml(p.display_name||'Participante')}</b><span>Primera visita: ${p.first_visit_at?new Date(p.first_visit_at).toLocaleString('es-SV'):'Pendiente'}</span><span>Premio: ${escapeHtml(p.gift_choice||'Aún no elige')}</span></div>`).join('')||'<p>Aún no hay participantes.</p>'}</section>
    <section class="admin-card"><h2>Intentos recientes</h2>${(attempts||[]).map(a=>`<div class="record"><b>${a.score}/3 ${a.is_correct?'· Correcto':'· Reintento'}</b><span>${new Date(a.created_at).toLocaleString('es-SV')}</span></div>`).join('')||'<p>Aún no hay intentos.</p>'}</section>
    <section class="admin-card"><h2>Personalización</h2><p>En esta primera versión, cambia el texto, las opciones y los regalos editando el objeto <code>CONFIG</code> al inicio de <code>src/main.js</code>. Los próximos pasos para convertirlo en editor visual están en README.</p></section>
  </main>`);
  document.querySelector('#logout').addEventListener('click',()=>supabase.auth.signOut());
}
init();
