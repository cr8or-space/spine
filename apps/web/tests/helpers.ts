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
			await dialog.getByLabel(labelText).first().click();
			await waitForDialogTransition(page);
			await page.getByRole('option', { name: optionName }).first().click();
			await waitForDialogTransition(page);
			return; // Success
		} catch (error) {
			if (i === retries - 1) throw error; // Last retry failed
			// Check if page is still open before waiting
			if (!page.isClosed()) {
				await page.waitForTimeout(500); // Wait before retry
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
