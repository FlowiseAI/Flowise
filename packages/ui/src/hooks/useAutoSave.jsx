import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SET_CHATFLOW } from '@/store/actions'
import { isEqual } from 'lodash'

const useAutoSave = ({ onAutoSave, interval = 60000, debounce = 1000 }) => {
    const dispatch = useDispatch()
    const canvas = useSelector((state) => state.canvas.present)
    const [isSaving, setIsSaving] = useState(false)
    const timeoutRef = useRef(null)
    const previousDataRef = useRef(null)
    const onAutoSaveRef = useRef(onAutoSave)

    useEffect(() => {
        onAutoSaveRef.current = onAutoSave
    }, [onAutoSave])

    // debounced save function - only for autosaving to backend
    const debouncedSave = useCallback(() => {
        setIsSaving(true)

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            if (canvas.chatflow && canvas.chatflow.flowData) {
                const currentData = {
                    chatflowId: canvas.chatflow.id,
                    chatflowName: canvas.chatflow.name,
                    flowData: canvas.chatflow.flowData
                }

                // Use lodash's isEqual for deep comparison with previous save
                const hasChanged = !previousDataRef.current || !isEqual(currentData, previousDataRef.current)

                if (hasChanged) {
                    onAutoSaveRef.current(currentData)
                    previousDataRef.current = currentData
                }
            }
            setIsSaving(false)
        }, debounce)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounce, canvas.chatflow?.id, canvas.chatflow?.name, canvas.chatflow?.flowData])

    // watch for changes to trigger debounced save
    useEffect(() => {
        if (canvas.chatflow?.flowData || canvas.chatflow?.name) {
            debouncedSave()
        }
    }, [canvas.chatflow?.flowData, canvas.chatflow?.name, debouncedSave])

    // periodic saves
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (canvas.chatflow && !isEqual(canvas.chatflow, previousDataRef.current)) {
                onAutoSaveRef.current({
                    chatflowId: canvas.chatflow.id,
                    chatflowName: canvas.chatflow.name,
                    flowData: canvas.chatflow.flowData
                })
                previousDataRef.current = canvas.chatflow
            }
        }, interval)

        return () => {
            clearInterval(intervalId)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval])

    // force an immediate save
    const forceSave = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        if (canvas.chatflow && !isEqual(canvas.chatflow, previousDataRef.current)) {
            onAutoSaveRef.current({
                chatflowId: canvas.chatflow.id,
                chatflowName: canvas.chatflow.name,
                flowData: canvas.chatflow.flowData
            })
            previousDataRef.current = canvas.chatflow
        }
    }, [canvas.chatflow])

    const setChatflow = useCallback(
        (updates) => {
            if (canvas.chatflow) {
                const newChatflow = {
                    ...canvas.chatflow,
                    ...updates
                }

                const hasChanges = Object.keys(updates).some((key) => !isEqual(updates[key], canvas.chatflow[key]))

                if (hasChanges) {
                    dispatch({
                        type: SET_CHATFLOW,
                        chatflow: newChatflow
                    })
                }
            }
        },
        [dispatch, canvas.chatflow]
    )

    return [canvas.chatflow, setChatflow, isSaving, forceSave]
}

export default useAutoSave
