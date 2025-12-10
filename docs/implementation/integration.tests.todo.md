● The integration tests didn't catch these issues for several reasons:

  1. Conditional Skip Pattern

  Almost every test uses this pattern:
  if (await cycleSection.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(cycleSection).toBeVisible();
  }

  This means: if the component fails to render (due to a JS error), the test silently passes by skipping the
   assertions. The .catch(() => false) swallows the error.

  2. Very Short Timeouts

  The timeout: 1000 (1 second) is too short. If the page crashes with a JavaScript error, the conditional
  check times out, returns false, and the test moves on without failing.

  3. Shallow Assertions

  The tests only check for element visibility:
  await expect(hookSection.locator('.hook-patterns, [class*="hook"]').first()).toBeVisible();

  They don't verify:
  - That hookManagement.distribution renders properly
  - That cycleEnforcement.phaseInfo.tensionTargets actually has values
  - That the visualization components render their data correctly

  4. No Console Error Detection

  The tests don't check for JavaScript console errors. Playwright can detect these, but these tests don't
  use that feature.

  Fix Recommendations

  1. Remove the conditional skip pattern - Tests should fail if components don't render
  2. Add console error detection - Use page.on('pageerror', ...) to fail on JS errors
  3. Add deeper assertions - Verify actual content, not just element presence
  4. Increase timeouts or use proper wait conditions

  Example of how a test should look:
  test('should display cycle indicator with tension targets', async ({ page }) => {
    const { projectId } = await setupSerialProject(page);

    // Fail on any console error
    page.on('pageerror', (err) => { throw err; });

    await page.goto(`/projects/${projectId}/serial`);

    // Don't skip - fail if not visible
    await expect(page.locator('.cycle-indicator')).toBeVisible();

    // Verify actual content renders
    await expect(page.locator('.cycle-phase')).toBeVisible();
    await expect(page.getByText(/Cycle \d+/)).toBeVisible();
  });