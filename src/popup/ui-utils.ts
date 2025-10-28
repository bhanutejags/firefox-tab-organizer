/**
 * UI interaction utilities for popup and options pages
 */

/**
 * Update status message element.
 * Safely handles null elements.
 *
 * Consolidates 21 instances across popup.ts and options.ts
 *
 * @param element - Status div element (can be null)
 * @param message - Message to display
 * @param className - Optional CSS class to apply
 */
export function updateStatus(
  element: HTMLElement | null,
  message: string,
  className?: string,
): void {
  if (element) {
    element.textContent = message;
    if (className) {
      element.className = className;
    }
  }
}

/**
 * Set visibility of an element using display style.
 * Safely handles null elements.
 *
 * Consolidates 4 instances in popup.ts
 *
 * @param element - Element to show/hide (can be null)
 * @param visible - True to show, false to hide
 */
export function setVisibility(element: HTMLElement | null, visible: boolean): void {
  if (element) {
    element.style.display = visible ? "block" : "none";
  }
}

/**
 * Clear status message after a delay.
 * Resets both text content and CSS class.
 *
 * Consolidates 2+ instances across popup.ts and options.ts
 *
 * @param element - Status element to clear (can be null)
 * @param delayMs - Delay in milliseconds (default: 3000)
 */
export function clearStatusAfter(element: HTMLElement | null, delayMs = 3000): void {
  if (element) {
    setTimeout(() => {
      element.textContent = "";
      element.className = "status-message";
    }, delayMs);
  }
}

/**
 * Handle standard API response with success/error.
 * Updates status element with appropriate message and styling.
 *
 * Consolidates 3 response handling patterns in popup.ts
 *
 * @param response - Response object with success flag and optional message/error
 * @param statusDiv - Status element to update
 * @param successPrefix - Prefix for success messages (default: "✓")
 * @param errorPrefix - Prefix for error messages (default: "✗")
 */
export function handleResponse(
  response: { success: boolean; message?: string; error?: string },
  statusDiv: HTMLElement | null,
  successPrefix = "✓",
  errorPrefix = "✗",
): void {
  if (!statusDiv) return;

  if (response.success) {
    updateStatus(
      statusDiv,
      `${successPrefix} ${response.message || "Success!"}`,
      "status-message success",
    );
  } else {
    updateStatus(
      statusDiv,
      `${errorPrefix} Error: ${response.error || response.message || "Unknown error"}`,
      "status-message error",
    );
  }
}
