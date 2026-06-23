const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test('Jobify complete job application flow', async ({ page }) => {
  // Read candidate data from dashboard
  const dataPath = path.resolve(__dirname, '../dashboard/candidate-data.json');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  } catch (err) {
    data = {
      firstName: 'Aarav', lastName: 'Patel', email: 'aarav.patel@example.com',
      mobile: '+91 9876543210', location: 'Mumbai, India',
      address: '123, Tech Park, Andheri East, Mumbai, MH 400069', phoneType: 'Mobile',
      college: 'IIT Bombay', degree: 'B.Tech', gradYear: '2023',
      specialization: 'Computer Science & Engineering', company: 'TCS',
      designation: 'Software Engineer', duration: '1 year 2 months',
      skills: 'React, Node.js, Playwright'
    };
  }

  // Navigate to the application 
  await page.goto('https://jobify-client-mu.vercel.app');

  // Wait for the jobs grid to load and select the first job
  await page.waitForSelector('#jobs-grid');
  
  // Click on the first job's apply button
  await page.click('#apply-btn-0');

  // Verify the application form is displayed
  await expect(page.locator('#form-job-title')).toBeVisible();

  // Helper to type letter by letter
  const typeSlowly = async (selector, text) => {
    await page.locator(selector).focus();
    await page.locator(selector).pressSequentially(text, { delay: 50 });
  };

  // --- 1. Personal Information ---
  await typeSlowly('#input-first-name', data.firstName);
  await typeSlowly('#input-last-name', data.lastName);
  await typeSlowly('#input-email', data.email);
  await typeSlowly('#input-mobile', data.mobile);
  await page.selectOption('#select-phone-type', data.phoneType);
  await typeSlowly('#input-location', data.location);
  await typeSlowly('#input-address', data.address);

  // --- 2. Resume Upload ---
  const resumePath = path.resolve(__dirname, '../resume.pdf');
  await page.setInputFiles('#input-resume', resumePath);
  
  // Verify upload was successful by checking the file name
  await expect(page.locator('#resume-filename')).toHaveText('resume.pdf');

  // --- 3. Education Details ---
  await typeSlowly('#input-college', data.college);
  await page.selectOption('#select-degree', data.degree);
  await page.selectOption('#select-grad-year', data.gradYear);
  await typeSlowly('#input-specialization', data.specialization);

  // --- 4. Work Experience ---
  await page.check('#checkbox-has-experience');
  await typeSlowly('#input-company', data.company);
  await typeSlowly('#input-designation', data.designation);
  await typeSlowly('#input-duration', data.duration);

  // --- 5. Skills ---
  const skills = data.skills.split(',').map(s => s.trim());
  for (const skill of skills) {
    if (!skill) continue;
    await typeSlowly('#input-skill', skill);
    await page.keyboard.press('Enter');
  }

  // --- 6. Privacy & Submit ---
  await page.check('#checkbox-privacy');
  await page.click('#btn-submit-application');

  // --- 7. Validation ---
  // Wait for the Success Modal to appear
  const successModalHeading = page.locator('h2:has-text("Application Submitted!")');
  await expect(successModalHeading).toBeVisible({ timeout: 5000 });

  // --- 8. Dummy SMTP Email Notification ---
  const nodemailer = require('nodemailer');
  
  // Create a test account on Ethereal (a dummy SMTP service)
  const testAccount = await nodemailer.createTestAccount();

  // Create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  // Send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Jobify Careers" <no-reply@jobify.com>',
    to: data.email,
    subject: "Application Received - Frontend Engineer",
    text: `Hi ${data.firstName}, we have received your application for the Frontend Engineer position. We will review it and get back to you shortly.`,
    html: `<b>Hi ${data.firstName},</b><br>We have received your application for the Frontend Engineer position. We will review it and get back to you shortly.`,
  });

  console.log("Dummy email sent! Message ID: %s", info.messageId);
  console.log("View your dummy email here: %s", nodemailer.getTestMessageUrl(info));
});
