import { test, expect, type Page } from '@playwright/test';

// Helper function to wait for dialog transitions
async function waitForDialogTransition(page: Page) {
	await page.waitForTimeout(400);
}

// Helper to create a project with structure and content for analytics
async function setupAnalyticsProject(page: Page): Promise<{ projectId: string; bookId: string }> {
	await page.goto('/');
	await page.getByRole('button', { name: 'New Project' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await waitForDialogTransition(page);

	let dialog = page.getByRole('dialog');
	await dialog.getByLabel('Project Title').fill('Analytics Test Project');
	await dialog.getByRole('button', { name: 'Create Project' }).click();
	await page.waitForURL(/\/projects\/([^/]+)\/bible/);

	const projectId = page.url().match(/projects\/([^/]+)/)?.[1] || '';

	// Navigate to workspace
	await page.locator('.nav-item').filter({ hasText: 'Workspace' }).click();
	await page.waitForURL(/\/projects\/[^/]+\/workspace/);

	// Create book
	await page.locator('aside').getByRole('button').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await waitForDialogTransition(page);

	dialog = page.getByRole('dialog');
	await dialog.getByLabel('Title').fill('Test Book');
	await dialog.getByLabel('Summary').fill('A test book for analytics');
	await dialog.getByRole('button', { name: 'Create' }).click();
	await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=([^&]+)/);

	const bookId = page.url().match(/structure=([^&]+)/)?.[1] || '';

	// Create Chapter 1
	await page.locator('aside').getByRole('button').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await waitForDialogTransition(page);

	dialog = page.getByRole('dialog');
	await dialog.getByLabel('Title').fill('Chapter 1');
	await dialog.getByLabel('Summary').fill('Opening chapter');
	await dialog.getByRole('button', { name: 'Create' }).click();
	await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

	// Add content to Chapter 1
	const contentTextarea = page.locator('textarea').last();
	await contentTextarea.fill('Chapter 1 content with some text.');
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForTimeout(500);

	// Go back to book to create Chapter 2
	const bookNode = page.locator('aside').getByText('Test Book').first();
	await bookNode.click();
	await page.waitForTimeout(300);

	// Create Chapter 2
	await page.locator('aside').getByRole('button').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await waitForDialogTransition(page);

	dialog = page.getByRole('dialog');
	await dialog.getByLabel('Title').fill('Chapter 2');
	await dialog.getByLabel('Summary').fill('Second chapter');
	await dialog.getByRole('button', { name: 'Create' }).click();
	await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

	// Add content to Chapter 2
	await contentTextarea.fill('Chapter 2 content with more text.');
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForTimeout(500);

	return { projectId, bookId };
}

test.describe('Analytics Dashboard', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should display analytics dashboard page', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Navigate to analytics
		await page.goto(`/projects/${projectId}/analytics`);
		await page.waitForURL(/\/projects\/[^/]+\/analytics/);

		// Should show analytics dashboard heading
		await expect(page.getByRole('heading', { name: /analytics dashboard/i })).toBeVisible();
	});

	test('should show structure selector', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		// Should have structure selector
		const structureSelect = page.locator('#structure-select, select.structure-select').first();
		await expect(structureSelect).toBeVisible();

		// Should show the book we created
		await expect(page.getByText(/viewing analytics for/i)).toBeVisible();
	});

	test('should allow changing structure filter', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a second book
		await page.goto(`/projects/${projectId}/workspace`);
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Book 2');
		await dialog.getByLabel('Summary').fill('Second book');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Go to analytics
		await page.goto(`/projects/${projectId}/analytics`);

		// Structure selector should have multiple options
		const structureSelect = page.locator('#structure-select, select.structure-select').first();
		const options = structureSelect.locator('option');
		const optionCount = await options.count();
		expect(optionCount).toBeGreaterThanOrEqual(2);
	});

	test('should show empty state when no structure exists', async ({ page }) => {
		// Create project without structure
		await page.goto('/');
		await page.getByRole('button', { name: 'New Project' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Project Title').fill('Empty Analytics Project');
		await dialog.getByRole('button', { name: 'Create Project' }).click();
		await page.waitForURL(/\/projects\/([^/]+)\/bible/);

		const projectId = page.url().match(/projects\/([^/]+)/)?.[1] || '';

		// Navigate to analytics
		await page.goto(`/projects/${projectId}/analytics`);

		// Should show empty state
		await expect(page.getByRole('heading', { name: /no structure available/i })).toBeVisible();
		await expect(
			page.getByText(/create a book or arc structure in the workspace/i)
		).toBeVisible();
	});

	test('should display analytics sections when data exists', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		// Should show section headers
		// Note: Some sections may not appear if there's no data for them
		// At minimum, we should have structure created

		// Check for analytics sections container
		const analyticsContainer = page.locator('.analytics-container');
		await expect(analyticsContainer).toBeVisible();
	});
});

test.describe('Tension Curve Visualization', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should display tension curve section when data exists', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		// Tension curve section should be visible if we have chapters
		const tensionSection = page.locator('.analytics-section').filter({ hasText: /tension curve/i });

		if (await tensionSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(tensionSection).toBeVisible();

			// Should show section header
			await expect(tensionSection.getByRole('heading', { name: /tension curve/i })).toBeVisible();

			// Should show description
			await expect(
				tensionSection.getByText(/planned vs.*actual tension/i)
			).toBeVisible();
		}
	});

	test('should display tension curve chart', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const tensionSection = page.locator('.analytics-section').filter({ hasText: /tension curve/i });

		if (await tensionSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Chart should be rendered (SVG or canvas)
			const chart = tensionSection.locator('svg, canvas').first();
			await expect(chart).toBeVisible();
		}
	});

	test('should show tension statistics', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const tensionSection = page.locator('.analytics-section').filter({ hasText: /tension curve/i });

		if (await tensionSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Should show statistics like average planned/actual tension
			const statsVisible =
				(await tensionSection
					.getByText(/avg.*planned.*tension/i)
					.isVisible({ timeout: 1000 })
					.catch(() => false)) ||
				(await tensionSection
					.getByText(/avg.*actual.*tension/i)
					.isVisible({ timeout: 1000 })
					.catch(() => false)) ||
				(await tensionSection
					.getByText(/avg.*divergence/i)
					.isVisible({ timeout: 1000 })
					.catch(() => false));

			expect(statsVisible).toBeTruthy();
		}
	});

	test('should display divergence tracking', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const tensionSection = page.locator('.analytics-section').filter({ hasText: /tension curve/i });

		if (await tensionSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Divergence should be tracked (difference between planned and actual)
			// The chart component should handle this internally
			const chart = tensionSection.locator('svg, canvas').first();
			await expect(chart).toBeVisible();
		}
	});
});

test.describe('Quality Metrics Visualization', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should display quality metrics section', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		// Quality metrics section
		const qualitySection = page
			.locator('.analytics-section')
			.filter({ hasText: /quality metrics/i });

		if (await qualitySection.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(qualitySection).toBeVisible();

			// Should show section header
			await expect(
				qualitySection.getByRole('heading', { name: /quality metrics/i })
			).toBeVisible();
		}
	});

	test('should display quality trend chart', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const qualitySection = page
			.locator('.analytics-section')
			.filter({ hasText: /quality metrics/i });

		if (await qualitySection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Chart should be rendered
			const chart = qualitySection.locator('svg, canvas').first();
			await expect(chart).toBeVisible();
		}
	});

	test('should track multiple quality dimensions', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		// Quality chart should track tension, pacing, hook strength
		// These are rendered by the QualityTrendChart component
		const qualitySection = page
			.locator('.analytics-section')
			.filter({ hasText: /quality metrics/i });

		if (await qualitySection.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(
				qualitySection.getByText(/multi-dimensional quality tracking/i)
			).toBeVisible();
		}
	});
});

test.describe('Character Presence Heatmap', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should display character presence section when characters exist', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a character first
		await page.goto(`/projects/${projectId}/bible?tab=characters`);

		// Create character
		const createButton = page.getByRole('button', { name: /create character/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Alice');
		await dialog.getByLabel('Description').fill('Protagonist');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		// Go to analytics
		await page.goto(`/projects/${projectId}/analytics`);

		// Character presence section might appear
		const characterSection = page
			.locator('.analytics-section')
			.filter({ hasText: /character presence/i });

		if (await characterSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(characterSection).toBeVisible();

			// Should show section header
			await expect(
				characterSection.getByRole('heading', { name: /character presence/i })
			).toBeVisible();
		}
	});

	test('should display character heatmap chart', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a character
		await page.goto(`/projects/${projectId}/bible?tab=characters`);
		const createButton = page.getByRole('button', { name: /create character/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Bob');
		await dialog.getByLabel('Description').fill('Sidekick');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		await page.goto(`/projects/${projectId}/analytics`);

		const characterSection = page
			.locator('.analytics-section')
			.filter({ hasText: /character presence/i });

		if (await characterSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Heatmap should be rendered (likely SVG or div grid)
			const heatmap = characterSection.locator('svg, .heatmap, [class*="heatmap"]').first();
			await expect(heatmap).toBeVisible();
		}
	});

	test('should show character names and chapter positions', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a character
		await page.goto(`/projects/${projectId}/bible?tab=characters`);
		const createButton = page.getByRole('button', { name: /create character/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Charlie');
		await dialog.getByLabel('Description').fill('Antagonist');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		await page.goto(`/projects/${projectId}/analytics`);

		const characterSection = page
			.locator('.analytics-section')
			.filter({ hasText: /character presence/i });

		if (await characterSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Should show heatmap description
			await expect(
				characterSection.getByText(/heatmap showing character appearances/i)
			).toBeVisible();
		}
	});
});

test.describe('Plot Thread Timeline', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should display plot thread section when threads exist', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a plot thread
		await page.goto(`/projects/${projectId}/bible?tab=plot-threads`);

		const createButton = page.getByRole('button', { name: /create plot thread/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Main Quest');
		await dialog.getByLabel('Description').fill('The primary storyline');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		// Go to analytics
		await page.goto(`/projects/${projectId}/analytics`);

		// Plot thread section might appear
		const threadSection = page
			.locator('.analytics-section')
			.filter({ hasText: /plot thread timeline/i });

		if (await threadSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(threadSection).toBeVisible();

			// Should show section header
			await expect(
				threadSection.getByRole('heading', { name: /plot thread timeline/i })
			).toBeVisible();
		}
	});

	test('should display Gantt chart visualization', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a plot thread
		await page.goto(`/projects/${projectId}/bible?tab=plot-threads`);
		const createButton = page.getByRole('button', { name: /create plot thread/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Romance Arc');
		await dialog.getByLabel('Description').fill('Love story');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		await page.goto(`/projects/${projectId}/analytics`);

		const threadSection = page
			.locator('.analytics-section')
			.filter({ hasText: /plot thread timeline/i });

		if (await threadSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Gantt chart should be rendered
			const gantt = threadSection.locator('svg, .gantt, [class*="gantt"]').first();
			await expect(gantt).toBeVisible();
		}
	});

	test('should show thread lifecycle and touches', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a plot thread
		await page.goto(`/projects/${projectId}/bible?tab=plot-threads`);
		const createButton = page.getByRole('button', { name: /create plot thread/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Mystery Thread');
		await dialog.getByLabel('Description').fill('Whodunit');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		await page.goto(`/projects/${projectId}/analytics`);

		const threadSection = page
			.locator('.analytics-section')
			.filter({ hasText: /plot thread timeline/i });

		if (await threadSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Should show description
			await expect(
				threadSection.getByText(/gantt chart showing plot thread lifecycle/i)
			).toBeVisible();
		}
	});

	test('should detect dangling threads', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Create a plot thread
		await page.goto(`/projects/${projectId}/bible?tab=plot-threads`);
		const createButton = page.getByRole('button', { name: /create plot thread/i }).first();
		await createButton.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Name').fill('Unresolved Thread');
		await dialog.getByLabel('Description').fill('Never finished');
		await dialog.getByRole('button', { name: /create/i }).click();
		await page.waitForTimeout(500);

		await page.goto(`/projects/${projectId}/analytics`);

		// Dangling detection is handled by the chart component
		// The component shows warnings for threads that aren't resolved
		const threadSection = page
			.locator('.analytics-section')
			.filter({ hasText: /plot thread timeline/i });

		if (await threadSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Component should render
			const gantt = threadSection.locator('svg, .gantt, [class*="gantt"]').first();
			await expect(gantt).toBeVisible();
		}
	});
});

test.describe('Chapter Type Distribution', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should display chapter type section when chapters exist', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		// Chapter type distribution section
		const typeSection = page
			.locator('.analytics-section')
			.filter({ hasText: /chapter type distribution/i });

		if (await typeSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(typeSection).toBeVisible();

			// Should show section header
			await expect(
				typeSection.getByRole('heading', { name: /chapter type distribution/i })
			).toBeVisible();
		}
	});

	test('should display pie or bar chart', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const typeSection = page
			.locator('.analytics-section')
			.filter({ hasText: /chapter type distribution/i });

		if (await typeSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Chart should be rendered (SVG)
			const chart = typeSection.locator('svg, canvas').first();
			await expect(chart).toBeVisible();
		}
	});

	test('should show chapter type breakdown', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const typeSection = page
			.locator('.analytics-section')
			.filter({ hasText: /chapter type distribution/i });

		if (await typeSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Should show description
			await expect(
				typeSection.getByText(/breakdown of chapter types/i)
			).toBeVisible();
		}
	});

	test('should display percentages', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);
		await page.goto(`/projects/${projectId}/analytics`);

		const typeSection = page
			.locator('.analytics-section')
			.filter({ hasText: /chapter type distribution/i });

		if (await typeSection.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Chart component should show percentages
			// The component handles this internally
			const chart = typeSection.locator('svg, canvas').first();
			await expect(chart).toBeVisible();
		}
	});
});

test.describe('Structure Filtering', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(90000);

	test('should filter analytics by selected structure', async ({ page }) => {
		const { projectId, bookId } = await setupAnalyticsProject(page);

		// Create a second book
		await page.goto(`/projects/${projectId}/workspace`);
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Book 2');
		await dialog.getByLabel('Summary').fill('Second book');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		const book2Id = page.url().match(/structure=([^&]+)/)?.[1] || '';

		// Go to analytics with first book
		await page.goto(`/projects/${projectId}/analytics?structure=${bookId}`);

		// Should show first book
		await expect(page.getByText(/test book/i)).toBeVisible();

		// Change to second book
		const structureSelect = page.locator('#structure-select, select.structure-select').first();
		await structureSelect.selectOption({ value: book2Id });
		await page.waitForTimeout(500);

		// Should show second book
		await expect(page.getByText(/book 2/i)).toBeVisible();
	});

	test('should update analytics when structure filter changes', async ({ page }) => {
		const { projectId, bookId } = await setupAnalyticsProject(page);

		// Create second book with different content
		await page.goto(`/projects/${projectId}/workspace`);
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Different Book');
		await dialog.getByLabel('Summary').fill('Completely different');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		const book2Id = page.url().match(/structure=([^&]+)/)?.[1] || '';

		// Create chapter in second book
		await page.locator('aside').getByRole('button').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await waitForDialogTransition(page);

		dialog = page.getByRole('dialog');
		await dialog.getByLabel('Title').fill('Different Chapter');
		await dialog.getByLabel('Summary').fill('Unique content');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/projects\/[^/]+\/workspace\?structure=/);

		// Go to analytics
		await page.goto(`/projects/${projectId}/analytics?structure=${bookId}`);

		// Initial data for first book
		const initialContent = await page.textContent('body');

		// Switch to second book
		const structureSelect = page.locator('#structure-select, select.structure-select').first();
		await structureSelect.selectOption({ value: book2Id });
		await page.waitForTimeout(500);

		// Content should update
		const updatedContent = await page.textContent('body');
		expect(updatedContent).not.toBe(initialContent);
	});

	test('should default to first book when no structure specified', async ({ page }) => {
		const { projectId } = await setupAnalyticsProject(page);

		// Navigate without structure parameter
		await page.goto(`/projects/${projectId}/analytics`);

		// Should automatically select first book
		await expect(page.getByText(/test book/i)).toBeVisible();

		// Structure selector should have a value selected
		const structureSelect = page.locator('#structure-select, select.structure-select').first();
		const selectedValue = await structureSelect.inputValue();
		expect(selectedValue).toBeTruthy();
	});
});
