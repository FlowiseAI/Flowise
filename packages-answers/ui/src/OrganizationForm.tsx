'use client'
import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

import { useForm, useFieldArray } from 'react-hook-form'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Grid from '@mui/material/Grid'

import Delete from '@mui/icons-material/Delete'

import { Organization, AppSettings, ContextField } from 'types'

interface ContextFieldInput extends Partial<ContextField> {}
interface OrgInput
    extends Omit<
        Organization,
        | 'createdAt'
        | 'updatedAt'
        | 'users'
        | 'usersSelected'
        | 'documentPermissions'
        | 'appSettings'
        | 'image'
        | 'isFavoriteByDefault'
        | 'contextFields'
    > {
    contextFields: ContextFieldInput[]
    [key: string]: any
}

const OrganizationForm = ({ appSettings, organization }: { appSettings: AppSettings; organization?: Organization }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        handleSubmit,
        control,
        setValue,
        register,
        reset,
        formState: { isDirty, touchedFields, errors },
        getValues
    } = useForm<OrgInput>({
        defaultValues: {
            ...organization,
            contextFields: organization?.contextFields || []
        }
    })

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'contextFields'
    })

    if (!organization) return null

    const handleAddNewField = () => {
        append({
            fieldId: '',
            fieldType: '',
            fieldTextValue: '',
            helpText: ''
        })
    }

    const onSubmit = async (data: OrgInput) => {
        setLoading(true)
        // Could check dirtyFields here, but the contextField array doesn't trigger it unless a new field is added
        const changedFields = Object.keys({ ...touchedFields })

        // Always include ID
        const formData: Partial<OrgInput> = {
            id: data.id
        }

        for (const field of changedFields) {
            formData[field as keyof OrgInput] = data[field]
        }

        try {
            await axios.patch(`/api/organizations`, { ...formData })
            setTimeout(() => {
                router.refresh()
            }, 500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
            reset()
        }
    }

    const handleDeleteField = (index: number) => {
        remove(index)
    }
    const handleCancel = () => {
        reset()
    }
    return (
        <Box p={8}>
            <Typography variant='h2' component='h1'>
                Edit Organization
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Box component='form' onSubmit={handleSubmit(onSubmit)}>
                <Grid container direction='row' rowSpacing={4} columnSpacing={4}>
                    <Grid item sm={12}>
                        <TextField
                            id={`name`}
                            {...register('name', { required: true })}
                            rows={2}
                            label='Organization Name'
                            error={Boolean(errors.name)}
                            size='small'
                            sx={{ width: '100%' }}
                        />
                    </Grid>
                    <Grid item sm={12} sx={{ textAlign: 'right' }}>
                        <Button variant='outlined' onClick={handleAddNewField}>
                            Add New Field
                        </Button>
                    </Grid>
                    <Grid item sm={12}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Help Text</TableCell>
                                        <TableCell>Field Text Value</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={`${index}`}>
                                            <TableCell sx={{ width: '20%' }}>
                                                <TextField
                                                    id={`contextFields.${index}.fieldId`}
                                                    {...register(`contextFields.${index}.fieldId`, {
                                                        required: true
                                                    })}
                                                    required
                                                    placeholder='Enter a Field ID that will be used to reference this field in your Sidekicks.'
                                                    multiline
                                                    rows={3}
                                                    fullWidth
                                                    size='small'
                                                    error={Boolean(errors.contextFields?.[index]?.fieldId)}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ width: '30%' }}>
                                                <TextField
                                                    id={`contextFields.${index}.helpText`}
                                                    {...register(`contextFields.${index}.helpText`, {
                                                        required: true
                                                    })}
                                                    placeholder='Enter help text that will allow users to understand how this field could be used.'
                                                    multiline
                                                    rows={3}
                                                    fullWidth
                                                    size='small'
                                                    error={Boolean(errors.contextFields?.[index]?.helpText)}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ width: '40%' }}>
                                                <TextField
                                                    id={`contextFields.${index}.fieldTextValue`}
                                                    {...register(`contextFields.${index}.fieldTextValue`, {
                                                        required: true
                                                    })}
                                                    required
                                                    placeholder='Enter the value that will be returned when the Field ID is referenced in a Sidekick.'
                                                    multiline
                                                    rows={3}
                                                    fullWidth
                                                    size='small'
                                                    error={Boolean(errors.contextFields?.[index]?.fieldTextValue)}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ width: '10%' }}>
                                                <IconButton onClick={() => handleDeleteField(index)}>
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                    <Grid item sm={12} sx={{ textAlign: 'right' }}>
                        <Button variant='outlined' onClick={handleAddNewField}>
                            Add New Field
                        </Button>
                    </Grid>
                </Grid>
                {/* Need to check both because the context fields don't trigger dirtyFields unless a new one is added */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant='contained' type='submit'>
                        Save Organization
                    </Button>
                    <Button disabled={!isDirty} color='error' variant='outlined' onClick={handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

export default OrganizationForm
