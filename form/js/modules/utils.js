// utils.js - Helper functions

export function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        // Modern approach
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers or non-secure contexts (like some iframes)
        let textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((resolve, reject) => {
            try {
                document.execCommand('copy');
                textArea.remove();
                resolve();
            } catch (err) {
                textArea.remove();
                reject(err);
            }
        });
    }
}

export function getCurrentDateTime() {
    return new Date().toLocaleString();
}

/**
 * Attempts to resize the parent iframe if embedded.
 * Supports both legacy direct access (same-origin) and postMessage (cross-origin).
 */
export function resizeParent() {
    const height = document.body.scrollHeight;

    // 1. Try legacy direct access (original logic)
    try {
        if (parent && parent.document && parent.document.all && parent.document.all.frameid) {
            parent.document.all.frameid.height = height + 50; // Buffer
        }
    } catch (e) {
        // Ignore cross-origin errors
    }

    // 2. Try modern postMessage (standard)
    try {
        if (window.parent) {
            window.parent.postMessage({ type: 'resize', height: height + 50 }, '*');
        }
    } catch (e) {
        console.warn('Resize postMessage failed', e);
    }
}
