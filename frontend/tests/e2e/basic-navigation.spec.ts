import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from '@axe-core/playwright'

test.describe('Basic Navigation and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting point
    await page.goto('/')
    
    // Inject axe-core for accessibility testing
    await injectAxe(page)
  })

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/YUR/)
    
    // Check for main heading
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()
    
    // Verify page has no accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    })
  })

  test('should navigate using keyboard', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab')
    
    // Check that first focusable element is focused  
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
    
    // Continue tabbing through interface
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Verify focus is still visible
    await expect(page.locator(':focus')).toBeVisible()
  })

  test('should handle mandala dock interaction', async ({ page }) => {
    // Look for mandala dock container
    const mandalaDock = page.locator('[data-testid="mandala-dock"], [class*="mandala"], nav[aria-label*="mandala" i]').first()
    
    if (await mandalaDock.isVisible()) {
      // Test click interaction
      await mandalaDock.click()
      
      // Test keyboard navigation within dock
      await mandalaDock.press('Enter')
      
      // Check for focus management
      await expect(page.locator(':focus')).toBeVisible()
    } else {
      // If mandala dock not present, just verify navigation exists
      const nav = page.locator('nav').first()
      await expect(nav).toBeVisible()
    }
  })

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Verify content still visible and usable
    const mainContent = page.locator('main, [role="main"], body > div').first()
    await expect(mainContent).toBeVisible()
    
    // Test touch interactions
    if (await page.locator('button').first().isVisible()) {
      const button = page.locator('button').first()
      await button.tap()
    }
    
    // Verify no horizontal scrolling
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // Allow 1px tolerance
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 page (if exists)
    const response = await page.goto('/non-existent-page')
    
    if (response && response.status() === 404) {
      // Should have accessible error page
      await expect(page).toHaveTitle(/404|Not Found/i)
      await checkA11y(page)
    }
    
    // Test error boundaries by simulating network failure
    await page.route('**/api/**', route => route.abort())
    
    // Navigate back to home and check error handling  
    await page.goto('/')
    
    // Look for error messages or fallback content
    const errorMessage = page.locator('[data-testid="error"], [class*="error"], [role="alert"]').first()
    
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/error|failed|unable/i)
    }
  })

  test('should support skip links', async ({ page }) => {
    // Look for skip link
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link').first()
    
    if (await skipLink.isVisible()) {
      await skipLink.click()
      
      // Verify focus moved to main content
      const mainContent = page.locator('#main, #content, main').first()
      await expect(mainContent).toBeFocused()
    }
  })

  test('should announce dynamic content changes', async ({ page }) => {
    // Look for live regions
    const liveRegion = page.locator('[aria-live], [role="status"], [role="alert"]').first()
    
    if (await liveRegion.isVisible()) {
      // Verify live region has proper attributes
      const ariaLive = await liveRegion.getAttribute('aria-live')
      expect(ariaLive).toMatch(/polite|assertive/)
    }
    
    // Test dynamic content updates (if applicable)
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    if (buttonCount > 0) {
      const firstButton = buttons.first()
      await firstButton.click()
      
      // Wait for any dynamic updates
      await page.waitForTimeout(1000)
      
      // Verify page is still accessible after interaction
      await checkA11y(page)
    }
  })

  test('should maintain color contrast standards', async ({ page }) => {
    // Run comprehensive accessibility check focused on color contrast
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
        'color-contrast-enhanced': { enabled: true }
      }
    })
  })

  test('should handle form interactions accessibly', async ({ page }) => {
    // Look for forms
    const form = page.locator('form').first()
    
    if (await form.isVisible()) {
      // Check form labels
      const inputs = form.locator('input, textarea, select')
      const inputCount = await inputs.count()
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const inputId = await input.getAttribute('id')
        
        if (inputId) {
          const label = page.locator(`label[for="${inputId}"]`)
          await expect(label).toBeVisible()
        }
      }
      
      // Test form submission
      const submitButton = form.locator('button[type="submit"], input[type="submit"]').first()
      
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for any form validation messages
        await page.waitForTimeout(1000)
        
        // Check for error messages
        const errorMessages = page.locator('[aria-invalid="true"] ~ [role="alert"], .error-message, [data-testid*="error"]')
        const errorCount = await errorMessages.count()
        
        if (errorCount > 0) {
          // Verify error messages are properly associated
          for (let i = 0; i < errorCount; i++) {
            const error = errorMessages.nth(i)
            await expect(error).toBeVisible()
          }
        }
      }
    }
  })
})