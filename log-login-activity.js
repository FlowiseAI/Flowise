const { LoginActivityLogger, LoginActivityCode } = require('./packages/server/src/utils/loginActivityLogger');

// Manual login activity logger
async function logLoginActivity(username, success = true, message = '') {
    const logger = new LoginActivityLogger();
    
    try {
        if (success) {
            await logger.logActivity(
                username,
                LoginActivityCode.LOGIN_SUCCESS,
                message || '로그인 성공',
                'manual'
            );
            console.log(`✅ Logged successful login for: ${username}`);
        } else {
            await logger.logActivity(
                username,
                LoginActivityCode.LOGIN_FAILED,
                message || '로그인 실패',
                'manual'
            );
            console.log(`❌ Logged failed login for: ${username}`);
        }
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0];
const success = args[1] !== 'false';
const message = args[2] || '';

if (!username) {
    console.log('Usage: node log-login-activity.js <username> [success=true] [message]');
    console.log('Example: node log-login-activity.js admin@example.com true "로그인 성공"');
    process.exit(1);
}

logLoginActivity(username, success, message);