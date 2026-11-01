"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendOrderToSheet = appendOrderToSheet;
exports.updateOrderInSheet = updateOrderInSheet;
const googleapis_1 = require("googleapis");
const config_1 = require("../config");
async function getSheetsClient() {
    const config = (0, config_1.getConfig)();
    let credentials;
    try {
        credentials = JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON);
    }
    catch {
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format');
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
    return { sheets, config };
}
async function appendOrderToSheet(order) {
    try {
        const { sheets, config } = await getSheetsClient();
        const row = [
            order.id,
            order.customerName,
            order.phone, // Full phone only in Sheets (admin-controlled)
            order.weight,
            `₹${order.amount}`,
            order.status,
            order.city || '',
            new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        ];
        await sheets.spreadsheets.values.append({
            spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: `${config.GOOGLE_SHEETS_SHEET_NAME}!A:H`,
            valueInputOption: 'RAW',
            requestBody: { values: [row] },
        });
    }
    catch (err) {
        // Sheets failure must never affect order storage
        console.error('Google Sheets sync failed (order is safe in DB):', err.message);
    }
}
async function updateOrderInSheet(orderId, status) {
    try {
        const { sheets, config } = await getSheetsClient();
        // Find the row with matching order ID
        const getResult = await sheets.spreadsheets.values.get({
            spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: `${config.GOOGLE_SHEETS_SHEET_NAME}!A:H`,
        });
        const rows = getResult.data.values || [];
        const rowIndex = rows.findIndex((row) => row[0] === orderId);
        if (rowIndex >= 0) {
            const rowNum = rowIndex + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
                range: `${config.GOOGLE_SHEETS_SHEET_NAME}!F${rowNum}`,
                valueInputOption: 'RAW',
                requestBody: { values: [[status]] },
            });
        }
    }
    catch (err) {
        console.error('Google Sheets update failed (non-fatal):', err.message);
    }
}
//# sourceMappingURL=sheets.service.js.map