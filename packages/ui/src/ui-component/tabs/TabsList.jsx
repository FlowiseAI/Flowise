import { styled } from '@mui/system'
import { TabsList as BaseTabsList } from '@mui/base/TabsList'
import { blue } from './tabColors'

export const TabsList = styled(BaseTabsList)(
    ({ theme, ...props }) => `
    min-width: 400px;
    background-color: ${props.sx?.backgroundColor || blue[500]};
    border-radius: 20px;
    margin-top: 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: space-between;
    box-shadow: 0px 4px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.4)' : 'rgba(0,0,0, 0.2)'};
    `
)
