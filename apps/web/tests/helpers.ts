import type { Page } from '@playwright/test';

/**
 * Helper function to wait for dialog transitions
 */
export async function waitForDialogTransition(page: Page): Promise<void> {
	await page.waitForTimeout(400); // Wait for CSS transitions and DOM updates
}

/**
 * Helper function to interact with Select component with retry logic.
 * Includes protection against closed pages in serial test mode.
 * 
 * Note: For Bits UI Select, if the option is already selected, we can skip the interaction.
 */
export async function selectOption(
	page: Page,
	labelText: string,
	optionName: string,
	retries = 3
): Promise<void> {
	for (let i = 0; i < retries; i++) {
		try {
			const dialog = page.getByRole('dialog');
			
			// Find the select trigger by label
			const selectTrigger = dialog.getByLabel(labelText).first();
			
			// Ensure the trigger is visible and ready
			await selectTrigger.waitFor({ state: 'visible', timeout: 10000 });
			
			// Check if already selected value matches - if so, skip
			const currentValue = await selectTrigger.textContent();
			if (currentValue?.includes(optionName)) {
				// Already selected, no need to change
				return;
			}
			
			// Click to open the select dropdown
			await selectTrigger.click();
			
			// Wait a moment for the dropdown animation and portal rendering
			await page.waitForTimeout(500);
			
			// Find the option - it renders in a portal outside the dialog
			// Try multiple strategies to find it
			const option = page.getByRole('option', { name: optionName, exact: false }).first();
			
			// Wait for it to appear
			await option.waitFor({ state: 'visible', timeout: 10000 });
			
			// Click the option
			await option.click();
			
			// Wait for the dropdown to close and state to update
			await page.waitForTimeout(300);
			
			// Verify the selection was applied
			const newValue = await selectTrigger.textContent();
			if (!newValue?.includes(optionName)) {
				throw new Error(`Selection failed: expected "${optionName}", got "${newValue}"`);
			}
			
			await waitForDialogTransition(page);
			return; // Success
		} catch (error) {
			if (i === retries - 1) {
				console.error(`Failed to select "${optionName}" for "${labelText}" after ${retries} attempts`);
				throw error; // Last retry failed
			}
			// Wait before retry
			if (!page.isClosed()) {
				console.log(`Retrying selectOption (attempt ${i + 2}/${retries})`);
				await page.waitForTimeout(1000);
			} else {
				throw error; // Page closed, no point retrying
			}
		}
	}
}

/**
 * Safely wait with protection against closed pages.
 * Useful in serial test mode where page might be closed between tests.
 */
export async function safeWait(page: Page, ms: number): Promise<void> {
	if (!page.isClosed()) {
		await page.waitForTimeout(ms);
	}
}
