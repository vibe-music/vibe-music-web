// Crisp Chat SDK Management Utility
const CRISP_WEBSITE_ID = "50708e67-bff6-476b-ae85-f729689d94a2";

let isInitialized = false;

/**
 * Safe wrapper for Crisp commands to prevent crashes if namespaces aren't ready
 */
const safeCrisp = (action, namespace, args = []) => {
    if (typeof window !== 'undefined' && window.$crisp) {
        try {
            window.$crisp.push([action, namespace, args]);
        } catch (e) {
            console.warn(`[Crisp] Action ${action}:${namespace} failed:`, e);
        }
    }
};

/**
 * Dynamically injects the Crisp script and initializes it.
 * Should only be called for Pro users.
 */
export const initCrisp = () => {
    if (isInitialized || typeof window === 'undefined') return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    (function () {
        const d = document;
        const s = d.createElement("script");
        s.src = "https://client.crisp.chat/l.js";
        s.async = 1;
        d.getElementsByTagName("head")[0].appendChild(s);
    })();

    // Default configuration: Hide the chat bubble immediately
    // Using 'do' instead of 'set' for visibility actions
    safeCrisp("do", "chat:hide");

    isInitialized = true;
    console.log('[Crisp] SDK initialized and bubble hidden by default');
};

/**
 * Injects user data into the Crisp session.
 * @param {Object} user - User object from context
 */
export const setCrispUser = (user) => {
    if (!isInitialized || !user) return;

    if (user.email) {
        safeCrisp("set", "user:email", [user.email]);
    }
    if (user.name) {
        safeCrisp("set", "user:nickname", [user.name]);
    }

    // Set custom session data
    safeCrisp("set", "session:data", [[
        ["tier", "Pro"],
        ["auth_method", user.authMethod || 'email'],
        ["sync_active", "true"]
    ]]);

    console.log('[Crisp] User data synced');
};

/**
 * Opens the chat interface.
 */
export const openCrispChat = () => {
    if (!isInitialized) return;
    safeCrisp("do", "chat:show"); // Show the bubble/window
    safeCrisp("do", "chat:open"); // Open the window
};

/**
 * Closes/Minimizes the chat interface.
 */
export const closeCrispChat = () => {
    if (!isInitialized) return;
    safeCrisp("do", "chat:close"); // Close the window
    safeCrisp("do", "chat:hide");  // Hide the bubble/window
};

/**
 * Toggles the visibility of the bubble itself (if needed).
 * @param {boolean} shouldShow 
 */
export const toggleCrispBubble = (shouldShow) => {
    if (!isInitialized) return;
    safeCrisp("do", shouldShow ? "chat:show" : "chat:hide");
};
