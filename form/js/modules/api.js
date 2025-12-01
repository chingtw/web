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
        // fetch 預設會自動 follow 302 轉導，最終拿到 JSON
        const response = await fetch(`${API_URL}?${params.toString()}`, {
            method: "GET"
            // mode: "cors" 是預設值，可省略
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("API Error (get):", error);
        throw error;
    }
}

/**
 * Submit the Shipment Return form
 * 優化：使用 FormData，讓瀏覽器自動處理 Header
 */
export async function submitReturnForm(dataObject) {
    // 1. 建立 FormData 物件
    const formData = new FormData();
    for (const key in dataObject) {
        formData.append(key, dataObject[key]);
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData 
            // 注意：使用 FormData 時，不要手動設定 Content-Type，
            // 瀏覽器會自動設為 multipart/form-data 並加上 boundary
        });

        if (!response.ok) {
            throw new Error(`Submission failed: ${response.status}`);
        }

        // GAS 通常回傳純文字或 JSON，這邊視你的後端而定
        return await response.text(); 
        
    } catch (error) {
        console.error("API Error (post):", error);
        throw error;
    }
}
