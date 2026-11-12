#!/usr/bin/env node
/**
 * Setup Initial Platform Administrator Script
 * 
 * Usage:
 *   node scripts/setupAdmin.cjs <admin-email> <admin-password>
 * 
 * Example:
 *   node scripts/setupAdmin.cjs admin@pawnshop.com AdminPassword123!
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'functions', '.env') });

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management'
      });
      console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT JSON.');
    } catch (e) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management' });
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    try {
      const sa = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
      console.log('Firebase Admin initialized with service account key path.');
    } catch (e) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management' });
    }
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management'
    });
    console.log('Firebase Admin initialized with project ID.');
  }
}

const db = admin.firestore();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_INITIAL_EMAIL;
  const password = args[1] || process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.error('\nError: Admin email and password must be provided.');
    console.error('Usage: node scripts/setupAdmin.cjs <email> <password>\n');
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`Setting up Platform Administrator`);
  console.log(`Target Email: ${email}`);
  console.log(`========================================\n`);

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`User already exists in Firebase Auth with UID: ${userRecord.uid}`);
      // Update password if specified
      if (password) {
        await admin.auth().updateUser(userRecord.uid, {
          password,
          emailVerified: true
        });
        console.log(`Password updated and email marked verified.`);
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email,
          password,
          emailVerified: true,
          displayName: 'Global Administrator'
        });
        console.log(`Created new Firebase Auth user with UID: ${userRecord.uid}`);
      } else {
        throw err;
      }
    }

    // Set Custom Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'global_admin',
      admin: true
    });
    console.log(`Custom user claim set: { role: 'global_admin', admin: true }`);

    // Write to Firestore collection platform_admins
    const now = Date.now();
    await db.collection('platform_admins').doc(userRecord.uid).set({
      admin_id: userRecord.uid,
      email: userRecord.email,
      displayName: 'Global Administrator',
      role: 'global_admin',
      created_at: now,
      updated_at: now,
      setup_method: 'cli_bootstrap'
    }, { merge: true });
    console.log(`Firestore record created at platform_admins/${userRecord.uid}`);

    // Audit log
    const auditId = `audit_${now}_setup`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: userRecord.uid,
      admin_email: userRecord.email,
      action: 'BOOTSTRAP_INITIAL_ADMIN',
      target_resource: 'platform_admins',
      target_id: userRecord.uid,
      details: { email: userRecord.email },
      timestamp: now,
      ip_address: 'localhost'
    });

    console.log('\nSUCCESS! Platform Administrator has been successfully configured.');
    console.log('You can now log in to the Companion Admin Panel with these credentials.\n');
  } catch (error) {
    console.error('\nFailed to setup administrator:', error.message);
    process.exit(1);
  }
}

main();
