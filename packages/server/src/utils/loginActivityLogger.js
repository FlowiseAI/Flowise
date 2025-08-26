const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Simple login activity logger that works in production mode
class LoginActivityLogger {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || path.join(process.env.HOME, '.flowise', 'database.sqlite');
    }

    async logActivity(username, activityCode, message, loginMode = 'local') {
        try {
            // Use dynamic import for sqlite3 to avoid build issues
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database(this.dbPath);

            const id = uuidv4();
            
            return new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO login_activity (id, username, activity_code, message, login_mode)
                     VALUES (?, ?, ?, ?, ?)`,
                    [id, username, activityCode, message, loginMode],
                    function(err) {
                        if (err) {
                            console.error('❌ Failed to log login activity:', err);
                            reject(err);
                        } else {
                            console.log('✅ Login activity logged:', id);
                            resolve({ id });
                        }
                        db.close();
                    }
                );
            });
        } catch (error) {
            console.error('❌ Login activity logger error:', error);
        }
    }
}

// Activity codes
const LoginActivityCode = {
    LOGIN_SUCCESS: 1,
    LOGIN_FAILED: 2,
    LOGOUT: 3,
    SESSION_EXPIRED: 4,
    PASSWORD_RESET: 5
};

module.exports = {
    LoginActivityLogger,
    LoginActivityCode
};