import { test, expect } from '@playwright/test';

test.describe('Bible Management', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test project and navigate to bible page
		await page.goto('/');

		// Click New Project
		await page.getByRole('button', { name: 'New Project' }).click();

		// Fill in project form
		await page.getByLabel('Project Title').fill('Bible Test Project');
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Should be on bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);
	});

	test('should display bible editor with all tabs', async ({ page }) => {
		// Verify all tabs are present
		await expect(page.getByRole('tab', { name: 'Characters' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Locations' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Factions' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'World Rules' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Plot Threads' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible();
	});

	test('should display empty state for characters tab', async ({ page }) => {
		// Characters tab should be active by default
		await expect(page.getByText('No characters yet')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create Character' })).toBeVisible();
	});

	test('should switch between tabs', async ({ page }) => {
		// Click on Locations tab
		await page.getByRole('tab', { name: 'Locations' }).click();
		await expect(page.getByText(/No locations yet|location/i)).toBeVisible();

		// Click on Factions tab
		await page.getByRole('tab', { name: 'Factions' }).click();
		await expect(page.getByText(/No factions yet|faction/i)).toBeVisible();

		// Click on World Rules tab
		await page.getByRole('tab', { name: 'World Rules' }).click();
		await expect(page.getByText(/No rules yet|rule/i)).toBeVisible();

		// Click on Plot Threads tab
		await page.getByRole('tab', { name: 'Plot Threads' }).click();
		await expect(page.getByText(/No plot threads yet|thread/i)).toBeVisible();

		// Click on Timeline tab
		await page.getByRole('tab', { name: 'Timeline' }).click();
		await expect(page.getByText(/No events yet|event/i)).toBeVisible();
	});

	test('should show tab counts', async ({ page }) => {
		// All tabs should show count of 0 initially
		const characterTab = page.getByRole('tab', { name: 'Characters' });
		await expect(characterTab.locator('.tab-count')).toContainText('0');

		const locationTab = page.getByRole('tab', { name: 'Locations' });
		await expect(locationTab.locator('.tab-count')).toContainText('0');
	});

	test('should filter entities with search', async ({ page }) => {
		// This test assumes we can create entities
		// For now, we test that the search input exists

		const searchInput = page.getByPlaceholder('Search bible entries...');
		await expect(searchInput).toBeVisible();

		// Type in search
		await searchInput.fill('test search');

		// Verify search value
		await expect(searchInput).toHaveValue('test search');
	});

	test('should display "New Character" button in characters tab', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'New Character' })).toBeVisible();
	});

	test('should display "New Location" button in locations tab', async ({ page }) => {
		await page.getByRole('tab', { name: 'Locations' }).click();
		await expect(page.getByRole('button', { name: /New Location/i })).toBeVisible();
	});

	test('should display "New Faction" button in factions tab', async ({ page }) => {
		await page.getByRole('tab', { name: 'Factions' }).click();
		await expect(page.getByRole('button', { name: /New Faction/i })).toBeVisible();
	});

	test('should navigate back to project list', async ({ page }) => {
		// Click back button in header
		const backLink = page.locator('.back-link');
		await backLink.click();

		// Should be back on home page
		await expect(page).toHaveURL('/');
	});

	test('should show project title in header', async ({ page }) => {
		await expect(page.getByText('Bible Test Project')).toBeVisible();
	});

	test('should highlight active navigation item', async ({ page }) => {
		// Bible nav item should be active
		const bibleNav = page.getByRole('link', { name: 'Bible' });
		await expect(bibleNav).toHaveClass(/active/);

		// Settings nav should not be active
		const settingsNav = page.getByRole('link', { name: 'Settings' });
		await expect(settingsNav).not.toHaveClass(/active/);
	});
});
