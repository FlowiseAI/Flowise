import { useLocation, matchPath } from 'react-router'
import { Breadcrumbs, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import PropTypes from 'prop-types'

function BreadcrumbsComponent({ crumbs = [] }) {
    const location = useLocation()
    return (
        <div>
            <Breadcrumbs aria-label='breadcrumb'>
                {crumbs.map(({ link, name }) => {
                    const isActive = !!matchPath({ path: link }, location.pathname)
                    return (
                        <RouterLink
                            key={name}
                            to={link}
                            style={{
                                color: 'unset',
                                textDecoration: 'unset'
                            }}
                        >
                            <Typography
                                component='span'
                                color={isActive ? 'primary' : 'inherit'}
                                style={{
                                    textTransform: 'capitalize'
                                }}
                            >
                                {name}
                            </Typography>
                        </RouterLink>
                    )
                })}
            </Breadcrumbs>
        </div>
    )
}

BreadcrumbsComponent.propTypes = {
    crumbs: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            link: PropTypes.string.isRequired
        })
    ).isRequired
}
export { BreadcrumbsComponent }
