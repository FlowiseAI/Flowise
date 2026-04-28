import { styled } from '@mui/system'
import { buttonClasses } from '@mui/base/Button'
import { Tab as BaseTab, tabClasses } from '@mui/base/Tab'
import { blue } from './tabColors'

export const Tab = styled(BaseTab)(
    ({ ...props }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: bold;
  background-color: transparent;
  width: 100%;
  line-height: 1.5;
  padding: 8px 12px;
  margin: 6px;
  border: none;
  border-radius: 25px;
  display: flex;
  justify-content: center;

  &:hover {
    background-color: ${props.sx?.backgroundColor || blue[400]};
  }

  &:focus {
    color: #fff;
    outline: 3px solid ${props.sx?.backgroundColor || blue[200]};
  }

  &.${tabClasses.selected} {
    background-color: #fff;
    color: ${blue[600]};
  }

  &.${buttonClasses.disabled} {
    opacity: 0.5;
    cursor: not-allowed;
  }
 `
)
