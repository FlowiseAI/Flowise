import { useEffect } from 'react'
import PropTypes from 'prop-types'

import { useAuth0 } from '@auth0/auth0-react'

const LoginDialog = ({ show, dialogProps, onConfirm }) => {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
    useEffect(() => {
        if (show && !isLoading && !isAuthenticated) {
            loginWithRedirect()
        }
    }, [show, isLoading, isAuthenticated, loginWithRedirect])
    // const portalElement = typeof document !== 'undefined' ? document.getElementById('portal') : null
    // const usernameInput = {
    //     label: 'Username',
    //     name: 'username',
    //     type: 'string',
    //     placeholder: 'john doe'
    // }
    // const passwordInput = {
    //     label: 'Password',
    //     name: 'password',
    //     type: 'password'
    // }
    // const [usernameVal, setUsernameVal] = useState('')
    // const [passwordVal, setPasswordVal] = useState('')

    // const component = show ? (
    //     <Dialog
    //         onKeyUp={(e) => {
    //             if (e.key === 'Enter') {
    //                 onConfirm(usernameVal, passwordVal)
    //             }
    //         }}
    //         open={show}
    //         fullWidth
    //         maxWidth='xs'
    //         aria-labelledby='alert-dialog-title'
    //         aria-describedby='alert-dialog-description'
    //     >
    //         <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
    //             {dialogProps.title}
    //         </DialogTitle>
    //         <DialogContent>
    //             <Typography>Username</Typography>
    //             <Input
    //                 inputParam={usernameInput}
    //                 onChange={(newValue) => setUsernameVal(newValue)}
    //                 value={usernameVal}
    //                 showDialog={false}
    //             />
    //             <div style={{ marginTop: 20 }}></div>
    //             <Typography>Password</Typography>
    //             <Input inputParam={passwordInput} onChange={(newValue) => setPasswordVal(newValue)} value={passwordVal} />
    //         </DialogContent>
    //         <DialogActions>
    //             <StyledButton variant='contained' onClick={() => onConfirm(usernameVal, passwordVal)}>
    //                 {dialogProps.confirmButtonName}
    //             </StyledButton>
    //         </DialogActions>
    //     </Dialog>
    // ) : null

    // return portalElement ? createPortal(component, portalElement) : null
}

LoginDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onConfirm: PropTypes.func
}

export default LoginDialog
