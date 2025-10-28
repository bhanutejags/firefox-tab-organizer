/**
 * Form field manipulation utilities for options page
 */

/**
 * Set value for input or select element.
 * Handles both saved values and default values.
 *
 * Consolidates 2 identical implementations in options.ts
 *
 * @param input - Input or select element to set value on
 * @param value - Saved value from configuration (optional)
 * @param defaultValue - Default value from schema (optional)
 */
export function setInputValue(
  input: HTMLInputElement | HTMLSelectElement,
  value: string | number | undefined,
  defaultValue?: string | number,
): void {
  if (value !== undefined) {
    input.value = String(value);
  } else if (defaultValue !== undefined) {
    input.value = String(defaultValue);
  }
}
