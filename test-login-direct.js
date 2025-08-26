const { DataSource } = require('typeorm');
const { v4: uuidv4 } = require('uuid');

// Simple test script to verify login_activity table works
async function testLoginActivity() {
    try {
        console.log('🧪 Testing login_activity table directly...');
        
        // Create a simple DataSource for SQLite
        const dataSource = new DataSource({
            type: 'sqlite',
            database: '/Users/service_one/.flowise/database.sqlite',
            synchronize: false,
            logging: false,
            entities: [],
        });

        await dataSource.initialize();
        console.log('✅ Database connected');

        // Test inserting a login activity record
        const id = uuidv4();
        const username = 'test@example.com';
        const activityCode = 1; // LOGIN_SUCCESS
        const message = '로그인 성공 테스트';
        const loginMode = 'test';
        
        await dataSource.query(`
            INSERT INTO login_activity (id, username, activity_code, message, login_mode)
            VALUES (?, ?, ?, ?, ?)
        `, [id, username, activityCode, message, loginMode]);
        
        console.log('✅ Login activity record inserted:', id);

        // Test querying the record
        const records = await dataSource.query(`
            SELECT * FROM login_activity WHERE username = ? ORDER BY attemptedDateTime DESC LIMIT 5
        `, [username]);

        console.log('📋 Recent login activities for', username, ':', records);

        await dataSource.destroy();
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testLoginActivity();