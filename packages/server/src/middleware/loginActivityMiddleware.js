const { LoginActivityLogger, LoginActivityCode } = require('../utils/loginActivityLogger');

// Middleware to log login activities
function createLoginActivityMiddleware() {
    const logger = new LoginActivityLogger();

    return async (req, res, next) => {
        // Only intercept login requests
        if (req.path === '/api/v1/auth/login' && req.method === 'POST') {
            console.log('🎯 Login request intercepted');
            
            // Store original res.json method
            const originalJson = res.json;
            
            // Override res.json to capture response
            res.json = function(data) {
                try {
                    const email = req.body?.email || 'unknown';
                    
                    if (res.statusCode === 200 && data && !data.error) {
                        // Success login
                        logger.logActivity(
                            email,
                            LoginActivityCode.LOGIN_SUCCESS,
                            '로그인 성공',
                            'local'
                        );
                    } else {
                        // Failed login
                        const errorMsg = data?.message || data?.error || '로그인 실패';
                        logger.logActivity(
                            email,
                            LoginActivityCode.LOGIN_FAILED,
                            `로그인 실패: ${errorMsg}`,
                            'local'
                        );
                    }
                } catch (error) {
                    console.error('❌ Login activity middleware error:', error);
                }
                
                // Call original res.json
                return originalJson.call(this, data);
            };
        }
        
        next();
    };
}

module.exports = createLoginActivityMiddleware;