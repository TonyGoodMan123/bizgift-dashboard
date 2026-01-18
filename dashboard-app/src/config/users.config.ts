/**
 * Centralized user configuration
 * Used for auto-provisioning and initial user setup
 */

export interface InitialUser {
    email: string;
    name: string;
    role: 'super-admin' | 'admin' | 'manager';
}

/**
 * Whitelist of users with predefined roles
 * These users will be auto-provisioned on first login
 */
export const INITIAL_USERS: readonly InitialUser[] = [
    {
        email: 'scorcioner@gmail.com',
        name: 'Антон Федотов',
        role: 'super-admin'
    },
    {
        email: 'vegapro.mcc@gmail.com',
        name: 'Антон Маркелов',
        role: 'admin'
    },
    {
        email: 'koledova49@gmail.com',
        name: 'Ксения Коледова',
        role: 'manager'
    }
] as const;

/**
 * Create a map for quick email lookup
 */
export const ADMIN_EMAILS = INITIAL_USERS.reduce((acc, user) => {
    acc[user.email] = { role: user.role, name: user.name };
    return acc;
}, {} as Record<string, { role: 'super-admin' | 'admin' | 'manager'; name: string }>);
