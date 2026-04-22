function extractDomain(url) {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase();
  const skipped = ['chrome:', 'about:', 'chrome-extension:', 'file:', 'javascript:', 'data:'];
  if (skipped.some(p => lower.startsWith(p))) return null;
  try {
    let hostname = new URL(url).hostname.toLowerCase();
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);
    return hostname;
  } catch {
    return null;
  }
}

function sanitizeFaviconUrl(favIconUrl) {
  if (!favIconUrl || typeof favIconUrl !== 'string') return null;
  const lower = favIconUrl.toLowerCase();
  const blockedProtocols = ['file:', 'chrome:', 'about:', 'chrome-extension:', 'javascript:', 'data:'];
  if (blockedProtocols.some(p => lower.startsWith(p))) return null;
  return favIconUrl;
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = type;
  setTimeout(() => {
    status.className = '';
    status.textContent = '';
  }, 2500);
}

async function sendMessage(action, payload = {}, useActiveWindow = true) {
  return new Promise((resolve, reject) => {
    const message = { action, ...payload };
    
    if (useActiveWindow) {
      chrome.windows.getLastFocused({ populate: false }, (window) => {
        if (chrome.runtime.lastError) {
          chrome.runtime.sendMessage(message, (response) => {
            resolve(response || { success: false });
          });
          return;
        }
        message.windowId = window.id;
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response || { success: false });
          }
        });
      });
    } else {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || { success: false });
        }
      });
    }
  });
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function parseDomains(text) {
  return text
    .split('\n')
    .map(d => {
      // Keep the full URL as entered by user
      // Only trim whitespace and remove trailing slashes
      let normalized = d.trim();
      normalized = normalized.replace(/\/+$/, '');
      return normalized;
    })
    .filter(d => d.length > 0);
}
