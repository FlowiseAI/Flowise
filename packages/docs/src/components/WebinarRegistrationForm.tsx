import React, { useState, FormEvent, useEffect } from 'react'
import clsx from 'clsx'
import { marketingConfig, calculateLeadScore } from '@site/src/config/marketingConfig'
import { webinarConfig } from '@site/src/config/webinarContent'
import styles from '../pages/index.module.css'

interface FormData {
    email: string
}

interface ValidationErrors {
    [key: string]: string
}

export default function WebinarRegistrationForm(): JSX.Element {
    const [formData, setFormData] = useState<FormData>({ email: '' })
    const [errors, setErrors] = useState<ValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    // Load saved email from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedEmail = localStorage.getItem('webinar_registration_email')
            if (savedEmail) {
                setFormData({ email: savedEmail })
            }
        }
    }, [])

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setErrors({ email: 'Please enter a valid email address' })
            return false
        }
        setErrors({})
        return true
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setFormData({ email: value })

        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('webinar_registration_email', value)
        }

        // Clear errors when user starts typing
        if (errors.email) {
            setErrors({})
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!validateEmail(formData.email)) {
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            // Gather UTM parameters
            const urlParams = new URLSearchParams(window.location.search)

            // Call our API endpoint
            const response = await fetch('/api/mailerlite-subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    fields: {
                        utm_source: urlParams.get('utm_source') || 'direct',
                        utm_medium: urlParams.get('utm_medium') || 'website',
                        utm_campaign: urlParams.get('utm_campaign') || 'webinar-enterprise-ai',
                        lead_score: calculateLeadScore(formData),
                        webinar_date: webinarConfig.webinarDate,
                        webinar_time: webinarConfig.webinarTime,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                })
            })

            const result = await response.json()

            if (result.success) {
                setIsSubmitted(true)

                // Clear saved email
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('webinar_registration_email')
                    localStorage.setItem('webinar_registration_confirmed_email', formData.email)

                    // Track success event
                    window.dispatchEvent(new Event('webinar-registration-success'))
                }

                // Redirect to thank you page after delay
                setTimeout(() => {
                    window.location.href = marketingConfig.endpoints.thankYou
                }, 2000)
            } else {
                setErrors({ submit: result.message || 'Registration failed. Please try again.' })
            }
        } catch (error) {
            console.error('Registration error:', error)
            setErrors({ submit: 'Network error. Please check your connection and try again.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSubmitted) {
        return (
            <div
                className={clsx(styles.featureCard, styles.commandment)}
                style={{ textAlign: 'center', backgroundColor: 'rgba(0, 255, 0, 0.1)', border: '2px solid #00ff00' }}
            >
                <div className={styles.comingSoonIcon}>✅</div>
                <h3 style={{ color: '#00ff00' }}>Registration Confirmed!</h3>
                <p>Check your email for:</p>
                <ul style={{ textAlign: 'left', maxWidth: '300px', margin: '1rem auto' }}>
                    <li>Webinar join link</li>
                    <li>Calendar invitation</li>
                    <li>Bonus &quot;Enterprise AI Readiness Checklist&quot;</li>
                </ul>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Redirecting to confirmation page...</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '450px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    type='email'
                    name='email'
                    placeholder='Enter your work email'
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    aria-label='Email address'
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    style={{
                        width: '100%',
                        padding: '1.2rem 1.5rem',
                        borderRadius: '12px',
                        border: errors.email ? '2px solid #ff4444' : '2px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        fontSize: '1.1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                        if (!errors.email) {
                            e.target.style.border = '2px solid #00ffff'
                            e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.05)'
                        }
                    }}
                    onBlur={(e) => {
                        if (!errors.email) {
                            e.target.style.border = '2px solid rgba(255, 255, 255, 0.2)'
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                        }
                    }}
                />
                {errors.email && (
                    <div id='email-error' style={{ color: '#ff4444', fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>
                        {errors.email}
                    </div>
                )}
            </div>

            {errors.submit && (
                <div
                    style={{
                        color: '#ff4444',
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #ff4444',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}
                >
                    {errors.submit}
                </div>
            )}

            <button
                type='submit'
                disabled={isSubmitting}
                style={{
                    width: '100%',
                    padding: '1.2rem',
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    backgroundColor: isSubmitting ? '#666666' : '#00ffff',
                    color: isSubmitting ? '#cccccc' : '#000000',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    textTransform: 'none',
                    letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                    if (!isSubmitting) {
                        ;(e.target as HTMLButtonElement).style.backgroundColor = '#00cccc'
                        ;(e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
                        ;(e.target as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.3)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isSubmitting) {
                        ;(e.target as HTMLButtonElement).style.backgroundColor = '#00ffff'
                        ;(e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
                        ;(e.target as HTMLButtonElement).style.boxShadow = 'none'
                    }
                }}
            >
                {isSubmitting ? 'Registering...' : 'Reserve My Free Spot 🚀'}
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center', opacity: 0.8, fontSize: '0.9rem' }}>
                <p>🔒 Your information is secure and will never be shared</p>
            </div>
        </form>
    )
}
