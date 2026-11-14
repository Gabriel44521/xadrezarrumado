const authStatus = document.getElementById('auth-status');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

function setAuthStatus(message, state = '') {
    authStatus.textContent = message;
    authStatus.dataset.state = state;
}

document.querySelectorAll('[data-auth-view]').forEach(button => {
    button.addEventListener('click', () => {
        const showRegister = button.dataset.authView === 'register';
        loginForm.hidden = showRegister;
        registerForm.hidden = !showRegister;
        document.querySelectorAll('[data-auth-view]').forEach(tab => {
            tab.setAttribute('aria-pressed', String(tab === button));
        });
        setAuthStatus('');
    });
});

async function submitAuthForm(event, action) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setAuthStatus('');

    const data = Object.fromEntries(new FormData(form).entries());

    try {
        const result = await API.auth(action, data);
        if (!result.success) {
            throw new Error(result.error || 'Não foi possível autenticar.');
        }

        window.location.assign('index.php');
    } catch (error) {
        setAuthStatus(error.message, 'error');
    } finally {
        submitButton.disabled = false;
    }
}

loginForm.addEventListener('submit', event => submitAuthForm(event, 'login'));
registerForm.addEventListener('submit', event => submitAuthForm(event, 'register'));

API.auth('me')
    .then(result => {
        if (!result.success) {
            throw new Error(result.error || 'Não foi possível verificar a conta.');
        }
        if (result.user) {
            window.location.assign('index.php');
        }
    })
    .catch(error => setAuthStatus(error.message, 'error'));
