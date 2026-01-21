
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from '../_firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, displayName, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Create User in Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
        });

        // 2. Create Profile in Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName: displayName || '',
            role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'admin_api'
        });

        return res.status(200).json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: error.message });
    }
}
