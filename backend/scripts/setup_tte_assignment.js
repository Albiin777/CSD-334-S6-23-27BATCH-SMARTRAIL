/**
 * SmartRail - TTE Assignment Setup Script
 * 
 * This script creates the necessary Firestore documents for TTE dashboard to work:
 * 1. A train document in the 'trains' collection
 * 2. A TTE assignment linking the TTE to specific coaches
 * 
 * Usage: node backend/scripts/setup_tte_assignment.js
 * 
 * Make sure you have firebase-service-account.json in the backend/ folder
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - EDIT THESE VALUES
const CONFIG = {
    // TTE Details (match with your authorized TTE email)
    tte: {
        name: "Raisha Hashly",                    // TTE's full name
        email: "raishahashly15@gmail.com",        // Must match the email TTE logs in with
        employee_id: "TTE-001",
        phone: "+919446824103"
    },
    
    // Train Details
    train: {
        train_number: "12625",
        train_name: "Kerala Express",
        source: "NDLS",                           // Source station code
        source_name: "New Delhi",
        destination: "TVC",                       // Destination station code
        destination_name: "Thiruvananthapuram Central",
        departure_time: "11:15",
        arrival_time: "14:30",
        running_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    
    // Coach Assignment
    assignment: {
        coach_ids: ["S1", "S2", "S3", "S4"],      // Coaches assigned to this TTE
        duty_date: new Date().toISOString().split('T')[0], // Today
        shift_start: "11:00",
        shift_end: "23:59",
        shift: "Full Journey",
        zone: "Northern Railway",
        division: "Delhi"
    }
};

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '..', 'firebase-service-account.json');

if (!existsSync(serviceAccountPath)) {
    console.error('❌ Firebase service account not found at:', serviceAccountPath);
    console.error('   Please place your firebase-service-account.json file in the backend/ folder');
    process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function setupTTEAssignment() {
    console.log('🚂 SmartRail TTE Assignment Setup\n');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Create/Update Train Document
        console.log('\n📋 Step 1: Setting up train document...');
        
        const trainRef = db.collection('trains').doc(CONFIG.train.train_number);
        await trainRef.set({
            train_number: CONFIG.train.train_number,
            trainNumber: CONFIG.train.train_number,
            train_name: CONFIG.train.train_name,
            trainName: CONFIG.train.train_name,
            source: CONFIG.train.source,
            destination: CONFIG.train.destination,
            source_name: CONFIG.train.source_name,
            destination_name: CONFIG.train.destination_name,
            departure_time: CONFIG.train.departure_time,
            arrival_time: CONFIG.train.arrival_time,
            running_days: CONFIG.train.running_days,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`   ✅ Train ${CONFIG.train.train_number} (${CONFIG.train.train_name}) created/updated`);
        
        // Step 2: Create/Update TTE Profile
        console.log('\n👤 Step 2: Setting up TTE profile...');
        
        // Check if profile exists
        const profileQuery = await db.collection('profiles')
            .where('email', '==', CONFIG.tte.email.toLowerCase())
            .limit(1)
            .get();
        
        if (profileQuery.empty) {
            // Create new profile
            const profileRef = db.collection('profiles').doc();
            await profileRef.set({
                email: CONFIG.tte.email.toLowerCase(),
                full_name: CONFIG.tte.name,
                phone: CONFIG.tte.phone,
                role: 'tte',
                employee_id: CONFIG.tte.employee_id,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`   ✅ Created TTE profile for ${CONFIG.tte.email}`);
        } else {
            // Update existing profile to TTE role
            const profileDoc = profileQuery.docs[0];
            await profileDoc.ref.update({
                role: 'tte',
                full_name: CONFIG.tte.name,
                employee_id: CONFIG.tte.employee_id,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`   ✅ Updated existing profile to TTE role for ${CONFIG.tte.email}`);
        }
        
        // Step 3: Create TTE Assignment
        console.log('\n🎫 Step 3: Creating TTE assignment...');
        
        // First, deactivate any existing active assignments for this TTE
        const existingAssignments = await db.collection('tte_assignments')
            .where('tte_email', '==', CONFIG.tte.email.toLowerCase())
            .where('status', '==', 'active')
            .get();
        
        for (const doc of existingAssignments.docs) {
            await doc.ref.update({ status: 'inactive' });
        }
        
        // Create new active assignment
        const assignmentRef = await db.collection('tte_assignments').add({
            tte_name: CONFIG.tte.name,
            tte_id: CONFIG.tte.employee_id,
            tte_email: CONFIG.tte.email.toLowerCase(),
            
            train_no: CONFIG.train.train_number,
            train_name: CONFIG.train.train_name,
            source_station: `${CONFIG.train.source_name} (${CONFIG.train.source})`,
            dest_station: `${CONFIG.train.destination_name} (${CONFIG.train.destination})`,
            
            coach_ids: CONFIG.assignment.coach_ids,
            coach_labels: CONFIG.assignment.coach_ids, // Same as coach_ids for display
            
            duty_date: CONFIG.assignment.duty_date,
            journey_date: CONFIG.assignment.duty_date,
            shift: CONFIG.assignment.shift,
            shift_start: CONFIG.assignment.shift_start,
            shift_end: CONFIG.assignment.shift_end,
            
            zone: CONFIG.assignment.zone,
            division: CONFIG.assignment.division,
            
            status: 'active',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ Assignment created with ID: ${assignmentRef.id}`);
        console.log(`   📍 Assigned Coaches: ${CONFIG.assignment.coach_ids.join(', ')}`);
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✨ SETUP COMPLETE!\n');
        console.log('TTE Dashboard will now show:');
        console.log(`   • TTE Name: ${CONFIG.tte.name}`);
        console.log(`   • Train: ${CONFIG.train.train_number} ${CONFIG.train.train_name}`);
        console.log(`   • Route: ${CONFIG.train.source_name} → ${CONFIG.train.destination_name}`);
        console.log(`   • Coaches: ${CONFIG.assignment.coach_ids.join(', ')}`);
        console.log(`   • Duty Date: ${CONFIG.assignment.duty_date}`);
        console.log(`   • Shift: ${CONFIG.assignment.shift_start} - ${CONFIG.assignment.shift_end}`);
        console.log('\n⚠️  Make sure the TTE logs in with:', CONFIG.tte.email);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('\n❌ Error during setup:', error.message);
        throw error;
    }
}

// Run the setup
setupTTEAssignment()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
