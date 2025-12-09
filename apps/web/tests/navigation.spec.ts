import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test project
		await page.goto('/');

		// Click New Project button
		await page.getByRole('button', { name: 'New Project' }).click();

		// Wait for dialog
		await expect(page.getByRole('dialog')).toBeVisible();

		// Fill and submit form
		await page.getByLabel('Project Title').fill('Navigation Test Project');
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Wait for navigation to bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Wait for page to load (use heading to be specific)
		await expect(page.getByRole('heading', { name: 'Story Bible' })).toBeVisible();
	});

	test('should navigate between Bible and Settings', async ({ page }) => {
		// Start at Bible page
		await expect(page).toHaveURL(/\/bible$/);

		// Click Settings (using nav-item class selector as it's not a standard link role)
		await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();
		await expect(page).toHaveURL(/\/settings$/);
		await expect(page.getByRole('heading', { name: 'Project Settings' })).toBeVisible();

		// Click Bible
		await page.locator('.nav-item').filter({ hasText: 'Bible' }).click();
		await expect(page).toHaveURL(/\/bible$/);
		await expect(page.getByRole('heading', { name: 'Story Bible' })).toBeVisible();
	});

	test('should return to project list from project pages', async ({ page }) => {
		// Click back button (it's an anchor with class back-link)
		await page.locator('a.back-link').click();

		// Should be on home page
		await expect(page).toHaveURL('/');
		await expect(page.locator('.logo')).toHaveText('Spine');
	});

	test('should show correct active nav item', async ({ page }) => {
		// On Bible page, Bible should be active
		const bibleLink = page.locator('.nav-item').filter({ hasText: 'Bible' });
		await expect(bibleLink).toHaveClass(/active/);

		// Navigate to Settings
		await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();

		// Settings should now be active
		const settingsLink = page.locator('.nav-item').filter({ hasText: 'Settings' });
		await expect(settingsLink).toHaveClass(/active/);

		// Bible should not be active
		await expect(bibleLink).not.toHaveClass(/active/);
	});

	test('should maintain project context across pages', async ({ page }) => {
		const projectTitle = await page.locator('.project-title').textContent();
		expect(projectTitle).toBeTruthy();

		// Navigate to Settings
		await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();

		// Project title should still be visible
		await expect(page.locator('.project-title')).toHaveText(projectTitle!);

		// Navigate back to Bible
		await page.locator('.nav-item').filter({ hasText: 'Bible' }).click();

		// Project title should still match
		await expect(page.locator('.project-title')).toHaveText(projectTitle!);
	});

	test('should display project title in browser tab', async ({ page }) => {
		// Check page title includes project name
		await expect(page).toHaveTitle(/Navigation Test Project/);

		// Navigate to settings
		await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();

		// Title should still include project name
		await expect(page).toHaveTitle(/Navigation Test Project/);
	});
});
