// api.js - Handles communication with Google Apps Script
// This module replaces the old $.ajax calls

const API_URL = "https://script.google.com/macros/s/AKfycbzaO_7yys8WyMcursQ0rlYwtl0-TBjbCocD1mR2UWePndLT0LS5AZBTn4j0QbRxHX6blg/exec";

/**
 * Fetch package data by name
 */
export async function getPackageData(name) {
    if (!name) throw new Error("Name is required");

    const params = new URLSearchParams({
        type: "select",
        order_name: name
    });

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        // --- 除錯關鍵修改 ---
        // 1. 先把內容當純文字取出來
        const textData = await response.text();
        
        // 2. 在 Console 印出來看 (這行是關鍵，開啟瀏覽器 F12 Console 查看)
        console.log("API 回傳原始資料:", textData);

        // 3. 嘗試解析 JSON
        try {
            // 如果後端回傳空的，直接回傳空陣列或 null，避免報錯
            if (!textData) return []; 
            return JSON.parse(textData);
        } catch (jsonError) {
            // 如果解析失敗，丟出具體錯誤，並包含原始文字以便除錯
            throw new Error(`JSON 解析失敗: ${jsonError.message}. 原始回傳: ${textData}`);
        }

    } catch (error) {
        console.error("API Error (get):", error);
        throw error;
    }
}

/**
 * Submit the Shipment Return form
 */
export async function submitReturnForm(dataObject) {
    const formData = new FormData();
    for (const key in dataObject) {
        formData.append(key, dataObject[key]);
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData 
        });

        if (!response.ok) {
            throw new Error(`Submission failed: ${response.status}`);
        }

        // 同樣先讀取文字，方便除錯
        const resultText = await response.text();
        console.log("Submit 回傳資料:", resultText);

        return resultText;
        
    } catch (error) {
        console.error("API Error (post):", error);
        throw error;
    }
}
