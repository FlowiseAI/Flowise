import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { LoginActivityService, LoginActivityCode } from './services/LoginActivityService'

export async function testLoginActivity() {
    try {
        console.log('🧪 Testing LoginActivity...')
        
        // Check if entity is registered
        const app = getRunningExpressApp()
        const metadata = app.AppDataSource.getMetadata('login_activity')
        console.log('📊 LoginActivity entity metadata:', metadata)
        
        // Test creating an activity
        const loginActivityService = new LoginActivityService()
        const result = await loginActivityService.logActivity({
            username: 'test@example.com',
            activityCode: LoginActivityCode.LOGIN_SUCCESS,
            message: '테스트 로그인',
            loginMode: 'test'
        })
        
        console.log('✅ Test login activity created:', result)
        
        // Get recent activities
        const activities = await loginActivityService.getRecentActivity(5)
        console.log('📋 Recent activities:', activities)
        
    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}