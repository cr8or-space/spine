import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
	test.beforeEach(async ({ page }) => {
		// Start from the home page
		await page.goto('/');
	});

	test('should display empty state when no projects exist', async ({ page }) => {
		// Check for empty state
		await expect(page.getByText('No projects yet')).toBeVisible();
		await expect(
			page.getByText('Create your first project to start writing your web serial')
		).toBeVisible();
	});

	test('should create a new project', async ({ page }) => {
		// Click on New Project button
		await page.getByRole('button', { name: 'New Project' }).click();

		// Fill in project form
		await page.getByLabel('Project Title').fill('My Test Project');
		await page.getByLabel('Format').selectOption('web-serial');
		await page.getByLabel('Author').fill('Test Author');
		await page.getByLabel('Description').fill('A test project description');

		// Submit form
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Should redirect to bible page or show project in list
		await expect(page).toHaveURL(/\/projects\/[^/]+\/bible/);
	});

	test('should display created projects in the list', async ({ page }) => {
		// Assuming at least one project exists from previous test
		// This test verifies the project list displays correctly

		// Look for project cards (this assumes projects exist)
		const projectCards = page.locator('.project-link');
		const count = await projectCards.count();

		if (count > 0) {
			// Verify first project card has expected elements
			const firstCard = projectCards.first();
			await expect(firstCard.locator('.project-title')).toBeVisible();
			await expect(firstCard.locator('.project-stats')).toBeVisible();
		}
	});

	test('should navigate to project settings', async ({ page }) => {
		// Create a project first
		await page.getByRole('button', { name: 'New Project' }).click();
		await page.getByLabel('Project Title').fill('Settings Test Project');
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Wait for navigation to bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Click on Settings link in navigation
		await page.getByRole('link', { name: 'Settings' }).click();

		// Verify we're on settings page
		await expect(page).toHaveURL(/\/projects\/[^/]+\/settings/);
		await expect(page.getByText('Project Settings')).toBeVisible();
	});

	test('should update project settings', async ({ page }) => {
		// Navigate to an existing project's settings
		// (assumes a project exists)
		const projects = page.locator('.project-link');
		const count = await projects.count();

		if (count > 0) {
			// Click settings button on first project
			const settingsBtn = page.locator('.action-btn[title="Settings"]').first();
			await settingsBtn.click();

			// Update project title
			const titleInput = page.getByLabel('Project Title');
			await titleInput.clear();
			await titleInput.fill('Updated Project Title');

			// Save changes
			await page.getByRole('button', { name: 'Save Changes' }).click();

			// Verify success message
			await expect(page.getByText('Settings saved successfully!')).toBeVisible();
		}
	});

	test('should delete a project with confirmation', async ({ page }) => {
		// Create a project to delete
		await page.getByRole('button', { name: 'New Project' }).click();
		await page.getByLabel('Project Title').fill('Project to Delete');
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Go back to home
		await page.goto('/');

		// Find and click delete button
		const deleteBtn = page.locator('.action-btn.danger').first();
		await deleteBtn.click();

		// Confirm deletion in dialog
		await expect(page.getByText('Delete Project')).toBeVisible();
		await page.getByRole('button', { name: 'Delete' }).click();

		// Project should be removed from list
		// (verify by checking project count decreased or specific project is gone)
	});

	test('should cancel project creation', async ({ page }) => {
		// Click on New Project button
		await page.getByRole('button', { name: 'New Project' }).click();

		// Fill in some data
		await page.getByLabel('Project Title').fill('Cancelled Project');

		// Click cancel
		await page.getByRole('button', { name: 'Cancel' }).click();

		// Dialog should close, project should not be created
		await expect(page.getByText('Create New Project')).not.toBeVisible();
	});
});
