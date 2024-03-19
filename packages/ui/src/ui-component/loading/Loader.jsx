// material-ui
import LinearProgress from '@mui/material/LinearProgress'
import { styled } from '@mui/material/styles'

// styles
const LoaderWrapper = styled('div')({
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1301,
    width: '100%'
})

// ==============================|| LOADER ||============================== //
const Loader = () => (
    <LoaderWrapper>
        <LinearProgress color='primary' />
    </LoaderWrapper>
)

export default Loader
