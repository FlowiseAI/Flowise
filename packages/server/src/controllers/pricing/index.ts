import { Request, Response, NextFunction } from 'express'

const getPricing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const PRODUCT_IDS = {
            FREE: process.env.CLOUD_FREE_ID,
            STARTER: process.env.CLOUD_STARTER_ID,
            PRO: process.env.CLOUD_PRO_ID
        }
        const pricingPlans = [
            {
                prodId: PRODUCT_IDS.FREE,
                title: 'Free',
                subtitle: 'For trying out the platform',
                price: '$0',
                period: '/month',
                features: [
                    { text: '2 Flows & Assistants' },
                    { text: '100 Predictions / month' },
                    { text: '5MB Storage' },
                    { text: 'Evaluations & Metrics' },
                    { text: 'Custom Embedded Chatbot Branding' },
                    { text: 'Community Support' }
                ]
            },
            {
                prodId: PRODUCT_IDS.STARTER,
                title: 'Starter',
                subtitle: 'For individuals & small teams',
                mostPopular: true,
                price: '$35',
                period: '/month',
                features: [
                    { text: 'Everything in Free plan, plus' },
                    { text: 'Unlimited Flows & Assistants' },
                    { text: '10,000 Predictions / month' },
                    { text: '1GB Storage' },
                    { text: 'Email Support' }
                ]
            },
            {
                prodId: PRODUCT_IDS.PRO,
                title: 'Pro',
                subtitle: 'For medium-sized businesses',
                price: '$65',
                period: '/month',
                features: [
                    { text: 'Everything in Starter plan, plus' },
                    { text: '50,000 Predictions / month' },
                    { text: '10GB Storage' },
                    { text: 'Unlimited Workspaces' },
                    { text: '5 users', subtext: '+ $15/user/month' },
                    { text: 'Admin Roles & Permissions' },
                    { text: 'Priority Support' }
                ]
            },
            {
                title: 'Enterprise',
                subtitle: 'For large organizations',
                price: 'Contact Us',
                features: [
                    { text: 'On-Premise Deployment' },
                    { text: 'Air-gapped Environments' },
                    { text: 'SSO & SAML' },
                    { text: 'LDAP & RBAC' },
                    { text: 'Versioning' },
                    { text: 'Audit Logs' },
                    { text: '99.99% Uptime SLA' },
                    { text: 'Personalized Support' }
                ]
            }
        ]
        return res.status(200).json(pricingPlans)
    } catch (error) {
        next(error)
    }
}

export default {
    getPricing
}
