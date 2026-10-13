let installPrompt = null;
let appInstalled = false;
const listeners = new Set();

const getState = () => ({ canInstall: Boolean(installPrompt), installed: appInstalled });
const notify = () => listeners.forEach(listener => listener(getState()));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    appInstalled = true;
    installPrompt = null;
    notify();
  });
}

export function subscribeToInstallState(listener) {
  listeners.add(listener);
  listener(getState());
  return () => listeners.delete(listener);
}

export async function promptToInstallApp() {
  if (!installPrompt) return null;
  const prompt = installPrompt;
  installPrompt = null;
  notify();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}
