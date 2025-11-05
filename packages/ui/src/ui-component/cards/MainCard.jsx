// MainCard.jsx
import PropTypes from 'prop-types';
import React from 'react';
import { Card, CardContent } from '@mui/material';

const MainCard = ({
  children,
  content = true,
  contentSX = {},
  boxShadow = false,
  shadow,
  ...others
}) => {
  return (
    <Card
      elevation={boxShadow ? 1 : 0}
      {...others}
      sx={{
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : 'transparent',
        border: 'none',
        boxShadow: (theme) => (theme.palette.mode === 'dark' ? 'none' : undefined),
        ':hover': {
          boxShadow: boxShadow ? shadow || '0 2px 14px 0 rgb(32 40 45 / 8%)' : 'inherit'
        },
        ...others.sx
      }}
    >
      {content ? <CardContent sx={contentSX}>{children}</CardContent> : children}
    </Card>
  );
};

MainCard.propTypes = {
  children: PropTypes.node,
  content: PropTypes.bool,
  contentSX: PropTypes.object,
  boxShadow: PropTypes.bool,
  shadow: PropTypes.string
};

export default MainCard;
