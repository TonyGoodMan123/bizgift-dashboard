
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

    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { uid } = req.query;

        if (!uid || typeof uid !== 'string') {
            return res.status(400).json({ error: 'Missing uid' });
        }

        // Security Check: Don't delete Super-Admin
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'super-admin') {
            return res.status(403).json({ error: 'Cannot delete Super-Admin' });
        }

        // 1. Delete from Authentication
        await admin.auth().deleteUser(uid);

        // 2. Delete from Firestore
        await admin.firestore().collection('users').doc(uid).delete();

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ error: error.message });
    }
}
