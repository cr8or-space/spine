import { test, expect } from '@playwright/test';
import { waitForDialogTransition, selectOption, clickAddChildOnTreeItem } from './helpers';

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

	test('should display select structure state when no structure selected', async ({ page }) => {
		// Wait for the page to fully load
		await page.waitForLoadState('networkidle');

		// Project creation auto-creates a root book, so outline is not empty
		// But without selecting a structure, main area shows "Select a structure"
		await expect(page.getByRole('heading', { name: 'Select a structure' })).toBeVisible();
		await expect(page.getByText(/choose a book, chapter, or scene from the outline/i)).toBeVisible();

		// The auto-created root book should appear in the outline as a clickable button
		await expect(page.getByRole('button', { name: 'Workspace Test Project', exact: true })).toBeVisible();
	});

	test('should create a book in structure tree', async ({ page }) => {
		// Click create book button (in outline panel header)
		await page.locator('aside header').getByRole('button').click();

		// Wait for dialog
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		// Fill in book form
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Book 1: The Beginning');
		await dialog.getByLabel('Summary').fill('The first book of our epic saga.');

		// Type should default to "Book" (Bits UI Select shows text, not value)
		await expect(dialog.getByLabel('Type')).toHaveText('Book');

		// Submit form
		await dialog.getByRole('button', { name: 'Create' }).click();

		// Should navigate to workspace with structure selected
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Note: Creating a book via header creates a new root-level structure
		// The outline tree only displays one root structure at a time (the first one)
		// So we verify the book is created and selected (shown in main area)
		await expect(page.getByRole('heading', { name: 'Book 1: The Beginning' })).toBeVisible();
		await expect(page.getByText('book', { exact: false }).first()).toBeVisible(); // Badge showing type
	});

	test('should create book → arc → chapter → scene hierarchy', async ({ page }) => {
		// Project creation auto-creates a root book with the project title ("Workspace Test Project")
		// We'll use that as the root for our hierarchy

		// Create arc under auto-created book - use tree item "Add child" button
		await clickAddChildOnTreeItem(page, 'Workspace Test Project');
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Test Arc');
		await dialog.getByLabel('Summary').fill('A test arc');

		// Select arc type (default is chapter when parent is book)
		await selectOption(page, 'Type', 'Arc');

		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Test Arc' })).toBeVisible();

		// Create chapter under arc - use tree item "Add child" button
		await clickAddChildOnTreeItem(page, 'Test Arc');
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		await dialog.getByLabel('Summary').fill('The first chapter');
		// Type defaults to chapter when parent is arc
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();

		// Create scene under chapter - use tree item "Add child" button
		await clickAddChildOnTreeItem(page, 'Chapter 1');
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Scene 1');
		await dialog.getByLabel('Summary').fill('The opening scene');
		// Type defaults to scene when parent is chapter
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
		await expect(page.getByRole('heading', { name: 'Scene 1' })).toBeVisible();

		// Verify all items in tree (buttons may have "Collapse" prefix when they have children)
		await expect(page.getByRole('button', { name: /Workspace Test Project/ }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Test Arc/ }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Chapter 1/ }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Scene 1/ }).first()).toBeVisible();
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
		// Create a test project - this auto-creates a root book with the project title
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

		// Project creation auto-creates a root book with project title
		// Create chapter using tree item "Add child" button on the auto-created book
		await clickAddChildOnTreeItem(page, 'Outline Test Project');
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		await dialog.getByLabel('Summary').fill('Test chapter');
		// Type defaults to chapter when parent is book
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
	});

	test('should display structure details card', async ({ page }) => {
		// Verify Structure Details card is visible
		await expect(page.getByRole('heading', { name: 'Structure Details' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

		// Should show title as heading and summary
		await expect(page.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();
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
		const saveButton = page.getByRole('button', { name: 'Save Changes' });
		await saveButton.waitFor({ state: 'visible', timeout: 5000 });
		await saveButton.click();

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

		// Save - use specific button name
		const saveButton = page.getByRole('button', { name: 'Save Changes' });
		await saveButton.waitFor({ state: 'visible', timeout: 5000 });
		await saveButton.click();
		await page.waitForTimeout(500);

		// Edit again to verify it persisted (check text content, not value - Bits UI Select)
		await page.getByRole('button', { name: 'Edit' }).click();
		await expect(page.getByLabel('Chapter Type')).toHaveText('Character');
	});

	test('should set tension target', async ({ page }) => {
		// Click Edit
		await page.getByRole('button', { name: 'Edit' }).click();

		// Set tension target
		const tensionInput = page.getByLabel('Tension Target (0-100)');
		await expect(tensionInput).toBeVisible();
		await tensionInput.fill('85');

		// Save - use specific button name
		const saveButton = page.getByRole('button', { name: 'Save Changes' });
		await saveButton.waitFor({ state: 'visible', timeout: 5000 });
		await saveButton.click();
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
		// Create project - this auto-creates a root book with the project title
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

		// Project creation auto-creates a root book with project title
		// Create chapter using tree item "Add child" button on the auto-created book
		await clickAddChildOnTreeItem(page, 'Beat Sheet Test');
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		// Type defaults to chapter when parent is book
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
	});

	test('should display beats section', async ({ page }) => {
		// Look for story beats heading
		await expect(page.getByRole('heading', { name: 'Story Beats' })).toBeVisible();

		// Should show empty state when no beats
		await expect(page.getByText('No beats defined yet')).toBeVisible();
	});

	test('should add a beat to chapter', async ({ page }) => {
		// Find the "Add" button or form
		// Based on StructureEditor.svelte, there should be a beat description field and add button

		// Scroll to beat section if needed
		await page.getByRole('heading', { name: 'Story Beats' }).scrollIntoViewIfNeeded();

		// Fill in new beat description
		const beatDescInput = page.getByPlaceholder('Add a beat...');
		await expect(beatDescInput).toBeVisible();
		await beatDescInput.fill('Hero receives the call to adventure');

		// Click Add button
		await page.getByRole('button', { name: 'Add' }).click();

		// Wait for form submission
		await page.waitForTimeout(500);

		// Verify beat appears
		await expect(page.getByText('Hero receives the call to adventure')).toBeVisible();
	});

	test('should add multiple beats', async ({ page }) => {
		// Add first beat
		await page.getByPlaceholder('Add a beat...').fill('Opening scene establishes the status quo');
		await page.getByRole('button', { name: 'Add' }).click();
		await page.waitForTimeout(300);

		// Add second beat
		await page.getByPlaceholder('Add a beat...').fill('Inciting incident disrupts normalcy');
		await page.getByRole('button', { name: 'Add' }).click();
		await page.waitForTimeout(300);

		// Add third beat
		await page.getByPlaceholder('Add a beat...').fill('Hero refuses the call');
		await page.getByRole('button', { name: 'Add' }).click();
		await page.waitForTimeout(300);

		// Verify all beats appear
		await expect(page.getByText('Opening scene establishes the status quo')).toBeVisible();
		await expect(page.getByText('Inciting incident disrupts normalcy')).toBeVisible();
		await expect(page.getByText('Hero refuses the call')).toBeVisible();
	});

	test('should remove a beat', async ({ page }) => {
		// Add a beat
		await page.getByPlaceholder('Add a beat...').fill('Beat to be removed');
		await page.getByRole('button', { name: 'Add' }).click();
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
		await page.getByPlaceholder('Add a beat...').fill('Completable beat');
		await page.getByRole('button', { name: 'Add' }).click();
		await page.waitForTimeout(300);

		// Find the completion button for the beat (styled as checkbox)
		const beatItem = page.locator('li:has-text("Completable beat")');
		// The completion button is the first button in the list item
		const checkButton = beatItem.getByRole('button', { name: 'Mark as complete' });
		await expect(checkButton).toBeVisible();

		// Click to mark as complete
		await checkButton.click();
		await page.waitForTimeout(300);

		// Verify it's marked as complete - the button label changes to "Mark as incomplete"
		await expect(beatItem.getByRole('button', { name: 'Mark as incomplete' })).toBeVisible();
	});
});

test.describe('Workspace - Hook Specification', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(60000);

	test.beforeEach(async ({ page }) => {
		// Create project - this auto-creates a root book with the project title
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

		// Project creation auto-creates a root book with project title
		// Create chapter using tree item "Add child" button on the auto-created book
		await clickAddChildOnTreeItem(page, 'Hook Test');
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Chapter 1');
		// Type defaults to chapter when parent is book
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);
	});

	test('should display hook configuration section', async ({ page }) => {
		// Look for hook section - heading is "Chapter Hook"
		await expect(page.getByRole('heading', { name: 'Chapter Hook' })).toBeVisible();
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

		// Verify persistence - Bits UI Select uses text content, not value
		await expect(hookTypeSelect).toHaveText('Cliffhanger');
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
