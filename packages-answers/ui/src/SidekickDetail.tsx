'use client'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'

import { AnswersProvider } from './AnswersContext'
import Fieldset from './Fieldset'
import HandlebarsEditor from './HandlebarsEditor'

import { Sidekick, AppSettings } from 'types'

const SidekickDetail = ({ appSettings, sidekick }: { appSettings: AppSettings; sidekick?: Sidekick }) => {
    return (
        <AnswersProvider appSettings={appSettings}>
            <Box p={8} sx={{ position: 'relative' }}>
                <Box>
                    <Grid container direction='row' rowSpacing={4} columnSpacing={4}>
                        <Grid item xs={12} md={9}>
                            <Grid container direction='row' rowSpacing={4} columnSpacing={4}>
                                <Grid item sm={12}>
                                    <Fieldset legend='Sidekick Name'>{sidekick?.label}</Fieldset>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Fieldset legend='Tags'>{sidekick?.tags.join(',')}</Fieldset>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Fieldset legend='Placeholder'>{sidekick?.placeholder}</Fieldset>
                                </Grid>

                                <Grid item xs={12}>
                                    <Fieldset legend='System Prompt Template'>
                                        <HandlebarsEditor
                                            key='systemPromptTemplate'
                                            code={sidekick?.systemPromptTemplate ?? ''}
                                            readOnly={true}
                                        />
                                    </Fieldset>
                                </Grid>

                                <Grid item xs={12}>
                                    <Fieldset legend='User Prompt Template'>
                                        <HandlebarsEditor
                                            key='userPromptTemplate'
                                            code={sidekick?.userPromptTemplate ?? ''}
                                            readOnly={true}
                                        />
                                    </Fieldset>
                                </Grid>

                                <Grid item xs={12}>
                                    <Fieldset legend='Context String Render'>
                                        <HandlebarsEditor
                                            key='contextStringRender'
                                            code={sidekick?.contextStringRender ?? ''}
                                            readOnly={true}
                                        />
                                    </Fieldset>
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Grid container direction='row' rowSpacing={4} columnSpacing={4}>
                                <Grid item xs={12}>
                                    <Fieldset legend='Shared With'>{sidekick?.sharedWith}</Fieldset>
                                </Grid>
                                <Grid item xs={12}>
                                    <Fieldset legend='AI Model'>{sidekick?.aiModel}</Fieldset>
                                </Grid>
                                <Grid item xs={12}>
                                    <Fieldset legend='Temperature'>{sidekick?.temperature}</Fieldset>
                                </Grid>

                                <Grid item xs={12}>
                                    <Fieldset legend='Frequency'>{sidekick?.frequency}</Fieldset>
                                </Grid>
                                <Grid item xs={12}>
                                    <Fieldset legend='Presence'>{sidekick?.presence}</Fieldset>
                                </Grid>
                                <Grid item xs={12}>
                                    <Fieldset legend='Max Completion Tokens'>{sidekick?.maxCompletionTokens}</Fieldset>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </AnswersProvider>
    )
}

export default SidekickDetail
