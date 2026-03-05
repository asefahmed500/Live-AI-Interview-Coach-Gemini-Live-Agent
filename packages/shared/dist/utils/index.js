"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.parseDate = parseDate;
exports.isValidEmail = isValidEmail;
exports.generateId = generateId;
exports.safeJsonParse = safeJsonParse;
function formatDate(date) {
    return date.toISOString();
}
function parseDate(dateString) {
    return new Date(dateString);
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function generateId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
//# sourceMappingURL=index.js.map