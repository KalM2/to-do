document.addEventListener('DOMContentLoaded', async () => {
  const state = await window.SimpleDayCloud.ready;
  const message = document.getElementById('authMessage');
  const setMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('is-error', isError);
  };

  if (!state.configured) {
    document.querySelectorAll('.auth-form button, .auth-mode').forEach((control) => {
      control.disabled = true;
    });
    setMessage('Account access will be available after the database connection is configured.');
    return;
  }

  const setupForm = document.getElementById('setupForm');
  if (setupForm) {
    setupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = setupForm.querySelector('[type="submit"]');
      button.disabled = true;
      setMessage('Saving your profile...');
      try {
        await window.SimpleDayCloud.completeSetup(document.getElementById('displayNameInput').value);
        location.replace(new URL('../index.html', location.href).href);
      } catch (error) {
        setMessage(error.message || 'Could not save your profile.', true);
        button.disabled = false;
      }
    });
    return;
  }

  const form = document.getElementById('authForm');
  const authTitle = document.getElementById('authTitle');
  const modeButtons = document.querySelectorAll('.auth-mode');
  const confirmField = document.getElementById('confirmPasswordField');
  const confirmInput = document.getElementById('confirmPasswordInput');
  const submitButton = document.getElementById('authSubmitBtn');
  let mode = 'login';

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.mode;
      modeButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      authTitle.textContent = mode === 'signup' ? 'Create your account' : 'Welcome back';
      document.title = `${mode === 'signup' ? 'Create account' : 'Log in'} - simple day`;
      confirmField.hidden = mode !== 'signup';
      confirmInput.required = mode === 'signup';
      document.getElementById('authPasswordInput').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
      submitButton.textContent = mode === 'signup' ? 'Create account' : 'Log in';
      setMessage('');
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('authEmailInput').value.trim();
    const password = document.getElementById('authPasswordInput').value;
    submitButton.disabled = true;
    setMessage(mode === 'signup' ? 'Creating your account...' : 'Checking your account...');

    try {
      if (mode === 'signup') {
        if (password !== confirmInput.value) throw new Error('Those passwords do not match.');
        const { data, error } = await window.SimpleDayCloud.client.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          location.replace(new URL('./setup.html', location.href).href);
          return;
        }
        modeButtons[0].click();
        setMessage('Check your email to confirm your account, then log in here.');
      } else {
        const { error } = await window.SimpleDayCloud.client.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Email or password is incorrect.');
        setMessage('Signed in. Opening your workspace...');
        const { data } = await window.SimpleDayCloud.client.auth.getUser();
        location.replace(new URL(data.user?.user_metadata?.display_name ? '../index.html' : './setup.html', location.href).href);
        return;
      }
    } catch (error) {
      setMessage(error.message || 'Could not complete that request.', true);
    }
    submitButton.disabled = false;
  });
});
