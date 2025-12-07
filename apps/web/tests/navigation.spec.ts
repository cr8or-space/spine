import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
	let projectUrl: string;

	test.beforeEach(async ({ page }) => {
		// Create a test project
		await page.goto('/');

		// Create project if needed
		const newProjectBtn = page.getByRole('button', { name: 'New Project' });
		const isVisible = await newProjectBtn.isVisible();

		if (isVisible) {
			await newProjectBtn.click();
			await page.getByLabel('Project Title').fill('Navigation Test Project');
			await page.getByRole('button', { name: 'Create Project' }).click();
			await page.waitForURL(/\/projects\/[^/]+\/bible/);
			projectUrl = page.url();
		}
	});

	test('should navigate between Bible and Settings', async ({ page }) => {
		// Start at Bible page
		await expect(page).toHaveURL(/\/bible$/);

		// Click Settings
		await page.getByRole('link', { name: 'Settings' }).click();
		await expect(page).toHaveURL(/\/settings$/);
		await expect(page.getByText('Project Settings')).toBeVisible();

		// Click Bible
		await page.getByRole('link', { name: 'Bible' }).click();
		await expect(page).toHaveURL(/\/bible$/);
		await expect(page.getByText('Story Bible')).toBeVisible();
	});

	test('should return to project list from project pages', async ({ page }) => {
		// Click back button
		await page.locator('.back-link').click();

		// Should be on home page
		await expect(page).toHaveURL('/');
		await expect(page.getByText('NovelGen')).toBeVisible();
	});

	test('should show correct active nav item', async ({ page }) => {
		// On Bible page, Bible should be active
		const bibleLink = page.getByRole('link', { name: 'Bible' });
		await expect(bibleLink).toHaveClass(/active/);

		// Navigate to Settings
		await page.getByRole('link', { name: 'Settings' }).click();

		// Settings should now be active
		const settingsLink = page.getByRole('link', { name: 'Settings' });
		await expect(settingsLink).toHaveClass(/active/);

		// Bible should not be active
		await expect(bibleLink).not.toHaveClass(/active/);
	});

	test('should maintain project context across pages', async ({ page }) => {
		const projectTitle = await page.locator('.project-title').textContent();

		// Navigate to Settings
		await page.getByRole('link', { name: 'Settings' }).click();

		// Project title should still be visible
		await expect(page.locator('.project-title')).toContainText(projectTitle || '');

		// Navigate back to Bible
		await page.getByRole('link', { name: 'Bible' }).click();

		// Project title should still match
		await expect(page.locator('.project-title')).toContainText(projectTitle || '');
	});

	test('should display project title in browser tab', async ({ page }) => {
		// Check page title includes project name
		await expect(page).toHaveTitle(/Navigation Test Project/);

		// Navigate to settings
		await page.getByRole('link', { name: 'Settings' }).click();

		// Title should still include project name
		await expect(page).toHaveTitle(/Navigation Test Project/);
	});
});
