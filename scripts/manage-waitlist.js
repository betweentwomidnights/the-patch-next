#! /usr/bin/env node
// scripts/manage-waitlist.js

const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

// File path for the waitlist JSON
const WAITLIST_FILE = path.join(__dirname, '..', 'data', 'android-waitlist.json');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'b2mkevin@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// Helper function to read the waitlist file
async function readWaitlist() {
    try {
        const data = await fs.readFile(WAITLIST_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading waitlist:', error);
        process.exit(1);
    }
}

// Email notification function
async function sendNotification(user) {
    try {
        await transporter.sendMail({
            from: 'b2mkevin@gmail.com',
            to: 'b2mkevin@gmail.com',
            subject: '🎵 New gary4beatbox Android Signup',
            text: `
New signup for gary4beatbox Android:

Name: ${user.firstName}
Email: ${user.email}
Signup Date: ${new Date(user.signupDate).toLocaleString()}

-- 
the patch waitlist bot
            `.trim()
        });
        console.log('✉️  Notification email sent');
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
}

// Watch function for file changes
async function watchWaitlist() {
    let lastContent = await fs.readFile(WAITLIST_FILE, 'utf8');
    let lastData = JSON.parse(lastContent);
    let lastCount = lastData.users.length;

    console.log('👀 Watching for new signups...');
    console.log(`Currently have ${lastCount} users on the waitlist`);

    fs.watch(WAITLIST_FILE, async (eventType) => {
        if (eventType === 'change') {
            try {
                const newContent = await fs.readFile(WAITLIST_FILE, 'utf8');
                const newData = JSON.parse(newContent);
                
                // If we have more users than before
                if (newData.users.length > lastCount) {
                    const newUsers = newData.users.slice(lastCount);
                    for (const user of newUsers) {
                        await sendNotification(user);
                    }
                }
                
                lastContent = newContent;
                lastData = newData;
                lastCount = newData.users.length;
            } catch (error) {
                console.error('Error processing file change:', error);
            }
        }
    });
}

async function main() {
    const command = process.argv[2];

    // Check for required environment variable
    if (!process.env.GMAIL_APP_PASSWORD) {
        console.error('Error: GMAIL_APP_PASSWORD environment variable not set');
        console.error('Please set it with: export GMAIL_APP_PASSWORD=your-app-password');
        process.exit(1);
    }

    switch (command) {
        case 'list':
            const data = await readWaitlist();
            console.log('\n📋 Android Waitlist Signups:');
            console.log('------------------------');
            data.users.forEach((user, index) => {
                const date = new Date(user.signupDate).toLocaleDateString();
                console.log(`${index + 1}. ${user.firstName} (${user.email}) - Signed up: ${date}`);
            });
            console.log(`\nTotal: ${data.users.length} signups`);
            break;

        case 'export':
            const waitlist = await readWaitlist();
            const csvContent = ['First Name,Email,Signup Date'];
            waitlist.users.forEach(user => {
                csvContent.push(`${user.firstName},${user.email},${user.signupDate}`);
            });
            const exportPath = path.join(process.cwd(), 'android-waitlist.csv');
            await fs.writeFile(exportPath, csvContent.join('\n'));
            console.log(`📁 Exported to ${exportPath}`);
            break;

        case 'remove':
            const emailToRemove = process.argv[3];
            if (!emailToRemove) {
                console.error('⚠️  Please provide an email to remove');
                process.exit(1);
            }
            const currentData = await readWaitlist();
            const updatedUsers = currentData.users.filter(user => user.email !== emailToRemove);
            if (updatedUsers.length === currentData.users.length) {
                console.log(`❌ No user found with email: ${emailToRemove}`);
            } else {
                await fs.writeFile(
                    WAITLIST_FILE, 
                    JSON.stringify({ users: updatedUsers }, null, 2)
                );
                console.log(`✅ Removed user with email: ${emailToRemove}`);
            }
            break;

        case 'search':
            const searchTerm = process.argv[3]?.toLowerCase();
            if (!searchTerm) {
                console.error('⚠️  Please provide a search term');
                process.exit(1);
            }
            const searchData = await readWaitlist();
            const results = searchData.users.filter(user => 
                user.email.toLowerCase().includes(searchTerm) || 
                user.firstName.toLowerCase().includes(searchTerm)
            );
            if (results.length === 0) {
                console.log('❌ No matches found');
            } else {
                console.log('\n🔍 Search Results:');
                console.log('---------------');
                results.forEach((user, index) => {
                    const date = new Date(user.signupDate).toLocaleDateString();
                    console.log(`${index + 1}. ${user.firstName} (${user.email}) - Signed up: ${date}`);
                });
            }
            break;

        case 'watch':
            await watchWaitlist();
            // Keep process running
            process.stdin.resume();
            break;
        
            case 'test-email':
                console.log('Sending test email...');
                await sendNotification({
                    firstName: 'Test',
                    email: 'test@example.com',
                    signupDate: new Date().toISOString()
                });
                console.log('If you don\'t see any errors above, check your inbox!');
                break;

        default:
            console.log(`
📱 gary4beatbox Android Waitlist Manager

Usage:
  node manage-waitlist.js list              - Show all signups
  node manage-waitlist.js export            - Export to CSV
  node manage-waitlist.js remove <email>    - Remove a signup by email
  node manage-waitlist.js search <term>     - Search by name or email
  node manage-waitlist.js watch             - Watch for new signups and send notifications
  node manage-waitlist.js test-email        - Send a test email notification

Note: Make sure GMAIL_APP_PASSWORD environment variable is set before running any commands.
            `);
    }
}

main().catch(console.error);