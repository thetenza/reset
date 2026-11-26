(() => {
  const f1 = document.getElementById('login-email');
  const f2 = document.getElementById('login-code');
  const msg = document.getElementById('login-msg');
  const resend = document.getElementById('resend');
  let email = '';
  let timer = null;

  const show = (text, kind = 'notice-warn') => { msg.hidden = !text; msg.className = `notice ${kind}`; msg.textContent = text || ''; };
  const errors = {
    invalid_email: 'Проверьте email.',
    send_failed: 'Не удалось отправить письмо. Попробуйте позже.',
    no_code: 'Сначала запросите код.',
    expired: 'Срок действия кода истёк. Запросите новый.',
    too_many_attempts: 'Слишком много неверных попыток. Запросите новый код.',
  };

  const countdown = (sec) => {
    clearInterval(timer);
    resend.disabled = true;
    let left = sec;
    const tick = () => {
      if (left <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = 'Отправить код ещё раз'; return; }
      resend.textContent = `Отправить ещё раз через ${left} с`;
      left -= 1;
    };
    tick();
    timer = setInterval(tick, 1000);
  };

  const post = async (url, body) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  };

  const request = async () => {
    show('');
    try {
      const j = await post('/api/auth/request', { email });
      if (j.ok) {
        f1.hidden = true; f2.hidden = false;
        document.getElementById('sent-to').textContent = email;
        f2.code.focus();
        countdown(j.resendAfter);
      } else if (j.error === 'cooldown') {
        if (!f2.hidden) countdown(j.retryAfter);
        else { f1.hidden = true; f2.hidden = false; document.getElementById('sent-to').textContent = email; countdown(j.retryAfter); }
        show(`Код уже отправлен. Повторно можно через ${j.retryAfter} с.`, 'notice-muted');
      } else show(errors[j.error] || 'Ошибка.');
    } catch { show('Ошибка сети. Проверьте подключение и попробуйте снова.'); }
  };

  f1.addEventListener('submit', (e) => {
    e.preventDefault();
    email = f1.email.value.trim();
    if (!f1.email.checkValidity() || !email) return show(errors.invalid_email);
    request();
  });
  resend.addEventListener('click', request);
  document.getElementById('change-email').addEventListener('click', () => { f2.hidden = true; f1.hidden = false; show(''); });

  f2.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f2.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const j = await post('/api/auth/verify', { email, code: f2.code.value });
      if (j.ok) { location.href = f2.dataset.next; return; }
      show(j.error === 'wrong_code' ? `Неверный код. Осталось попыток: ${j.attemptsLeft}.` : errors[j.error] || 'Ошибка.');
    } catch { show('Ошибка сети. Проверьте подключение и попробуйте снова.'); }
    btn.disabled = false;
  });
})();
