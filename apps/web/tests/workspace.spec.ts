import { test, expect, type Page } from '@playwright/test';

// Helper function to wait for dialog transitions
async function waitForDialogTransition(page: Page) {
	await page.waitForTimeout(400); // Wait for CSS transitions and DOM updates
}

// Helper function to interact with Select component with retry logic
async function selectOption(page: Page, labelText: string, optionName: string, retries = 3) {
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
			await page.waitForTimeout(500); // Wait before retry
		}
	}
}

test.describe('Workspace - Structure Tree', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(60000);

	test.beforeEach(async ({ page }) => {
		// Create a test project and navigate to workspace
		await page.goto('/');

		// Click New Project
		await page.getByRole('button', { name: 'New Project' }).click();

		// Wait for dialog to appear with animation
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		// Fill in project form
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Project Title').fill('Workspace Test Project');
		await dialog.getByRole('button', { name: 'Create Project' }).click();

		// Should be on bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Navigate to workspace
		await page.locator('.nav-item').filter({ hasText: 'Workspace' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace/);
		await expect(page.locator('h2:has-text("Outline")')).toBeVisible();
	});

	test('should display empty outline state', async ({ page }) => {
		// Verify empty state message
		await expect(page.getByText('No outline yet')).toBeVisible();
		await expect(page.getByText('Create your first book to start planning your story.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create Book' })).toBeVisible();
	});

	test('should create a book in structure tree', async ({ page }) => {
		// Click create book button (in outline panel header)
		await page.locator('aside').getByRole('button').first().click();

		// Wait for dialog
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		// Fill in book form
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Book 1: The Beginning');
		await dialog.getByLabel('Summary').fill('The first book of our epic saga.');

		// Type should default to "book"
		await expect(dialog.getByLabel('Type')).toHaveValue('book');

		// Submit form
		await dialog.getByRole('button', { name: 'Create' }).click();

		// Should navigate to workspace with structure selected
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Verify book appears in outline tree
		await expect(page.locator('aside').getByText('Book 1: The Beginning')).toBeVisible();

		// Verify book is displayed in main area
		await expect(page.getByRole('heading', { name: 'Book 1: The Beginning' })).toBeVisible();
		await expect(page.getByText('book', { exact: false })).toBeVisible(); // Badge showing type
	});

	test('should create book → arc → chapter → scene hierarchy', async ({ page }) => {
		// Create book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Test Book');
		await dialog.getByLabel('Summary').fill('A test book');
		await dialog.getByRole('button', { name: 'Create' }).click();

		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Test Book' })).toBeVisible();

		// Create arc under book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Test Arc');
		await dialog.getByLabel('Summary').fill('A test arc');

		// Change type to arc
		await selectOption(page, 'Type', 'Arc');

		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Test Arc' })).toBeVisible();

		// Create chapter under arc
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		await dialog.getByLabel('Summary').fill('The first chapter');
		// Type should default to chapter
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();

		// Create scene under chapter
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Scene 1');
		await dialog.getByLabel('Summary').fill('The opening scene');
		// Type should default to scene
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Scene 1' })).toBeVisible();

		// Verify all items in tree
		await expect(page.locator('aside').getByText('Test Book')).toBeVisible();
		await expect(page.locator('aside').getByText('Test Arc')).toBeVisible();
		await expect(page.locator('aside').getByText('Chapter 1')).toBeVisible();
		await expect(page.locator('aside').getByText('Scene 1')).toBeVisible();
	});

	test('should show workspace stats in outline footer', async ({ page }) => {
		// Create a book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Stats Test Book');
		await dialog.getByLabel('Summary').fill('Book for testing stats');
		await dialog.getByRole('button', { name: 'Create' }).click();

		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Verify stats footer appears
		const footer = page.locator('aside footer');
		await expect(footer).toBeVisible();

		// Check stat labels
		await expect(footer.getByText('Chapters')).toBeVisible();
		await expect(footer.getByText('Beats')).toBeVisible();
		await expect(footer.getByText('Done')).toBeVisible();

		// Initially should be 0 chapters, 0 beats, 0 done
		const chapterStat = footer.locator('div:has-text("Chapters")').locator('span').first();
		await expect(chapterStat).toHaveText('0');
	});
});

test.describe('Workspace - Outline Editor', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(60000);

	test.beforeEach(async ({ page }) => {
		// Create a test project with a book and chapter
		await page.goto('/');
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Project Title').fill('Outline Test Project');
		await dialog.getByRole('button', { name: 'Create Project' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Navigate to workspace
		await page.locator('.nav-item').filter({ hasText: 'Workspace' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace/);

		// Create book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Test Book');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Create chapter
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		await dialog.getByLabel('Summary').fill('Test chapter');
		await selectOption(page, 'Type', 'Chapter');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
	});

	test('should display structure details card', async ({ page }) => {
		// Verify Structure Details card is visible
		await expect(page.getByRole('heading', { name: 'Structure Details' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

		// Should show title and summary
		await expect(page.getByText('Chapter 1')).toBeVisible();
		await expect(page.getByText('Test chapter')).toBeVisible();
	});

	test('should edit structure metadata', async ({ page }) => {
		// Click Edit button
		await page.getByRole('button', { name: 'Edit' }).click();

		// Form should appear
		await expect(page.getByLabel('Title')).toBeVisible();
		await expect(page.getByLabel('Summary')).toBeVisible();

		// Edit fields
		await page.getByLabel('Title').fill('Chapter 1: The Beginning');
		await page.getByLabel('Summary').fill('Updated summary for the first chapter');

		// Set chapter type
		const chapterTypeLabel = page.getByLabel('Chapter Type');
		await expect(chapterTypeLabel).toBeVisible();
		await chapterTypeLabel.click();
		await waitForDialogTransition(page);
		await page.getByRole('option', { name: 'Action' }).click();
		await waitForDialogTransition(page);

		// Set tension target
		await page.getByLabel('Tension Target (0-100)').fill('75');

		// Set target word count
		await page.getByLabel('Target Word Count').fill('3000');

		// Save - using form submit button
		await page.getByRole('button', { name: 'Save' }).click();

		// Wait for form to close and data to reload
		await page.waitForTimeout(500);

		// Verify changes persisted
		await expect(page.getByRole('heading', { name: 'Chapter 1: The Beginning' })).toBeVisible();
	});

	test('should configure chapter type', async ({ page }) => {
		// Click Edit
		await page.getByRole('button', { name: 'Edit' }).click();

		// Chapter Type select should be visible for chapter type structures
		const chapterTypeLabel = page.getByLabel('Chapter Type');
		await expect(chapterTypeLabel).toBeVisible();

		// Select a chapter type
		await chapterTypeLabel.click();
		await waitForDialogTransition(page);
		await page.getByRole('option', { name: 'Character' }).click();
		await waitForDialogTransition(page);

		// Save
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForTimeout(500);

		// Edit again to verify it persisted
		await page.getByRole('button', { name: 'Edit' }).click();
		await expect(page.getByLabel('Chapter Type')).toHaveValue('character');
	});

	test('should set tension target', async ({ page }) => {
		// Click Edit
		await page.getByRole('button', { name: 'Edit' }).click();

		// Set tension target
		const tensionInput = page.getByLabel('Tension Target (0-100)');
		await expect(tensionInput).toBeVisible();
		await tensionInput.fill('85');

		// Save
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForTimeout(500);

		// Edit again to verify
		await page.getByRole('button', { name: 'Edit' }).click();
		await expect(page.getByLabel('Tension Target (0-100)')).toHaveValue('85');
	});
});

test.describe('Workspace - Beat Sheet Management', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(60000);

	test.beforeEach(async ({ page }) => {
		// Create project with book and chapter
		await page.goto('/');
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Project Title').fill('Beat Sheet Test');
		await dialog.getByRole('button', { name: 'Create Project' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		await page.locator('.nav-item').filter({ hasText: 'Workspace' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace/);

		// Create book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Test Book');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Create chapter
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		await selectOption(page, 'Type', 'Chapter');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
	});

	test('should display beat sheet section', async ({ page }) => {
		// Look for beat sheet heading
		await expect(page.getByRole('heading', { name: 'Beat Sheet' })).toBeVisible();

		// Should show empty state
		await expect(page.getByText('No beats yet')).toBeVisible();
		await expect(page.getByText('Add beats to outline the narrative flow')).toBeVisible();
	});

	test('should add a beat to chapter', async ({ page }) => {
		// Find the "Add Beat" button or form
		// Based on StructureEditor.svelte, there should be a beat description field and add button

		// Scroll to beat section if needed
		await page.getByRole('heading', { name: 'Beat Sheet' }).scrollIntoViewIfNeeded();

		// Fill in new beat description
		const beatDescInput = page.getByPlaceholder('Beat description...');
		await expect(beatDescInput).toBeVisible();
		await beatDescInput.fill('Hero receives the call to adventure');

		// Click Add Beat button
		await page.getByRole('button', { name: 'Add Beat' }).click();

		// Wait for form submission
		await page.waitForTimeout(500);

		// Verify beat appears
		await expect(page.getByText('Hero receives the call to adventure')).toBeVisible();
	});

	test('should add multiple beats', async ({ page }) => {
		// Add first beat
		await page.getByPlaceholder('Beat description...').fill('Opening scene establishes the status quo');
		await page.getByRole('button', { name: 'Add Beat' }).click();
		await page.waitForTimeout(300);

		// Add second beat
		await page.getByPlaceholder('Beat description...').fill('Inciting incident disrupts normalcy');
		await page.getByRole('button', { name: 'Add Beat' }).click();
		await page.waitForTimeout(300);

		// Add third beat
		await page.getByPlaceholder('Beat description...').fill('Hero refuses the call');
		await page.getByRole('button', { name: 'Add Beat' }).click();
		await page.waitForTimeout(300);

		// Verify all beats appear
		await expect(page.getByText('Opening scene establishes the status quo')).toBeVisible();
		await expect(page.getByText('Inciting incident disrupts normalcy')).toBeVisible();
		await expect(page.getByText('Hero refuses the call')).toBeVisible();
	});

	test('should remove a beat', async ({ page }) => {
		// Add a beat
		await page.getByPlaceholder('Beat description...').fill('Beat to be removed');
		await page.getByRole('button', { name: 'Add Beat' }).click();
		await page.waitForTimeout(300);

		// Verify it appears
		await expect(page.getByText('Beat to be removed')).toBeVisible();

		// Find and click remove button (likely an X icon button)
		// The beat item should have a remove button
		const beatItem = page.locator('li:has-text("Beat to be removed")');
		const removeButton = beatItem.getByRole('button').last(); // Assuming remove is the last button
		await removeButton.click();

		await page.waitForTimeout(300);

		// Verify beat is removed
		await expect(page.getByText('Beat to be removed')).not.toBeVisible();
	});

	test('should mark beat as completed', async ({ page }) => {
		// Add a beat
		await page.getByPlaceholder('Beat description...').fill('Completable beat');
		await page.getByRole('button', { name: 'Add Beat' }).click();
		await page.waitForTimeout(300);

		// Find checkbox for the beat
		const beatItem = page.locator('li:has-text("Completable beat")');
		const checkbox = beatItem.locator('input[type="checkbox"]');
		await expect(checkbox).toBeVisible();

		// Check the checkbox
		await checkbox.check();
		await page.waitForTimeout(300);

		// Verify it's checked
		await expect(checkbox).toBeChecked();
	});
});

test.describe('Workspace - Hook Specification', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(60000);

	test.beforeEach(async ({ page }) => {
		// Create project with book and chapter
		await page.goto('/');
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Project Title').fill('Hook Test');
		await dialog.getByRole('button', { name: 'Create Project' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		await page.locator('.nav-item').filter({ hasText: 'Workspace' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace/);

		// Create book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Test Book');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Create chapter
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		await selectOption(page, 'Type', 'Chapter');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
	});

	test('should display hook configuration section', async ({ page }) => {
		// Look for hook section
		await expect(page.getByRole('heading', { name: 'Hook' })).toBeVisible();
	});

	test('should set hook type', async ({ page }) => {
		// Find hook type select
		const hookTypeSelect = page.getByLabel('Hook Type');
		await expect(hookTypeSelect).toBeVisible();

		// Select a hook type
		await hookTypeSelect.click();
		await waitForDialogTransition(page);
		await page.getByRole('option', { name: 'Cliffhanger' }).click();
		await waitForDialogTransition(page);

		// There should be a save button for the hook
		await page.getByRole('button', { name: 'Save Hook' }).click();
		await page.waitForTimeout(300);

		// Reload or verify persistence
		await expect(hookTypeSelect).toHaveValue('cliffhanger');
	});

	test('should set hook description', async ({ page }) => {
		// Set hook type first
		const hookTypeSelect = page.getByLabel('Hook Type');
		await hookTypeSelect.click();
		await waitForDialogTransition(page);
		await page.getByRole('option', { name: 'Revelation' }).click();
		await waitForDialogTransition(page);

		// Fill in hook description
		const hookDescField = page.getByLabel('Hook Description');
		await expect(hookDescField).toBeVisible();
		await hookDescField.fill('The villain is revealed to be the protagonist\'s mentor');

		// Save
		await page.getByRole('button', { name: 'Save Hook' }).click();
		await page.waitForTimeout(300);

		// Verify it persisted
		await expect(hookDescField).toHaveValue('The villain is revealed to be the protagonist\'s mentor');
	});

	test('should set hook target strength', async ({ page }) => {
		// Set hook type
		const hookTypeSelect = page.getByLabel('Hook Type');
		await hookTypeSelect.click();
		await waitForDialogTransition(page);
		await page.getByRole('option', { name: 'Twist' }).click();
		await waitForDialogTransition(page);

		// Set target strength
		const strengthField = page.getByLabel('Target Strength (0-100)');
		await expect(strengthField).toBeVisible();
		await strengthField.fill('90');

		// Save
		await page.getByRole('button', { name: 'Save Hook' }).click();
		await page.waitForTimeout(300);

		// Verify
		await expect(strengthField).toHaveValue('90');
	});
});
