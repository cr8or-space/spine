import { test, expect } from '@playwright/test';

test.describe('Entity Creation', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test project and navigate to bible page
		await page.goto('/');

		// Click New Project
		await page.getByRole('button', { name: 'New Project' }).click();

		// Wait for dialog to appear
		await expect(page.getByRole('dialog')).toBeVisible();

		// Fill in project form
		await page.getByLabel('Project Title').fill('Entity Creation Test Project');
		await page.getByRole('button', { name: 'Create Project' }).click();

		// Should be on bible page
		await page.waitForURL(/\/projects\/[^/]+\/bible/);

		// Wait for page to fully load
		await expect(page.getByRole('heading', { name: 'Story Bible' })).toBeVisible();
	});

	test.describe('Character Creation', () => {
		test('should create a new character with basic information', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();

			// Wait for dialog
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('Create Character')).toBeVisible();

			// Fill in character form
			await page.getByLabel('Name').fill('John Doe');
			await page.getByLabel('Description').fill('A brave and noble protagonist who seeks justice.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Character' }).click();

			// Should redirect to character detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);

			// Verify character was created
			await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
		});

		test('should create a character with role and status', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in character form with role and status
			await page.getByLabel('Name').fill('Jane Smith');
			await page.getByLabel('Description').fill('The main character of our story.');

			// Select role (protagonist)
			await page.getByLabel('Role').click();
			await page.getByRole('option', { name: 'Protagonist' }).click();

			// Select status (active)
			await page.getByLabel('Status').click();
			await page.getByRole('option', { name: 'Active' }).click();

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Character' }).click();

			// Should redirect to character detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);

			// Verify character details
			await expect(page.getByRole('heading', { name: 'Jane Smith' })).toBeVisible();
		});

		test('should create a character with aliases', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in character form with aliases
			await page.getByLabel('Name').fill('Robert Johnson');
			await page.getByLabel('Aliases (comma-separated)').fill('Bob, The Shadow, RJ');
			await page.getByLabel('Description').fill('A mysterious figure with many identities.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Character' }).click();

			// Should redirect to character detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);

			// Verify character was created
			await expect(page.getByRole('heading', { name: 'Robert Johnson' })).toBeVisible();
		});

		test('should cancel character creation', async ({ page }) => {
			// Click New Character button
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in some data
			await page.getByLabel('Name').fill('Cancelled Character');

			// Click cancel
			await page.getByRole('button', { name: 'Cancel' }).click();

			// Dialog should close
			await expect(page.getByRole('dialog')).not.toBeVisible();

			// Should still be on bible page
			await expect(page).toHaveURL(/\/bible$/);
		});

		test('should display created character in list', async ({ page }) => {
			// Create a character
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('List Test Character');
			await page.getByLabel('Description').fill('A character for testing the list view.');
			await page.getByRole('button', { name: 'Create Character' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Verify character appears in list
			await expect(page.getByText('List Test Character')).toBeVisible();
			await expect(page.getByText('A character for testing the list view.')).toBeVisible();
		});
	});

	test.describe('Location Creation', () => {
		test('should create a new location with basic information', async ({ page }) => {
			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).click();

			// Click New Location button
			await page.getByRole('button', { name: 'New Location' }).click();

			// Wait for dialog
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('Create Location')).toBeVisible();

			// Fill in location form
			await page.getByLabel('Name').fill('Ancient Castle');
			await page.getByLabel('Description').fill('A mysterious castle on a hill with a dark history.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Location' }).click();

			// Should redirect to location detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);

			// Verify location was created
			await expect(page.getByRole('heading', { name: 'Ancient Castle' })).toBeVisible();
		});

		test('should create a location with type and status', async ({ page }) => {
			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).click();
			await page.getByRole('button', { name: 'New Location' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in location form
			await page.getByLabel('Name').fill('Forbidden Forest');
			await page.getByLabel('Description').fill('A dangerous forest where few dare to enter.');

			// Select type (natural)
			await page.getByLabel('Type').click();
			await page.getByRole('option', { name: 'Natural' }).click();

			// Select status (restricted)
			await page.getByLabel('Status').click();
			await page.getByRole('option', { name: 'Restricted' }).click();

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Location' }).click();

			// Should redirect to location detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);

			// Verify location was created
			await expect(page.getByRole('heading', { name: 'Forbidden Forest' })).toBeVisible();
		});

		test('should display created location in list', async ({ page }) => {
			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).click();

			// Create a location
			await page.getByRole('button', { name: 'New Location' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('Crystal Lake');
			await page.getByLabel('Description').fill('A serene lake with magical properties.');
			await page.getByRole('button', { name: 'Create Location' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Locations tab
			await page.getByRole('tab', { name: /Locations/ }).click();

			// Verify location appears in list
			await expect(page.getByText('Crystal Lake')).toBeVisible();
		});
	});

	test.describe('Faction Creation', () => {
		test('should create a new faction with basic information', async ({ page }) => {
			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).click();

			// Click New Faction button
			await page.getByRole('button', { name: 'New Faction' }).click();

			// Wait for dialog
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('Create Faction')).toBeVisible();

			// Fill in faction form
			await page.getByLabel('Name').fill('The Order');
			await page.getByLabel('Description').fill('A secret society dedicated to preserving ancient knowledge.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Faction' }).click();

			// Should redirect to faction detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/faction\/[^/]+/);

			// Verify faction was created
			await expect(page.getByRole('heading', { name: 'The Order' })).toBeVisible();
		});

		test('should create a faction with type, status, and influence', async ({ page }) => {
			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).click();
			await page.getByRole('button', { name: 'New Faction' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in faction form
			await page.getByLabel('Name').fill('Dark Brotherhood');
			await page.getByLabel('Ideology').fill('Power through secrecy');
			await page.getByLabel('Description').fill('A shadowy organization operating from the darkness.');

			// Select type (secret-society)
			await page.getByLabel('Type').click();
			await page.getByRole('option', { name: 'Secret Society' }).click();

			// Select status (underground)
			await page.getByLabel('Status').click();
			await page.getByRole('option', { name: 'Underground' }).click();

			// Select influence (major)
			await page.getByLabel('Influence').click();
			await page.getByRole('option', { name: 'Major' }).click();

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Faction' }).click();

			// Should redirect to faction detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/faction\/[^/]+/);

			// Verify faction was created
			await expect(page.getByRole('heading', { name: 'Dark Brotherhood' })).toBeVisible();
		});

		test('should display created faction in list', async ({ page }) => {
			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).click();

			// Create a faction
			await page.getByRole('button', { name: 'New Faction' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill("Merchant's Guild");
			await page.getByLabel('Description').fill('A powerful trade organization controlling commerce.');
			await page.getByRole('button', { name: 'Create Faction' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/faction\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Factions tab
			await page.getByRole('tab', { name: /Factions/ }).click();

			// Verify faction appears in list
			await expect(page.getByText("Merchant's Guild")).toBeVisible();
		});
	});

	test.describe('World Rule Creation', () => {
		test('should create a new world rule with basic information', async ({ page }) => {
			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).click();

			// Click New Rule button
			await page.getByRole('button', { name: 'New Rule' }).click();

			// Wait for dialog
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('Create World Rule')).toBeVisible();

			// Fill in world rule form
			await page.getByLabel('Name').fill('Magic Limitation');
			await page.getByRole('textbox', { name: 'Rule' }).fill('Magic cannot create food from nothing');
			await page.getByRole('textbox', { name: 'Description' }).fill('One of the fundamental laws of magic in this world.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Rule' }).click();

			// Should redirect to world rule detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/world-rule\/[^/]+/);

			// Verify rule was created
			await expect(page.getByRole('heading', { name: 'Magic Limitation' })).toBeVisible();
		});

		test('should create a world rule with category and priority', async ({ page }) => {
			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).click();
			await page.getByRole('button', { name: 'New Rule' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in world rule form
			await page.getByLabel('Name').fill('Technology Restriction');
			await page.getByRole('textbox', { name: 'Rule' }).fill('Advanced technology is forbidden by law');
			await page.getByRole('textbox', { name: 'Description' }).fill('A strict law enforced by the government.');

			// Select category (technology)
			await page.getByLabel('Category').click();
			await page.getByRole('option', { name: 'Technology' }).click();

			// Set priority
			await page.getByLabel('Priority (0-100)').fill('80');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Rule' }).click();

			// Should redirect to world rule detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/world-rule\/[^/]+/);

			// Verify rule was created
			await expect(page.getByRole('heading', { name: 'Technology Restriction' })).toBeVisible();
		});

		test('should display created world rule in list', async ({ page }) => {
			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).click();

			// Create a world rule
			await page.getByRole('button', { name: 'New Rule' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('Gravity Variation');
			await page.getByRole('textbox', { name: 'Rule' }).fill('Gravity is 20% stronger than Earth');
			await page.getByRole('textbox', { name: 'Description' }).fill('This affects all movement and construction.');
			await page.getByRole('button', { name: 'Create Rule' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/world-rule\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to World Rules tab
			await page.getByRole('tab', { name: /World Rules/ }).click();

			// Verify rule appears in list
			await expect(page.getByText('Gravity Variation')).toBeVisible();
		});
	});

	test.describe('Plot Thread Creation', () => {
		test('should create a new plot thread with basic information', async ({ page }) => {
			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).click();

			// Click New Thread button
			await page.getByRole('button', { name: 'New Thread' }).click();

			// Wait for dialog
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('Create Plot Thread')).toBeVisible();

			// Fill in plot thread form
			await page.getByLabel('Name').fill('Mystery of the Lost Artifact');
			await page.getByLabel('Description').fill('The protagonist searches for a powerful ancient artifact.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Thread' }).click();

			// Should redirect to plot thread detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/plot-thread\/[^/]+/);

			// Verify thread was created
			await expect(page.getByRole('heading', { name: 'Mystery of the Lost Artifact' })).toBeVisible();
		});

		test('should create a plot thread with type, status, and scope', async ({ page }) => {
			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).click();
			await page.getByRole('button', { name: 'New Thread' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in plot thread form
			await page.getByLabel('Name').fill('Romance Subplot');
			await page.getByLabel('Description').fill('A developing romance between two characters.');

			// Select type (romance)
			await page.getByLabel('Type').click();
			await page.getByRole('option', { name: 'Romance' }).click();

			// Select status (active)
			await page.getByLabel('Status').click();
			await page.getByRole('option', { name: 'Active' }).click();

			// Select scope (arc)
			await page.getByLabel('Scope').click();
			await page.getByRole('option', { name: 'Arc' }).click();

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Thread' }).click();

			// Should redirect to plot thread detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/plot-thread\/[^/]+/);

			// Verify thread was created
			await expect(page.getByRole('heading', { name: 'Romance Subplot' })).toBeVisible();
		});

		test('should display created plot thread in list', async ({ page }) => {
			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).click();

			// Create a plot thread
			await page.getByRole('button', { name: 'New Thread' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('Political Intrigue');
			await page.getByLabel('Description').fill('A complex web of political maneuvering.');
			await page.getByRole('button', { name: 'Create Thread' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/plot-thread\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Plot Threads tab
			await page.getByRole('tab', { name: /Plot Threads/ }).click();

			// Verify thread appears in list
			await expect(page.getByText('Political Intrigue')).toBeVisible();
		});
	});

	test.describe('Timeline Event Creation', () => {
		test('should create a new timeline event with basic information', async ({ page }) => {
			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).click();

			// Click New Event button
			await page.getByRole('button', { name: 'New Event' }).click();

			// Wait for dialog
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('Create Timeline Event')).toBeVisible();

			// Fill in timeline event form
			await page.getByLabel('Name').fill('The Great War Begins');
			await page.getByLabel('Description').fill('The war that changed everything started on this day.');

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Event' }).click();

			// Should redirect to timeline event detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/timeline\/[^/]+/);

			// Verify event was created
			await expect(page.getByRole('heading', { name: 'The Great War Begins' })).toBeVisible();
		});

		test('should create a timeline event with type and significance', async ({ page }) => {
			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).click();
			await page.getByRole('button', { name: 'New Event' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in timeline event form
			await page.getByLabel('Name').fill('Discovery of Magic');
			await page.getByLabel('Description').fill('The moment magic was first discovered by humanity.');

			// Select type (backstory)
			await page.getByLabel('Type').click();
			await page.getByRole('option', { name: 'Backstory' }).click();

			// Select significance (critical)
			await page.getByLabel('Significance').click();
			await page.getByRole('option', { name: 'Critical' }).click();

			// Submit form
			await page.getByRole('dialog').getByRole('button', { name: 'Create Event' }).click();

			// Should redirect to timeline event detail page
			await page.waitForURL(/\/projects\/[^/]+\/bible\/timeline\/[^/]+/);

			// Verify event was created
			await expect(page.getByRole('heading', { name: 'Discovery of Magic' })).toBeVisible();
		});

		test('should display created timeline event in list', async ({ page }) => {
			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).click();

			// Create a timeline event
			await page.getByRole('button', { name: 'New Event' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('First Contact');
			await page.getByLabel('Description').fill('Humanity makes first contact with aliens.');
			await page.getByRole('button', { name: 'Create Event' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/timeline\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Switch to Timeline tab
			await page.getByRole('tab', { name: /Timeline/ }).click();

			// Verify event appears in list
			await expect(page.getByText('First Contact')).toBeVisible();
		});
	});

	test.describe('Tab Count Updates', () => {
		test('should update character tab count after creation', async ({ page }) => {
			// Get initial count (should be 0)
			const characterTab = page.getByRole('tab', { name: /Characters/ });
			await expect(characterTab.locator('.rounded-full')).toHaveText('0');

			// Create a character
			await page.getByRole('button', { name: 'New Character' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('Count Test Character');
			await page.getByLabel('Description').fill('Testing count updates.');
			await page.getByRole('button', { name: 'Create Character' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/character\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Verify count is now 1
			await expect(characterTab.locator('.rounded-full')).toHaveText('1');
		});

		test('should update location tab count after creation', async ({ page }) => {
			// Switch to Locations tab
			const locationTab = page.getByRole('tab', { name: /Locations/ });
			await locationTab.click();

			// Get initial count (should be 0)
			await expect(locationTab.locator('.rounded-full')).toHaveText('0');

			// Create a location
			await page.getByRole('button', { name: 'New Location' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByLabel('Name').fill('Count Test Location');
			await page.getByLabel('Description').fill('Testing count updates.');
			await page.getByRole('button', { name: 'Create Location' }).click();

			// Wait for redirect
			await page.waitForURL(/\/projects\/[^/]+\/bible\/location\/[^/]+/);

			// Navigate back to bible page
			await page.locator('a.back-link').click();
			await expect(page).toHaveURL(/\/bible$/);

			// Verify count is now 1
			await expect(locationTab.locator('.rounded-full')).toHaveText('1');
		});
	});
});
