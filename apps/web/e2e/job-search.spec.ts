import { expect, test, type Page } from '@playwright/test';

const password = 'password123';
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

async function register(page: Page, name = 'E2E Tester') {
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('redirects signed-out visitors to the login page', async ({ page }) => {
  await page.goto('/applications');
  await expect(page).toHaveURL(/\/login\?next=%2Fapplications/);
  await expect(page.getByRole('heading', { name: 'Sign in to JobFlow' })).toBeVisible();
});

test('shows field errors from validation', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Name is required')).toBeVisible();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
});

test('tracks an application from wishlist to offer', async ({ page }) => {
  await register(page);
  await expect(page.getByText(/No applications yet/)).toBeVisible();

  // Create an application with a brand-new company.
  await page.getByRole('link', { name: 'New application' }).first().click();
  await page.getByLabel('Job title').fill('Junior Full-Stack Developer');
  await page.getByLabel('Company').fill('Playwright Labs');
  await page.getByLabel('Status').selectOption('APPLIED');
  await page.getByLabel(/^Source/).fill('LinkedIn');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Junior Full-Stack Developer' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Playwright Labs' })).toBeVisible();

  // Scheduling an interview moves it to "Interviewing".
  await page.getByRole('button', { name: 'Add interview' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type').selectOption('TECHNICAL');
  await dialog.getByLabel('Date and time').fill('2030-05-04T10:30');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Status')).toHaveValue('INTERVIEWING');
  await expect(page.getByText('Moved to Interviewing')).toBeVisible();

  // Record an offer.
  await page.getByRole('button', { name: 'Record offer' }).click();
  await dialog.getByLabel('Base salary').fill('48000');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Status')).toHaveValue('OFFER');
  await expect(page.getByText('€48,000')).toBeVisible();

  // Add a note.
  await page.getByPlaceholder('Write a note…').fill('Negotiate start date.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Negotiate start date.' })).toBeVisible();
  await expect(page.getByPlaceholder('Write a note…')).toHaveValue('');

  // The list and the dashboard reflect it.
  await page.getByRole('navigation').getByRole('link', { name: 'Applications' }).click();
  await page.getByRole('searchbox').fill('playwright');
  await expect(page.getByRole('link', { name: /Junior Full-Stack Developer/ }).first()).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByText('Offer rate')).toBeVisible();
  await expect(page.getByText('100%').first()).toBeVisible();
});

test('switches the interface to Turkish', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'tr' }).first().click();
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
});
