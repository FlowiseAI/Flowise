import { z } from 'zod/v3'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { detect, intelligence, watermarkApply, watermarkDetect, type ResembleOptions } from './client'

/** Build the set of Resemble Detect + Intelligence tools for an agent. */
export function buildResembleTools(opts: ResembleOptions): DynamicStructuredTool[] {
    const out = (data: any) => JSON.stringify(data)

    const detectTool = new DynamicStructuredTool({
        name: 'resemble_detect',
        description:
            'Detect whether media (audio, image, or video) at a public HTTPS URL is a deepfake / AI-generated. Returns a label and confidence score.',
        schema: z.object({
            url: z.string().describe('Public HTTPS URL of the media to analyze.'),
            run_intelligence: z.boolean().optional().describe('Also run media intelligence.'),
            audio_source_tracing: z.boolean().optional().describe('If audio is fake, trace the source platform.'),
            visualize: z.boolean().optional().describe('Generate heatmap artifacts.'),
            use_reverse_search: z.boolean().optional().describe('Image-only reverse image search.'),
            use_ood_detector: z.boolean().optional().describe('Enable out-of-distribution detection.'),
            zero_retention_mode: z.boolean().optional().describe('Auto-delete media after analysis.'),
            model_types: z.enum(['auto', 'image', 'talking_head']).optional(),
            max_wait_seconds: z.number().optional()
        }),
        func: async (args) => out(await detect(opts, args))
    })

    const intelligenceTool = new DynamicStructuredTool({
        name: 'resemble_intelligence',
        description:
            'Analyze media for structured intelligence: transcription, translation, speaker info, emotion, scene description, misinformation.',
        schema: z.object({
            url: z.string().describe('Public HTTPS URL of the media to analyze.'),
            structured_json: z.boolean().optional(),
            media_type: z.enum(['auto', 'audio', 'video', 'image']).optional(),
            max_wait_seconds: z.number().optional()
        }),
        func: async (args) => out(await intelligence(opts, args))
    })

    const watermarkDetectTool = new DynamicStructuredTool({
        name: 'resemble_watermark_detect',
        description: 'Check whether media at a public HTTPS URL contains a Resemble watermark.',
        schema: z.object({ url: z.string().describe('Public HTTPS URL of the media to check.') }),
        func: async (args) => out(await watermarkDetect(opts, args))
    })

    const watermarkApplyTool = new DynamicStructuredTool({
        name: 'resemble_watermark_apply',
        description: 'Apply an invisible Resemble provenance watermark and return the watermarked media URL (audio-first).',
        schema: z.object({
            url: z.string().describe('Public HTTPS URL of the media to watermark.'),
            strength: z.number().min(0).max(1).optional(),
            custom_message: z.string().optional(),
            max_wait_seconds: z.number().optional()
        }),
        func: async (args) => out(await watermarkApply(opts, args))
    })

    return [detectTool, intelligenceTool, watermarkDetectTool, watermarkApplyTool]
}
