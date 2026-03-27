"use server";

/**
 * Validates a company's VAT/Registration number using the EU VIES API.
 */
export async function validateCompanyVies(countryCode: string, vatNumber: string) {
  try {
    // VIES REST API requires 2-letter country code and the number without prefix
    const cleanVatNumber = vatNumber.replace(/[^a-zA-Z0-9]/g, "");
    
    // Most users might include the country prefix in the VAT number
    let finalVat = cleanVatNumber;
    let finalMs = countryCode.toUpperCase();
    
    if (cleanVatNumber.startsWith(finalMs)) {
        finalVat = cleanVatNumber.substring(finalMs.length);
    }

    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${finalMs}/vat/${finalVat}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VIES API Error: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    // VIES response structure: { isValid: boolean, requestDate: string, userReference: string, name: string, address: string, ... }
    return {
      success: true,
      isValid: data.isValid === true,
      name: data.name || null,
      address: data.address || null,
      viesData: data
    };
  } catch (error) {
    console.error("[VIES Action] Validation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to VIES validation service",
    };
  }
}

/**
 * Proxy for the AI Document Analysis engine.
 * In a real scenario, this would send the FormData to the AI worker.
 */
export async function analyzeDocumentAction(formData: FormData) {
    try {
        const baseUrl = process.env.AI_WORKER_URL || "http://ai.open-ft.app:8080";
        
        const response = await fetch(`${baseUrl}/api/v1/document/analyze`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`AI Engine Error: ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("[Document Action] Analysis failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Document analysis protocol failed",
        };
    }
}
