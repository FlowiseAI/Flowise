import { createStore } from 'redux'
import reducer from './reducer'

// ==============================|| REDUX - MAIN STORE ||============================== //

const store = createStore(reducer, process.env.NODE_ENV === 'development' ? window.__REDUX_DEVTOOLS_EXTENSION__?.() : undefined)
const persister = 'Free'

export { store, persister }
