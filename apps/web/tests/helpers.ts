import type { Page } from '@playwright/test';

/**
 * Helper function to wait for dialog transitions
 */
export async function waitForDialogTransition(page: Page): Promise<void> {
	await page.waitForTimeout(400); // Wait for CSS transitions and DOM updates
}

/**
 * Helper function to interact with Bits UI Select component with retry logic.
 * Bits UI renders custom items in a portal, not native <option> elements.
 *
 * Note: If the option is already selected, we skip the interaction.
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
			if (currentValue?.toLowerCase().includes(optionName.toLowerCase())) {
				// Already selected, no need to change
				return;
			}

			// Click to open the select dropdown
			await selectTrigger.click();

			// Wait for the dropdown portal to render
			await page.waitForTimeout(300);

			// Bits UI Select renders items in a portal outside the dialog
			// The listbox role is set on the content container
			const listbox = page.getByRole('listbox').first();
			await listbox.waitFor({ state: 'visible', timeout: 5000 });

			// Find the option item by role within the listbox
			const optionItem = listbox.getByRole('option', { name: optionName });
			await optionItem.waitFor({ state: 'visible', timeout: 5000 });

			// Click the option
			await optionItem.click();

			// Wait for the dropdown to close and state to update
			await page.waitForTimeout(300);

			// Verify the selection was applied
			const newValue = await selectTrigger.textContent();
			if (!newValue?.toLowerCase().includes(optionName.toLowerCase())) {
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

/**
 * Helper to create a child structure in the workspace.
 * Hovers over the parent item in the tree and clicks "Add child".
 *
 * @param page - Playwright page
 * @param parentTitle - Title of the parent structure to add child to
 */
export async function clickAddChildOnTreeItem(page: Page, parentTitle: string): Promise<void> {
	// The tree items in OutlineTree.svelte have role="button"
	// The accessible name may include "Expand"/"Collapse" prefix when item has children
	// Use a partial name match that contains the title
	const escapedTitle = parentTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const treeItem = page.getByRole('button', { name: new RegExp(escapedTitle) }).first();
	await treeItem.waitFor({ state: 'visible', timeout: 10000 });

	// Hover to reveal the add child button
	await treeItem.hover();
	await page.waitForTimeout(300);

	// The "Add child" button is nested inside the tree item
	// Find it by its exact name
	const addChildBtn = page.getByRole('button', { name: 'Add child', exact: true }).first();
	await addChildBtn.waitFor({ state: 'visible', timeout: 5000 });
	await addChildBtn.click();
}
