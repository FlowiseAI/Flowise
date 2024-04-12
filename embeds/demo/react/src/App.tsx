import { BubbleChat } from 'flowise-embed-react'
import flowiseLogo from '/flowise.png'
import './App.css'

function App() {
    return (
        <>
            <div>
                <a href='https://flowiseai.com' target='_blank'>
                    <img src={flowiseLogo} className='logo' alt='Vite logo' />
                </a>
            </div>
            <h1>Test Bench</h1>
            <div className='card'>
                <p>
                    Change <code>chatflowid</code> and <code>apiHost</code> for the embed component in: <code>src/App.tsx</code> (React) and{' '}
                    <code>index.html</code> (JS)
                </p>
                <p>
                    Check the{' '}
                    <a href='https://docs.flowiseai.com/using-flowise/embed' target='_blank'>
                        Flowise documentation
                    </a>{' '}
                    to see how to embed the chat widget on your site.
                </p>
            </div>
            <BubbleChat chatflowid='your-chatflow-id' apiHost='http://localhost:3000' />
        </>
    )
}

export default App
