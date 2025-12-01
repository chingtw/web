// api.js - Handles communication with Google Apps Script
// This module replaces the old $.ajax calls

const API_URL = "https://script.google.com/macros/s/1N4VN6DrqL-zRKS03BP_HybjQCohAjC9TxjkI7gXVN0mYruLJ_S-zau01/exec";

/**
 * Fetch package data by name (for the "Return" form)
 * @param {string} name - The nickname/name to search for
 * @returns {Promise<Array>} - Resolves with the list of packages
 */
export async function getPackageData(name) {
    if (!name) throw new Error("Name is required");

    const params = new URLSearchParams({
        type: "select",
        order_name: name
    });

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`, {
            method: "GET",
            mode: "cors" // GAS usually requires handling CORS redirects, but often works with simple GET
        });

        // GAS redirects often return an opaque response or need handling
        // But for this specific legacy setup, it returns JSON.
        // If fetch fails due to CORS, we might need no-cors (but then we can't read data).
        // Let's assume standard fetch works as per original $.ajax logic.

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
 * @param {Object} formData - The data to submit
 * @returns {Promise<string>} - "成功" or error message
 */
export async function submitReturnForm(formData) {
    // Convert object to URLSearchParams for x-www-form-urlencoded (standard for $.ajax default)
    // Or FormData. The original used $.ajax default which is urlencoded.
    const params = new URLSearchParams();
    for (const key in formData) {
        params.append(key, formData[key]);
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: params,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        // The backend returns a simple string like "成功"
        return await response.text();
    } catch (error) {
        console.error("API Error (post):", error);
        throw error;
    }
}
