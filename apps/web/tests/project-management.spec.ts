import { test, expect, type Page } from '@playwright/test';

// Helper function to wait for dialog transitions
async function waitForDialogTransition(page: Page) {
	await page.waitForTimeout(400); // Wait for CSS transitions and DOM updates
}

test.describe('Project Management', () => {
	test.beforeEach(async ({ page }) => {
		// Start from the home page
		await page.goto('/');
	});

	test('should display empty state when no projects exist', async ({ page }) => {
		// Check for empty state (may or may not show based on existing data)
		// If there are no projects, these should be visible
		const emptyState = page.getByText('No projects yet');
		const hasProjects = await page.locator('.project-link').count() > 0;

		if (!hasProjects) {
			await expect(emptyState).toBeVisible();
			// The description text includes "AI assistance" not just "web serial"
			await expect(
				page.getByText(/Create your first project/)
			).toBeVisible();
		}
	});

	test('should create a new project', async ({ page }) => {
		// Click on New Project button
		await page.getByRole('button', { name: 'New Project' }).click();

		// Wait for dialog to appear
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		// Fill in project form
		await page.getByLabel('Project Title').fill('My Test Project');
		// Select uses Bits UI, so click trigger then select option
		await page.getByLabel('Format').click();
		await page.getByRole('option', { name: 'Web Serial' }).click();
		await page.getByLabel('Author').fill('Test Author');
		await page.getByLabel('Description').fill('A test project description');

		// Submit form
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Should redirect to bible page or show project in list
		await expect(page).toHaveURL(/\/projects\/[^/]+\/bible/);
	});

	test('should display created projects in the list', async ({ page }) => {
		// First create a project to ensure one exists
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);
		await page.getByLabel('Project Title').fill('List Test Project');
		await page.getByRole('button', { name: 'Create Project' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Go back to home page
		await page.goto('/');

		// Look for project cards
		const projectCards = page.locator('a.project-link');
		const count = await projectCards.count();

		expect(count).toBeGreaterThan(0);

		// Verify first project card has expected elements
		const firstCard = projectCards.first();
		await expect(firstCard.locator('.project-title')).toBeVisible();
		await expect(firstCard.locator('.project-stats')).toBeVisible();
	});

	test('should navigate to project settings', async ({ page }) => {
		// Create a project first
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);
		await page.getByLabel('Project Title').fill('Settings Test Project');
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Wait for navigation to bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Click on Settings link in navigation (it's a nav-item, not a generic link)
		await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();

		// Verify we're on settings page
		await expect(page).toHaveURL(/\/projects\/[^/]+\/settings/);
		await expect(page.getByRole('heading', { name: 'Project Settings' })).toBeVisible();
	});

	test('should update project settings', async ({ page }) => {
		// Create a project first to ensure we have one
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);
		await page.getByLabel('Project Title').fill('Update Settings Project');
		await page.getByRole('button', { name: 'Create Project' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Go back to home
		await page.goto('/');

		// Click settings link (it's an anchor, not a button) on first project
		const settingsLink = page.locator('a.action-btn[title="Settings"]').first();
		await settingsLink.click();

		// Wait for settings page
		await expect(page).toHaveURL(/\/projects\/[^/]+\/settings/);

		// Update project title
		const titleInput = page.getByLabel('Project Title');
		await titleInput.clear();
		await titleInput.fill('Updated Project Title');

		// Save changes
		await page.getByRole('button', { name: 'Save Changes' }).click();

		// Verify success message
		await expect(page.getByText('Settings saved successfully!')).toBeVisible();
	});

	test('should delete a project with confirmation', async ({ page }) => {
		// Create a project with a unique name to delete
		const uniqueName = `Delete Test ${Date.now()}`;
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);
		await page.getByLabel('Project Title').fill(uniqueName);
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Wait for navigation
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Go back to home
		await page.goto('/');

		// Verify our project exists
		const projectCard = page.locator('a.project-link').filter({ hasText: uniqueName });
		await expect(projectCard).toBeVisible();

		// Find and click delete button for our specific project
		// The Card component has bg-surface class, so use that
		const cardContainer = page.locator('.bg-surface').filter({ hasText: uniqueName });
		const deleteBtn = cardContainer.locator('button.action-btn.danger');
		await deleteBtn.click();

		// Wait for confirmation dialog to appear
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText('Delete Project')).toBeVisible();

		// Click the Delete button inside the dialog (found in footer element)
		await dialog.locator('footer').getByRole('button', { name: 'Delete' }).click();

		// Wait for dialog to close
		await expect(dialog).not.toBeVisible();

		// Wait for our specific project to be removed
		await expect(projectCard).not.toBeVisible();
	});

	test('should cancel project creation', async ({ page }) => {
		// Click on New Project button
		await page.getByRole('button', { name: 'New Project' }).click();

		// Wait for dialog to appear
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);
		await expect(page.getByText('Create New Project')).toBeVisible();

		// Fill in some data
		await page.getByLabel('Project Title').fill('Cancelled Project');

		// Click cancel
		await page.getByRole('button', { name: 'Cancel' }).click();

		// Dialog should close
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});
});
