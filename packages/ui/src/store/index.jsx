import { createStore } from 'redux'
import reducer from './reducer'

// ==============================|| REDUX - MAIN STORE ||============================== //

const store = createStore(reducer, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__({ trace: true }))
const persister = 'Free'

export { store, persister }
