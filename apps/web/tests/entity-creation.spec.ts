import { test, expect } from '@playwright/test';

// Helper function to wait for dialog transitions
async function waitForDialogTransition(page: any) {
	await page.waitForTimeout(300); // Wait for CSS transitions
	await page.waitForLoadState('networkidle');
}

// Helper function to interact with Select component with retry logic
async function selectOption(page: any, labelText: string, optionName: string, retries = 3) {
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

test.describe('Entity Creation', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test project and navigate to bible page
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Click New Project
		await page.getByRole('button', { name: 'New Project' }).click();

		// Wait for dialog to appear with animation
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		// Fill in project form - scope to dialog to avoid strict mode violations
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Project Title').fill('Entity Creation Test Project');
		await dialog.getByRole('button', { name: 'Create Project' }).click();

		// Should be on bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);
		await page.waitForLoadState('networkidle');

		// Wait for page to fully load
		await expect(page.getByRole('heading', { name: 'Story Bible' })).toBeVisible();
	});

	test.describe('Character Creation', () => {
		test('should create a new character with basic information', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();

			// Wait for dialog with transition
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);
			await expect(page.getByText('Create Character')).toBeVisible();

			// Fill in character form - scope to dialog
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('John Doe');
			await dialog.getByLabel('Description').fill('A brave and noble protagonist who seeks justice.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Character' }).click();

			// Should redirect to character detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify character was created
			await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
		});

		test('should create a character with role and status', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in character form with role and status
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Jane Smith');
			await dialog.getByLabel('Description').fill('The main character of our story.');

			// Select role (protagonist) with retry logic
			await selectOption(page, 'Role', 'Protagonist');

			// Select status (active) with retry logic
			await selectOption(page, 'Status', 'Active');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Character' }).click();

			// Should redirect to character detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify character details
			await expect(page.getByRole('heading', { name: 'Jane Smith' })).toBeVisible();
		});

		test('should create a character with aliases', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in character form with aliases
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Robert Johnson');
			await dialog.getByLabel('Aliases (comma-separated)').fill('Bob, The Shadow, RJ');
			await dialog.getByLabel('Description').fill('A mysterious figure with many identities.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Character' }).click();

			// Should redirect to character detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify character was created
			await expect(page.getByRole('heading', { name: 'Robert Johnson' })).toBeVisible();
		});

		test('should cancel character creation', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in some data
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Cancelled Character');

			// Click cancel
			await dialog.getByRole('button', { name: 'Cancel' }).click();

			// Wait for dialog to close
			await waitForDialogTransition(page);
			await expect(page.getByRole('dialog')).not.toBeVisible();

			// Should still be on bible page
			await expect(page).toHaveURL(/\/bible$/);
		});

		test('should display created character in list', async ({ page }) => {
			// Create a character
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('List Test Character');
			await dialog.getByLabel('Description').fill('A character for testing the list view.');
			await dialog.getByRole('button', { name: 'Create Character' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Verify character appears in list
			await expect(page.getByText('List Test Character')).toBeVisible();
			await expect(page.getByText('A character for testing the list view.')).toBeVisible();
		});
	});

	test.describe('Location Creation', () => {
		test('should create a new location with basic information', async ({ page }) => {
			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).first().click();
			await waitForDialogTransition(page);

			// Click New Location button
			await page.getByRole('button', { name: 'New Location' }).click();

			// Wait for dialog with transition
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);
			await expect(page.getByText('Create Location')).toBeVisible();

			// Fill in location form - scope to dialog
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Ancient Castle');
			await dialog.getByLabel('Description').fill('A mysterious castle on a hill with a dark history.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Location' }).click();

			// Should redirect to location detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify location was created
			await expect(page.getByRole('heading', { name: 'Ancient Castle' })).toBeVisible();
		});

		test('should create a location with type and status', async ({ page }) => {
			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).first().click();
			await waitForDialogTransition(page);

			await page.getByRole('button', { name: 'New Location' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in location form
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Forbidden Forest');
			await dialog.getByLabel('Description').fill('A dangerous forest where few dare to enter.');

			// Select type (natural) with retry logic
			await selectOption(page, 'Type', 'Natural');

			// Select status (restricted) with retry logic
			await selectOption(page, 'Status', 'Restricted');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Location' }).click();

			// Should redirect to location detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify location was created
			await expect(page.getByRole('heading', { name: 'Forbidden Forest' })).toBeVisible();
		});

		test('should display created location in list', async ({ page }) => {
			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).first().click();
			await waitForDialogTransition(page);

			// Create a location
			await page.getByRole('button', { name: 'New Location' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Crystal Lake');
			await dialog.getByLabel('Description').fill('A serene lake with magical properties.');
			await dialog.getByRole('button', { name: 'Create Location' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).first().click();
			await waitForDialogTransition(page);

			// Verify location appears in list
			await expect(page.getByText('Crystal Lake')).toBeVisible();
		});
	});

	test.describe('Faction Creation', () => {
		test('should create a new faction with basic information', async ({ page }) => {
			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).first().click();
			await waitForDialogTransition(page);

			// Click New Faction button
			await page.getByRole('button', { name: 'New Faction' }).click();

			// Wait for dialog with transition
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);
			await expect(page.getByText('Create Faction')).toBeVisible();

			// Fill in faction form - scope to dialog
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('The Order');
			await dialog.getByLabel('Description').fill('A secret society dedicated to preserving ancient knowledge.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Faction' }).click();

			// Should redirect to faction detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/faction\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify faction was created
			await expect(page.getByRole('heading', { name: 'The Order' })).toBeVisible();
		});

		test('should create a faction with type, status, and influence', async ({ page }) => {
			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).first().click();
			await waitForDialogTransition(page);

			await page.getByRole('button', { name: 'New Faction' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in faction form
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Dark Brotherhood');
			await dialog.getByLabel('Ideology').fill('Power through secrecy');
			await dialog.getByLabel('Description').fill('A shadowy organization operating from the darkness.');

			// Select type (secret-society) with retry logic
			await selectOption(page, 'Type', 'Secret Society');

			// Select status (underground) with retry logic
			await selectOption(page, 'Status', 'Underground');

			// Select influence (major) with retry logic
			await selectOption(page, 'Influence', 'Major');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Faction' }).click();

			// Should redirect to faction detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/faction\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify faction was created
			await expect(page.getByRole('heading', { name: 'Dark Brotherhood' })).toBeVisible();
		});

		test('should display created faction in list', async ({ page }) => {
			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).first().click();
			await waitForDialogTransition(page);

			// Create a faction
			await page.getByRole('button', { name: 'New Faction' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill("Merchant's Guild");
			await dialog.getByLabel('Description').fill('A powerful trade organization controlling commerce.');
			await dialog.getByRole('button', { name: 'Create Faction' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/faction\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).first().click();
			await waitForDialogTransition(page);

			// Verify faction appears in list
			await expect(page.getByText("Merchant's Guild")).toBeVisible();
		});
	});

	test.describe('World Rule Creation', () => {
		test('should create a new world rule with basic information', async ({ page }) => {
			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).first().click();
			await waitForDialogTransition(page);

			// Click New Rule button
			await page.getByRole('button', { name: 'New Rule' }).click();

			// Wait for dialog with transition
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);
			await expect(page.getByText('Create World Rule')).toBeVisible();

			// Fill in world rule form - scope to dialog
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Magic Limitation');
			await dialog.getByRole('textbox', { name: 'Rule' }).fill('Magic cannot create food from nothing');
			await dialog.getByRole('textbox', { name: 'Description' }).fill('One of the fundamental laws of magic in this world.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Rule' }).click();

			// Should redirect to world rule detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/world-rule\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify rule was created
			await expect(page.getByRole('heading', { name: 'Magic Limitation' })).toBeVisible();
		});

		test('should create a world rule with category and priority', async ({ page }) => {
			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).first().click();
			await waitForDialogTransition(page);

			await page.getByRole('button', { name: 'New Rule' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in world rule form
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Technology Restriction');
			await dialog.getByRole('textbox', { name: 'Rule' }).fill('Advanced technology is forbidden by law');
			await dialog.getByRole('textbox', { name: 'Description' }).fill('A strict law enforced by the government.');

			// Select category (technology) with retry logic
			await selectOption(page, 'Category', 'Technology');

			// Set priority
			await dialog.getByLabel('Priority (0-100)').fill('80');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Rule' }).click();

			// Should redirect to world rule detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/world-rule\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify rule was created
			await expect(page.getByRole('heading', { name: 'Technology Restriction' })).toBeVisible();
		});

		test('should display created world rule in list', async ({ page }) => {
			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).first().click();
			await waitForDialogTransition(page);

			// Create a world rule
			await page.getByRole('button', { name: 'New Rule' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Gravity Variation');
			await dialog.getByRole('textbox', { name: 'Rule' }).fill('Gravity is 20% stronger than Earth');
			await dialog.getByRole('textbox', { name: 'Description' }).fill('This affects all movement and construction.');
			await dialog.getByRole('button', { name: 'Create Rule' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/world-rule\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).first().click();
			await waitForDialogTransition(page);

			// Verify rule appears in list
			await expect(page.getByText('Gravity Variation')).toBeVisible();
		});
	});

	test.describe('Plot Thread Creation', () => {
		test('should create a new plot thread with basic information', async ({ page }) => {
			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).first().click();
			await waitForDialogTransition(page);

			// Click New Thread button
			await page.getByRole('button', { name: 'New Thread' }).click();

			// Wait for dialog with transition
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);
			await expect(page.getByText('Create Plot Thread')).toBeVisible();

			// Fill in plot thread form - scope to dialog
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Mystery of the Lost Artifact');
			await dialog.getByLabel('Description').fill('The protagonist searches for a powerful ancient artifact.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Thread' }).click();

			// Should redirect to plot thread detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/plot-thread\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify thread was created
			await expect(page.getByRole('heading', { name: 'Mystery of the Lost Artifact' })).toBeVisible();
		});

		test('should create a plot thread with type, status, and scope', async ({ page }) => {
			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).first().click();
			await waitForDialogTransition(page);

			await page.getByRole('button', { name: 'New Thread' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in plot thread form
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Romance Subplot');
			await dialog.getByLabel('Description').fill('A developing romance between two characters.');

			// Select type (romance) with retry logic
			await selectOption(page, 'Type', 'Romance');

			// Select status (active) with retry logic
			await selectOption(page, 'Status', 'Active');

			// Select scope (arc) with retry logic
			await selectOption(page, 'Scope', 'Arc');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Thread' }).click();

			// Should redirect to plot thread detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/plot-thread\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify thread was created
			await expect(page.getByRole('heading', { name: 'Romance Subplot' })).toBeVisible();
		});

		test('should display created plot thread in list', async ({ page }) => {
			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).first().click();
			await waitForDialogTransition(page);

			// Create a plot thread
			await page.getByRole('button', { name: 'New Thread' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Political Intrigue');
			await dialog.getByLabel('Description').fill('A complex web of political maneuvering.');
			await dialog.getByRole('button', { name: 'Create Thread' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/plot-thread\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).first().click();
			await waitForDialogTransition(page);

			// Verify thread appears in list
			await expect(page.getByText('Political Intrigue')).toBeVisible();
		});
	});

	test.describe('Timeline Event Creation', () => {
		test('should create a new timeline event with basic information', async ({ page }) => {
			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).first().click();
			await waitForDialogTransition(page);

			// Click New Event button
			await page.getByRole('button', { name: 'New Event' }).click();

			// Wait for dialog with transition
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);
			await expect(page.getByText('Create Timeline Event')).toBeVisible();

			// Fill in timeline event form - scope to dialog
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('The Great War Begins');
			await dialog.getByLabel('Description').fill('The war that changed everything started on this day.');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Event' }).click();

			// Should redirect to timeline event detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/timeline\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify event was created
			await expect(page.getByRole('heading', { name: 'The Great War Begins' })).toBeVisible();
		});

		test('should create a timeline event with type and significance', async ({ page }) => {
			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).first().click();
			await waitForDialogTransition(page);

			await page.getByRole('button', { name: 'New Event' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			// Fill in timeline event form
			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Discovery of Magic');
			await dialog.getByLabel('Description').fill('The moment magic was first discovered by humanity.');

			// Select type (backstory) with retry logic
			await selectOption(page, 'Type', 'Backstory');

			// Select significance (critical) with retry logic
			await selectOption(page, 'Significance', 'Critical');

			// Submit form
			await dialog.getByRole('button', { name: 'Create Event' }).click();

			// Should redirect to timeline event detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/timeline\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Verify event was created
			await expect(page.getByRole('heading', { name: 'Discovery of Magic' })).toBeVisible();
		});

		test('should display created timeline event in list', async ({ page }) => {
			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).first().click();
			await waitForDialogTransition(page);

			// Create a timeline event
			await page.getByRole('button', { name: 'New Event' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('First Contact');
			await dialog.getByLabel('Description').fill('Humanity makes first contact with aliens.');
			await dialog.getByRole('button', { name: 'Create Event' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/timeline\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).first().click();
			await waitForDialogTransition(page);

			// Verify event appears in list
			await expect(page.getByText('First Contact')).toBeVisible();
		});
	});

	test.describe('Tab Count Updates', () => {
		test('should update character tab count after creation', async ({ page }) => {
			// Get initial count (should be 0)
			const characterTab = page.getByRole('tab', { name: /Characters/ }).first();
			await expect(characterTab.locator('.rounded-full').first()).toHaveText('0');

			// Create a character
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Count Test Character');
			await dialog.getByLabel('Description').fill('Testing count updates.');
			await dialog.getByRole('button', { name: 'Create Character' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Verify count is now 1
			await expect(characterTab.locator('.rounded-full').first()).toHaveText('1');
		});

		test('should update location tab count after creation', async ({ page }) => {
			// Switch to Locations tab
			const locationTab = page.getByRole('tab', { name: /Locations/ }).first();
			await locationTab.click();
			await waitForDialogTransition(page);

			// Get initial count (should be 0)
			await expect(locationTab.locator('.rounded-full').first()).toHaveText('0');

			// Create a location
			await page.getByRole('button', { name: 'New Location' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await waitForDialogTransition(page);

			const dialog = page.getByRole('dialog');
			await dialog.getByLabel('Name').fill('Count Test Location');
			await dialog.getByLabel('Description').fill('Testing count updates.');
			await dialog.getByRole('button', { name: 'Create Location' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);
			await page.waitForLoadState('networkidle');

			// Navigate back to bible page
			await page.locator('a.back-link').first().click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/bible$/);

			// Switch back to Locations tab
			await locationTab.click();
			await waitForDialogTransition(page);

			// Verify count is now 1
			await expect(locationTab.locator('.rounded-full').first()).toHaveText('1');
		});
	});
});
