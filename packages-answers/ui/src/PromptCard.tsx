import React from 'react'
import { useFlags } from 'flagsmith/react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'

import { useAnswers } from './AnswersContext'

import { StarterPrompt } from 'types'
interface PromptCardProps extends StarterPrompt {
    onClick: () => void
}

const PromptCard: React.FC<PromptCardProps> = ({
    // id,
    prompt,
    // content,
    // likes,
    // dislikes,
    // usages,
    onClick
}) => {
    const flags = useFlags(['delete_prompt'])
    const { deletePrompt, updatePrompt } = useAnswers()
    const [lastInteraction, setLastInteraction] = React.useState<string>('')

    // const handleLike = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    //   evt.stopPropagation();
    //   evt.preventDefault();
    //   setLastInteraction('like');
    //   if (id)
    //     await updatePrompt({
    //       id: id,
    //       likes: (likes ?? 0) + 1
    //     });
    // };
    // const handleDislike = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    //   evt.stopPropagation();
    //   evt.preventDefault();
    //   setLastInteraction('dislike');
    //   if (id)
    //     await updatePrompt({
    //       id,
    //       dislikes: (dislikes ?? 0) + 1
    //     });
    // };
    return (
        <Card
            sx={{
                display: 'flex',
                flexShrink: 0,
                position: 'relative',
                alignItems: 'space-between',
                justifyContent: 'space-between',
                flexDirection: 'column'
            }}
        >
            {/* {flags?.delete_prompt?.enabled ? (
        <CardHeader
          sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}
          action={
            <MenuButton
              aria-label="menu"
              actions={[
                { text: 'Delete Prompt', onClick: () => deletePrompt(id), icon: <Delete /> }
              ]}>
              <IconButton>
                <MoreVert />
              </IconButton>
            </MenuButton>
          }
        />
      ) : null} */}
            <Box
                sx={{
                    width: '100%',
                    flex: '1',
                    display: 'flex'
                }}
            >
                <CardActionArea
                    sx={
                        {
                            // minHeight: '100%',
                            // display: 'flex',
                            // flexDirection: 'column',
                            // justifyContent: 'space-between'
                            // ...(flags?.delete_prompt?.enabled && {
                            //   paddingRight: 4
                            // })
                            // paddingBottom: 4
                        }
                    }
                    onClick={onClick}
                >
                    <CardContent
                        sx={{
                            width: '100%'
                            // display: 'flex',
                            // gap: 1
                        }}
                    >
                        {prompt ? (
                            <Typography
                                variant='body2'
                                color='text.secondary'
                                component='div'
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: '3',
                                    WebkitBoxOrient: 'vertical'
                                }}
                            >
                                {prompt}
                            </Typography>
                        ) : null}
                    </CardContent>
                </CardActionArea>
            </Box>
            {/* <CardActions
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 0,
          bottom: 0
        }}>
        <Box sx={{ display: 'flex' }}>
          {usages ? (
            <Button size="small" disabled startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}>
              {usages}
            </Button>
          ) : null}

          <Button size="small" disabled startIcon={<Favorite sx={{ fontSize: 16 }} />}>
            {likes - dislikes}
          </Button>
        </Box>
        <Box>
          <IconButton
            color={lastInteraction === 'like' ? 'secondary' : 'default'}
            sx={{}}
            size="small"
            onClick={handleLike}>
            <ThumbUpIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            color={lastInteraction === 'dislike' ? 'secondary' : 'default'}
            onClick={handleDislike}>
            <ThumbDownIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </CardActions> */}
        </Card>
    )
}

export default PromptCard
